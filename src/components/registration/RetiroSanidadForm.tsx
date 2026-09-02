import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "./FormField";
import { CatalogSelect } from "./CatalogSelect";
import { DateOfBirthPicker } from "./DateOfBirthPicker";
import { useCatalog, useCdpWithRed } from "@/hooks/useCatalogs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendInstantWhatsAppTicket } from "@/lib/whatsapp-bot";
import { Loader2, HeartHandshake, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";

interface FormData {
  correo: string;
  nombres: string;
  primer_apellido: string;
  segundo_apellido: string;
  tipo_documento_id: string;
  numero_documento: string;
  sexo_id: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  celular: string;
  direccion: string;
  barrio: string;
  ciudad: string;
  pais: string;
  bautizo: string;
  estado_civil_id: string;
  participo_previo: string; // "SI" | "NO"
  red_id: string;
  cdp_id: string;
  iglesia_cobertura: string;
}

const initial: FormData = {
  correo: "",
  nombres: "",
  primer_apellido: "",
  segundo_apellido: "",
  tipo_documento_id: "",
  numero_documento: "",
  sexo_id: "",
  birthDay: "",
  birthMonth: "",
  birthYear: "",
  celular: "",
  direccion: "",
  barrio: "",
  ciudad: "Bucaramanga",
  pais: "Colombia",
  bautizo: "",
  estado_civil_id: "",
  participo_previo: "NO",
  red_id: "",
  cdp_id: "",
  iglesia_cobertura: "",
};

function calcAge(day: string, month: string, year: string): number | null {
  if (!day || !month || !year) return null;
  const bd = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age >= 0 ? age : null;
}

interface Props {
  eventId?: string;
  onSuccess: (data: { nombres: string; pdfUrl: string | null; registrationId: string }) => void;
}

export function RetiroSanidadForm({ eventId, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const tipoDoc = useCatalog("catalog_tipo_documento");
  const estadoCivil = useCatalog("catalog_estado_civil");
  const sexo = useCatalog("catalog_sexo");
  const cdp = useCdpWithRed();
  const red = useCatalog("catalog_red");

  const age = calcAge(form.birthDay, form.birthMonth, form.birthYear);

  const set = (field: keyof FormData) => (value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "cdp_id" && cdp.data) {
        const selectedCdp = cdp.data.find((c) => c.id === value);
        if (selectedCdp?.red_id) {
          next.red_id = selectedCdp.red_id;
        }
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === "cdp_id") delete next.red_id;
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.correo.trim()) e.correo = "Correo requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = "Correo inválido";

    if (!form.nombres.trim()) e.nombres = "Nombres requeridos";
    if (!form.primer_apellido.trim()) e.primer_apellido = "Primer apellido requerido";
    if (!form.tipo_documento_id) e.tipo_documento_id = "Requerido";
    if (!form.numero_documento.trim()) e.numero_documento = "Requerido";
    if (!form.sexo_id) e.sexo_id = "Requerido";

    if (!form.birthDay || !form.birthMonth || !form.birthYear) e.birth = "Fecha requerida";
    else if (age === null || age < 0) e.birth = "Fecha inválida";

    if (!form.celular.trim()) e.celular = "Celular requerido";
    if (!form.direccion.trim()) e.direccion = "Dirección requerida";
    if (!form.barrio.trim()) e.barrio = "Barrio requerido";
    if (!form.ciudad.trim()) e.ciudad = "Ciudad requerida";
    if (!form.pais.trim()) e.pais = "País requerido";

    if (!form.bautizo) e.bautizo = "Selecciona una opción";
    if (!form.estado_civil_id) e.estado_civil_id = "Requerido";
    if (!form.red_id) e.red_id = "Requerido";
    if (!form.cdp_id) e.cdp_id = "Requerido";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Por favor completa los campos requeridos (*)");
      return;
    }

    setSubmitting(true);
    try {
      const fechaNacimiento = `${form.birthYear}-${form.birthMonth.padStart(2, "0")}-${form.birthDay.padStart(2, "0")}`;

      const payload = {
        event_id: eventId || null,
        correo: form.correo.trim().toLowerCase(),
        nombres: form.nombres.trim(),
        primer_apellido: form.primer_apellido.trim(),
        segundo_apellido: form.segundo_apellido.trim() || null,
        tipo_documento_id: form.tipo_documento_id,
        numero_documento: form.numero_documento.trim(),
        sexo_id: form.sexo_id,
        fecha_nacimiento: fechaNacimiento,
        edad: age!,
        celular: form.celular.trim(),
        direccion: form.direccion.trim(),
        barrio: form.barrio.trim(),
        ciudad: form.ciudad.trim(),
        pais: form.pais.trim(),
        bautizo: form.bautizo,
        estado_civil_id: form.estado_civil_id,
        participo_previo: form.participo_previo === "SI",
        red_id: form.red_id,
        cdp_id: form.cdp_id,
        iglesia_cobertura: form.iglesia_cobertura.trim() || null,
      };

      const { data, error } = await supabase
        .from("retiro_sanidad_registrations")
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (error.code === "23505" || error.message?.includes("duplicate key") || error.message?.includes("unique constraint")) {
          toast.error("⚠️ Ya te encuentras inscrito al Retiro con este tipo y número de documento.");
          setErrors({ numero_documento: "Documento ya registrado" });
        } else {
          toast.error("Error al registrar: " + error.message);
        }
        return;
      }

      await supabase.from("registrations").upsert(
        {
          event_id: eventId || null,
          nombres: `${form.nombres.trim()} ${form.primer_apellido.trim()}`,
          apellidos: form.segundo_apellido.trim() || form.primer_apellido.trim(),
          correo: form.correo.trim().toLowerCase(),
          telefono: form.celular.trim(),
          numero_documento: form.numero_documento.trim(),
          tipo_documento_id: form.tipo_documento_id,
          sexo_id: form.sexo_id,
          fecha_nacimiento: fechaNacimiento,
          edad: age!,
          direccion: form.direccion.trim(),
          barrio: form.barrio.trim(),
          estado_civil_id: form.estado_civil_id,
          red_id: form.red_id,
          cdp_id: form.cdp_id,
        },
        { onConflict: "tipo_documento_id,numero_documento" }
      );

      toast.success("¡Inscripción exitosa al Retiro!");

      const registrationId = data.id;
      supabase.functions.invoke("generate-invitation", {
        body: { registrationId },
      }).catch(() => {});

      sendInstantWhatsAppTicket({
        phone: form.celular,
        name: `${form.nombres} ${form.primer_apellido}`.trim(),
        registrationId,
        eventId,
      }).catch(() => {});

      onSuccess({
        nombres: `${form.nombres} ${form.primer_apellido}`,
        pdfUrl: null,
        registrationId: registrationId,
      });
    } catch (err: any) {
      toast.error("Error inesperado: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 text-emerald-950 font-sans">
      <div className="text-center border-b border-emerald-200/80 pb-3 mb-4">
        <h2 className="text-xl font-bold font-heading text-emerald-900">
          Retiro de Sanidad Interior y Liberación
        </h2>
        <p className="text-xs text-emerald-700 font-medium">Formulario de Inscripción</p>
      </div>

      <FormField
        label="Correo electrónico *"
        required
        type="email"
        value={form.correo}
        onChange={set("correo")}
        error={errors.correo}
        placeholder="Tu dirección de correo electrónico"
      />

      <FormField
        label="NOMBRES: *"
        required
        value={form.nombres}
        onChange={set("nombres")}
        error={errors.nombres}
        placeholder="Tu respuesta"
      />

      <FormField
        label="1ER APELLIDO: *"
        required
        value={form.primer_apellido}
        onChange={set("primer_apellido")}
        error={errors.primer_apellido}
        placeholder="Tu respuesta"
      />

      <FormField
        label="2DO APELLIDO:"
        value={form.segundo_apellido}
        onChange={set("segundo_apellido")}
        placeholder="Tu respuesta"
      />

      <CatalogSelect
        label="Tipo de Documento *"
        required
        value={form.tipo_documento_id}
        onChange={set("tipo_documento_id")}
        items={tipoDoc.data}
        isLoading={tipoDoc.isLoading}
        error={errors.tipo_documento_id}
      />

      <FormField
        label="Número de Documento *"
        required
        value={form.numero_documento}
        onChange={set("numero_documento")}
        error={errors.numero_documento}
        placeholder="Tu respuesta"
      />

      <CatalogSelect
        label="Sexo *"
        required
        value={form.sexo_id}
        onChange={set("sexo_id")}
        items={sexo.data}
        isLoading={sexo.isLoading}
        error={errors.sexo_id}
      />

      <DateOfBirthPicker
        day={form.birthDay}
        month={form.birthMonth}
        year={form.birthYear}
        age={age}
        onDayChange={set("birthDay")}
        onMonthChange={set("birthMonth")}
        onYearChange={set("birthYear")}
        error={errors.birth}
      />

      <FormField
        label="Celular *"
        required
        type="tel"
        value={form.celular}
        onChange={set("celular")}
        error={errors.celular}
        placeholder="Tu respuesta"
      />

      <FormField
        label="Dirección *"
        required
        value={form.direccion}
        onChange={set("direccion")}
        error={errors.direccion}
        placeholder="Tu respuesta"
      />

      <FormField
        label="Barrio *"
        required
        value={form.barrio}
        onChange={set("barrio")}
        error={errors.barrio}
        placeholder="Tu respuesta"
      />

      <FormField
        label="Ciudad *"
        required
        value={form.ciudad}
        onChange={set("ciudad")}
        error={errors.ciudad}
        placeholder="Bucaramanga"
      />

      <FormField
        label="País *"
        required
        value={form.pais}
        onChange={set("pais")}
        error={errors.pais}
        placeholder="Colombia"
      />

      {/* Bautizo */}
      <div className="space-y-2 bg-white/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
        <Label className="text-sm font-semibold text-emerald-950">Bautizo: *</Label>
        <div className="space-y-2 text-sm text-emerald-900 pt-1">
          {[
            { id: "ya_bautizado", label: "Ya es bautizado Por la fe Cristiana" },
            { id: "se_bautiza_retiro", label: "Se va a Bautizar en el retiro" },
            { id: "no_bautiza", label: "No se va a Bautizar en el Retiro" },
          ].map((item) => (
            <label key={item.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-emerald-50">
              <input
                type="radio"
                name="bautizo"
                value={item.label}
                checked={form.bautizo === item.label}
                onChange={(e) => set("bautizo")(e.target.value)}
                className="w-4 h-4 text-emerald-700 accent-emerald-700"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        {errors.bautizo && <p className="text-xs text-red-600 font-medium">{errors.bautizo}</p>}
      </div>

      <CatalogSelect
        label="Estado Civil *"
        required
        value={form.estado_civil_id}
        onChange={set("estado_civil_id")}
        items={estadoCivil.data}
        isLoading={estadoCivil.isLoading}
        error={errors.estado_civil_id}
      />

      {/* Ha participado antes */}
      <div className="space-y-2 bg-white/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
        <Label className="text-sm font-semibold text-emerald-950">
          ¿HA PARTICIPADO ANTES DE UN RETIRO DE SANIDAD INTERIOR Y LIBERACIÓN? *
        </Label>
        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="participo_previo"
              value="SI"
              checked={form.participo_previo === "SI"}
              onChange={(e) => set("participo_previo")(e.target.value)}
              className="w-4 h-4 accent-emerald-700"
            />
            <span>Sí</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="participo_previo"
              value="NO"
              checked={form.participo_previo === "NO"}
              onChange={(e) => set("participo_previo")(e.target.value)}
              className="w-4 h-4 accent-emerald-700"
            />
            <span>No</span>
          </label>
        </div>
      </div>

      <CatalogSelect
        label="RED *"
        required
        value={form.red_id}
        onChange={set("red_id")}
        items={red.data}
        isLoading={red.isLoading}
        error={errors.red_id}
      />

      <CatalogSelect
        label="CDP *"
        required
        value={form.cdp_id}
        onChange={set("cdp_id")}
        items={cdp.data?.map((c) => ({ id: c.id, nombre: c.nombre }))}
        isLoading={cdp.isLoading}
        error={errors.cdp_id}
      />

      <FormField
        label="IGLESIA EN COBERTURA: (si asiste por parte de una iglesia en cobertura)"
        value={form.iglesia_cobertura}
        onChange={set("iglesia_cobertura")}
        placeholder="Nombre de la iglesia (opcional)"
      />

      {/* Aviso Protección de Datos */}
      <div className="bg-white/80 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          Protección de Datos
        </div>
        <p className="leading-relaxed text-emerald-800/90">
          Este formulario contiene información privilegiada y confidencial de acuerdo a la Ley Estatutaria 1581 de 2012 de Protección de Datos. El titular presta su consentimiento para que sus datos sean tratados con la finalidad exclusiva del evento.
        </p>
      </div>

      <Button
        size="xl"
        className="w-full mt-6 bg-emerald-800 hover:bg-emerald-900 text-white font-bold tracking-wide shadow-md rounded-xl"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
        ) : (
          <><HeartHandshake className="mr-2 h-5 w-5" /> ENVIAR</>
        )}
      </Button>
    </div>
  );
}
