import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "./FormField";
import { CatalogSelect } from "./CatalogSelect";
import { useCatalog, useCdpWithRed } from "@/hooks/useCatalogs";
import { useEventFields } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

interface Props {
  eventId: string;
  onSuccess: (data: { nombres: string; pdfUrl: string | null; registrationId: string }) => void;
}

export function DynamicRegistrationForm({ eventId, onSuccess }: Props) {
  const { data: fieldConfigs, isLoading: loadingFields } = useEventFields(eventId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const tipoDoc = useCatalog("catalog_tipo_documento");
  const estadoCivil = useCatalog("catalog_estado_civil");
  const sexo = useCatalog("catalog_sexo");
  const cdp = useCdpWithRed();
  const red = useCatalog("catalog_red");

  const handleChange = (fieldKey: string, val: string) => {
    setValues((prev) => ({ ...prev, [fieldKey]: val }));
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldKey];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    if (!fieldConfigs || fieldConfigs.length === 0) return true;
    const newErrors: Record<string, string> = {};

    for (const config of fieldConfigs) {
      const val = (values[config.field_key] || "").trim();
      if (config.required && !val) {
        newErrors[config.field_key] = `${config.label} es requerido`;
      } else if (config.field_type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        newErrors[config.field_key] = "Correo electrónico inválido";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        event_id: eventId,
        nombres: values["nombres"] || values["nombre"] || "Asistente",
        apellidos: values["apellidos"] || values["apellido"] || "",
        numero_documento: values["numero_documento"] || values["documento"] || `REG-${Date.now()}`,
        correo: (values["correo"] || values["email"] || "").toLowerCase(),
        telefono: values["telefono"] || values["celular"] || "",
        direccion: values["direccion"] || "",
        barrio: values["barrio"] || "",
        fecha_nacimiento: values["fecha_nacimiento"] || "2000-01-01",
        edad: 18,
        tipo_documento_id: values["tipo_documento_id"] || (tipoDoc.data?.[0]?.id ?? ""),
        estado_civil_id: values["estado_civil_id"] || (estadoCivil.data?.[0]?.id ?? ""),
        sexo_id: values["sexo_id"] || (sexo.data?.[0]?.id ?? ""),
        cdp_id: values["cdp_id"] || (cdp.data?.[0]?.id ?? ""),
        red_id: values["red_id"] || (red.data?.[0]?.id ?? ""),
        nombre_invitador: values["nombre_invitador"] || null,
      };

      const { data, error } = await supabase.from("registrations").insert(payload).select().single();

      if (error) {
        toast.error("Error al registrar: " + error.message);
        return;
      }

      toast.success("¡Registro exitoso!");

      supabase.functions.invoke("generate-invitation", {
        body: { registrationId: data.id },
      });

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
      <div className="py-8 text-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
        Cargando formulario del evento...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fieldConfigs && fieldConfigs.length > 0 ? (
        fieldConfigs.map((config) => {
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

          return (
            <FormField
              key={config.id}
              label={config.label}
              required={config.required}
              type={config.field_type === "phone" ? "tel" : config.field_type === "email" ? "email" : config.field_type === "date" ? "date" : "text"}
              placeholder={config.placeholder || ""}
              value={values[config.field_key] || ""}
              onChange={(val) => handleChange(config.field_key, val)}
              error={errors[config.field_key]}
            />
          );
        })
      ) : (
        <p className="text-center text-slate-400 text-sm py-4">Este evento utiliza el formulario estándar de registro.</p>
      )}

      <Button size="xl" className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500" onClick={handleSubmit} disabled={submitting}>
        {submitting ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Registrando...</>
        ) : (
          <><UserPlus className="mr-2 h-5 w-5" /> COMPLETAR REGISTRO</>
        )}
      </Button>
    </div>
  );
}
