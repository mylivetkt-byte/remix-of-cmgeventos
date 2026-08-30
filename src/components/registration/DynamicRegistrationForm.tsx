import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "./FormField";
import { CatalogSelect } from "./CatalogSelect";
import { DateOfBirthPicker } from "./DateOfBirthPicker";
import { useCatalog, useCdpWithRed } from "@/hooks/useCatalogs";
import { useEventFields } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendInstantWhatsAppTicket } from "@/lib/whatsapp-bot";
import { Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Props {
  eventId: string;
  onSuccess: (data: { nombres: string; pdfUrl: string | null; registrationId: string }) => void;
}

function calcAge(day: string, month: string, year: string): number | null {
  if (!day || !month || !year) return null;
  const bd = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age >= 0 ? age : null;
}

export function DynamicRegistrationForm({ eventId, onSuccess }: Props) {
  const { data: fieldConfigs, isLoading: loadingFields } = useEventFields(eventId);
  const [values, setValues] = useState<Record<string, string>>({
    ciudad: "Bucaramanga",
    pais: "Colombia",
    participo_previo: "NO",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const tipoDoc = useCatalog("catalog_tipo_documento");
  const estadoCivil = useCatalog("catalog_estado_civil");
  const sexo = useCatalog("catalog_sexo");
  const cdp = useCdpWithRed();
  const red = useCatalog("catalog_red");

  const age = calcAge(birthDay, birthMonth, birthYear);

  const handleChange = (fieldKey: string, val: string) => {
    setValues((prev) => {
      const next = { ...prev, [fieldKey]: val };
      if (fieldKey === "cdp_id" && cdp.data) {
        const selectedCdp = cdp.data.find((c) => c.id === val);
        if (selectedCdp?.red_id) {
          next.red_id = selectedCdp.red_id;
        }
      }
      return next;
    });

    if (errors[fieldKey]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldKey];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fieldConfigs || fieldConfigs.length === 0) {
      // Default basic validation if no fields configured yet
      if (!values["nombres"]?.trim()) newErrors["nombres"] = "Requerido";
      if (!values["apellidos"]?.trim()) newErrors["apellidos"] = "Requerido";
      if (!values["numero_documento"]?.trim()) newErrors["numero_documento"] = "Requerido";
    } else {
      for (const config of fieldConfigs) {
        if (config.field_key === "fecha_nacimiento") {
          if (config.required && (!birthDay || !birthMonth || !birthYear)) {
            newErrors["fecha_nacimiento"] = "Fecha requerida";
          }
        } else {
          const val = (values[config.field_key] || "").trim();
          if (config.required && !val) {
            newErrors[config.field_key] = `${config.label} es requerido`;
          } else if (config.field_type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            newErrors[config.field_key] = "Correo electrónico inválido";
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Por favor completa los campos requeridos (*)");
      return;
    }

    setSubmitting(true);
    try {
      let fechaNac = values["fecha_nacimiento"] || "2000-01-01";
      if (birthYear && birthMonth && birthDay) {
        fechaNac = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
      }

      const calculatedAge = age !== null ? age : 18;

      const payload: any = {
        event_id: eventId,
        nombres: values["nombres"] || values["nombre"] || "Asistente",
        apellidos: values["apellidos"] || values["primer_apellido"] || values["apellido"] || "",
        numero_documento: values["numero_documento"] || values["documento"] || `REG-${Date.now()}`,
        correo: (values["correo"] || values["email"] || "").toLowerCase(),
        telefono: values["telefono"] || values["celular"] || "",
        direccion: values["direccion"] || "",
        barrio: values["barrio"] || "",
        fecha_nacimiento: fechaNac,
        edad: calculatedAge,
        tipo_documento_id: values["tipo_documento_id"] || (tipoDoc.data?.[0]?.id ?? null),
        estado_civil_id: values["estado_civil_id"] || (estadoCivil.data?.[0]?.id ?? null),
        sexo_id: values["sexo_id"] || (sexo.data?.[0]?.id ?? null),
        cdp_id: values["cdp_id"] || (cdp.data?.[0]?.id ?? null),
        red_id: values["red_id"] || (red.data?.[0]?.id ?? null),
        nombre_invitador: values["nombre_invitador"] || null,
        comprobante_pago_url: values["comprobante_pago_url"] || null,
        estado_pago: values["comprobante_pago_url"] ? "pendiente_verificacion" : "registrado",
      };

      const { data, error } = await supabase.from("registrations").insert(payload).select().single();

      if (error) {
        if (error.code === "23505" || error.message?.includes("duplicate key") || error.message?.includes("unique constraint")) {
          toast.error("⚠️ Ya te encuentras registrado en este evento con este número de documento.");
        } else {
          toast.error("Error al registrar: " + error.message);
        }
        return;
      }

      toast.success("¡Registro exitoso!");

      supabase.functions.invoke("generate-invitation", {
        body: { registrationId: data.id },
      }).catch(() => {});

      sendInstantWhatsAppTicket({
        phone: payload.telefono,
        name: `${payload.nombres} ${payload.apellidos}`.trim(),
        registrationId: data.id,
        eventId,
      }).catch(() => {});

      onSuccess({
        nombres: `${payload.nombres} ${payload.apellidos}`.trim(),
        pdfUrl: null,
        registrationId: data.id,
      });
    } catch (err: any) {
      toast.error("Error inesperado: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingFields) {
    return (
      <div className="py-8 text-center text-emerald-800 font-medium">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-700" />
        Cargando campos del formulario...
      </div>
    );
  }

  return (
    <div className="space-y-4 text-emerald-950 font-sans">
      {fieldConfigs && fieldConfigs.length > 0 ? (
        fieldConfigs.map((config) => {
          if (config.field_key === "fecha_nacimiento") {
            return (
              <DateOfBirthPicker
                key={config.id}
                day={birthDay}
                month={birthMonth}
                year={birthYear}
                age={age}
                onDayChange={setBirthDay}
                onMonthChange={setBirthMonth}
                onYearChange={setBirthYear}
                error={errors["fecha_nacimiento"]}
              />
            );
          }

          if (config.field_key === "tipo_documento_id") {
            return (
              <CatalogSelect
                key={config.id}
                label={config.label}
                required={config.required}
                value={values[config.field_key] || ""}
                onChange={(val) => handleChange(config.field_key, val)}
                items={tipoDoc.data}
                isLoading={tipoDoc.isLoading}
                error={errors[config.field_key]}
              />
            );
          }

          if (config.field_key === "estado_civil_id") {
            return (
              <CatalogSelect
                key={config.id}
                label={config.label}
                required={config.required}
                value={values[config.field_key] || ""}
                onChange={(val) => handleChange(config.field_key, val)}
                items={estadoCivil.data}
                isLoading={estadoCivil.isLoading}
                error={errors[config.field_key]}
              />
            );
          }

          if (config.field_key === "sexo_id") {
            return (
              <CatalogSelect
                key={config.id}
                label={config.label}
                required={config.required}
                value={values[config.field_key] || ""}
                onChange={(val) => handleChange(config.field_key, val)}
                items={sexo.data}
                isLoading={sexo.isLoading}
                error={errors[config.field_key]}
              />
            );
          }

          if (config.field_key === "cdp_id") {
            return (
              <CatalogSelect
                key={config.id}
                label={config.label}
                required={config.required}
                value={values[config.field_key] || ""}
                onChange={(val) => handleChange(config.field_key, val)}
                items={cdp.data?.map((c) => ({ id: c.id, nombre: c.nombre }))}
                isLoading={cdp.isLoading}
                error={errors[config.field_key]}
              />
            );
          }

          if (config.field_key === "red_id") {
            return (
              <CatalogSelect
                key={config.id}
                label={config.label}
                required={config.required}
                value={values[config.field_key] || ""}
                onChange={(val) => handleChange(config.field_key, val)}
                items={red.data}
                isLoading={red.isLoading}
                error={errors[config.field_key]}
              />
            );
          }

          if (config.field_key === "bautizo") {
            return (
              <div key={config.id} className="space-y-2 bg-white/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
                <Label className="text-sm font-semibold text-emerald-950">{config.label}{config.required ? " *" : ""}</Label>
                <div className="space-y-2 text-sm text-emerald-900 pt-1">
                  {[
                    { id: "b1", label: "Ya es bautizado Por la fe Cristiana" },
                    { id: "b2", label: "Se va a Bautizar en el evento" },
                    { id: "b3", label: "No se va a Bautizar" },
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-emerald-50">
                      <input
                        type="radio"
                        name="bautizo"
                        value={item.label}
                        checked={values["bautizo"] === item.label}
                        onChange={(e) => handleChange("bautizo", e.target.value)}
                        className="w-4 h-4 text-emerald-700 accent-emerald-700"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                {errors["bautizo"] && <p className="text-xs text-red-600 font-medium">{errors["bautizo"]}</p>}
              </div>
            );
          }

          if (config.field_key === "participo_previo") {
            return (
              <div key={config.id} className="space-y-2 bg-white/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
                <Label className="text-sm font-semibold text-emerald-950">{config.label}{config.required ? " *" : ""}</Label>
                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input
                      type="radio"
                      name="participo_previo"
                      value="SI"
                      checked={values["participo_previo"] === "SI"}
                      onChange={(e) => handleChange("participo_previo", e.target.value)}
                      className="w-4 h-4 accent-emerald-700"
                    />
                    <span>Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input
                      type="radio"
                      name="participo_previo"
                      value="NO"
                      checked={values["participo_previo"] === "NO"}
                      onChange={(e) => handleChange("participo_previo", e.target.value)}
                      className="w-4 h-4 accent-emerald-700"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            );
          }

          return (
            <FormField
              key={config.id}
              label={config.label}
              required={config.required}
              type={config.field_type === "phone" ? "tel" : config.field_type === "email" ? "email" : config.field_type === "date" ? "date" : "text"}
              placeholder={config.placeholder || "Tu respuesta"}
              value={values[config.field_key] || ""}
              onChange={(val) => handleChange(config.field_key, val)}
              error={errors[config.field_key]}
            />
          );
        })
      ) : (
        <>
          <FormField label="Nombre(s) *" required value={values["nombres"] || ""} onChange={(v) => handleChange("nombres", v)} error={errors["nombres"]} />
          <FormField label="Apellidos *" required value={values["apellidos"] || ""} onChange={(v) => handleChange("apellidos", v)} error={errors["apellidos"]} />
          <FormField label="Número de Documento *" required value={values["numero_documento"] || ""} onChange={(v) => handleChange("numero_documento", v)} error={errors["numero_documento"]} />
          <FormField label="Teléfono / Celular" type="tel" value={values["telefono"] || ""} onChange={(v) => handleChange("telefono", v)} />
          <FormField label="Correo Electrónico" type="email" value={values["correo"] || ""} onChange={(v) => handleChange("correo", v)} />
        </>
      )}

      {/* Aviso Protección de Datos */}
      <div className="bg-white/80 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1.5 shadow-sm mt-4">
        <div className="flex items-center gap-2 font-semibold text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          Protección de Datos
        </div>
        <p className="leading-relaxed text-emerald-800/90">
          Este formulario contiene información de acuerdo a la Ley Estatutaria 1581 de 2012 de Protección de Datos. Al enviar aceptas el tratamiento de tus datos para el evento.
        </p>
      </div>

      <Button size="xl" className="w-full mt-6 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md" onClick={handleSubmit} disabled={submitting}>
        {submitting ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
        ) : (
          <><UserPlus className="mr-2 h-5 w-5" /> ENVIAR REGISTRO</>
        )}
      </Button>
    </div>
  );
}
