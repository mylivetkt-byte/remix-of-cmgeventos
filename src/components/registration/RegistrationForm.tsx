import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "./FormField";
import { CatalogSelect } from "./CatalogSelect";
import { DateOfBirthPicker } from "./DateOfBirthPicker";
import { useCatalog, useEventConfig, useCdpWithRed } from "@/hooks/useCatalogs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

interface FormData {
  nombres: string;
  apellidos: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  tipo_documento_id: string;
  numero_documento: string;
  telefono: string;
  direccion: string;
  barrio: string;
  correo: string;
  estado_civil_id: string;
  sexo_id: string;
  cdp_id: string;
  red_id: string;
  nombre_invitador: string;
}

const initial: FormData = {
  nombres: "", apellidos: "", birthDay: "", birthMonth: "", birthYear: "",
  tipo_documento_id: "", numero_documento: "", telefono: "", direccion: "",
  barrio: "", correo: "", estado_civil_id: "", sexo_id: "",
  cdp_id: "", red_id: "", nombre_invitador: "",
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
  onSuccess: (data: { nombres: string; pdfUrl: string | null; registrationId: string }) => void;
}

export function RegistrationForm({ onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const tipoDoc = useCatalog("catalog_tipo_documento");
  const estadoCivil = useCatalog("catalog_estado_civil");
  const sexo = useCatalog("catalog_sexo");
  const cdp = useCatalog("catalog_cdp");
  const red = useCatalog("catalog_red");
  const eventConfig = useEventConfig();

  const age = calcAge(form.birthDay, form.birthMonth, form.birthYear);

  const set = (field: keyof FormData) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.nombres.trim()) e.nombres = "Requerido";
    if (!form.apellidos.trim()) e.apellidos = "Requerido";
    if (!form.birthDay || !form.birthMonth || !form.birthYear) e.birth = "Fecha requerida";
    else if (age === null || age < 0) e.birth = "Fecha inválida";
    if (!form.tipo_documento_id) e.tipo_documento_id = "Requerido";
    if (!form.numero_documento.trim()) e.numero_documento = "Requerido";
    if (!form.telefono.trim()) e.telefono = "Requerido";
    if (!form.direccion.trim()) e.direccion = "Requerido";
    if (!form.barrio.trim()) e.barrio = "Requerido";
    if (!form.correo.trim()) e.correo = "Requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = "Correo inválido";
    if (!form.estado_civil_id) e.estado_civil_id = "Requerido";
    if (!form.sexo_id) e.sexo_id = "Requerido";
    if (!form.cdp_id) e.cdp_id = "Requerido";
    if (!form.red_id) e.red_id = "Requerido";
    if (eventConfig.data?.invitado_obligatorio && !form.nombre_invitador.trim()) {
      e.nombre_invitador = "Requerido";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Por favor corrige los errores del formulario");
      return;
    }
    setSubmitting(true);
    try {
      const fechaNacimiento = `${form.birthYear}-${form.birthMonth.padStart(2, "0")}-${form.birthDay.padStart(2, "0")}`;
      
      const { data, error } = await supabase.from("registrations").insert({
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        fecha_nacimiento: fechaNacimiento,
        edad: age!,
        tipo_documento_id: form.tipo_documento_id,
        numero_documento: form.numero_documento.trim(),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        barrio: form.barrio.trim(),
        correo: form.correo.trim().toLowerCase(),
        estado_civil_id: form.estado_civil_id,
        sexo_id: form.sexo_id,
        cdp_id: form.cdp_id,
        red_id: form.red_id,
        nombre_invitador: form.nombre_invitador.trim() || null,
      }).select().single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya existe un registro con este tipo y número de documento");
          setErrors({ numero_documento: "Documento ya registrado" });
        } else {
          toast.error("Error al registrar: " + error.message);
        }
        return;
      }

      toast.success("¡Registro exitoso! Generando invitación...");

      // Flujo correcto: primero genera el PDF, luego send-brevo-email se llama desde dentro
      const registrationId = data.id;
      supabase.functions
        .invoke("generate-invitation", {
          body: { registrationId },
        })
        .then(({ error: invErr }) => {
          if (invErr) {
            console.error("Error generating invitation:", invErr);
          }
        });

      // WhatsApp se envía automáticamente desde generate-invitation

      onSuccess({
        nombres: `${form.nombres} ${form.apellidos}`,
        pdfUrl: null, // Will be available via download link
        registrationId: data.id,
      });
    } catch (err: any) {
      toast.error("Error inesperado: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-5 animate-fade-in">
      <div className="text-center mb-6">
        {eventConfig.data?.logo_url && (
          <div className="mb-4 flex justify-center">
            <img src={eventConfig.data.logo_url} alt={eventConfig.data.nombre_evento || "Evento"} className="max-h-28 object-contain rounded-lg" />
          </div>
        )}
        <h1 className="text-2xl font-bold font-heading text-foreground">
          {eventConfig.data?.nombre_evento || "Registro de Evento"}
        </h1>
        {eventConfig.data?.descripcion && (
          <p className="text-sm text-muted-foreground mt-1">{eventConfig.data.descripcion}</p>
        )}
      </div>

      <FormField label="Nombre(s)" required value={form.nombres} onChange={set("nombres")} error={errors.nombres} placeholder="Ingresa tu(s) nombre(s)" />
      <FormField label="Apellidos" required value={form.apellidos} onChange={set("apellidos")} error={errors.apellidos} placeholder="Ingresa tus apellidos" />

      <DateOfBirthPicker
        day={form.birthDay} month={form.birthMonth} year={form.birthYear} age={age}
        onDayChange={set("birthDay")} onMonthChange={set("birthMonth")} onYearChange={set("birthYear")}
        error={errors.birth}
      />

      <CatalogSelect label="Tipo de Documento" required value={form.tipo_documento_id} onChange={set("tipo_documento_id")} items={tipoDoc.data} isLoading={tipoDoc.isLoading} error={errors.tipo_documento_id} />
      <FormField label="Número de Documento" required value={form.numero_documento} onChange={set("numero_documento")} error={errors.numero_documento} placeholder="Ej: 1234567890" />
      <FormField label="Teléfono" required type="tel" value={form.telefono} onChange={set("telefono")} error={errors.telefono} placeholder="Ej: 3001234567" />
      <FormField label="Dirección" required value={form.direccion} onChange={set("direccion")} error={errors.direccion} placeholder="Ingresa tu dirección" />
      <FormField label="Barrio" required value={form.barrio} onChange={set("barrio")} error={errors.barrio} placeholder="Ingresa tu barrio" />
      <FormField label="Correo Electrónico" required type="email" value={form.correo} onChange={set("correo")} error={errors.correo} placeholder="tu@correo.com" />
      <CatalogSelect label="Estado Civil" required value={form.estado_civil_id} onChange={set("estado_civil_id")} items={estadoCivil.data} isLoading={estadoCivil.isLoading} error={errors.estado_civil_id} />
      <CatalogSelect label="Sexo" required value={form.sexo_id} onChange={set("sexo_id")} items={sexo.data} isLoading={sexo.isLoading} error={errors.sexo_id} />
      <CatalogSelect label="CDP" required value={form.cdp_id} onChange={set("cdp_id")} items={cdp.data} isLoading={cdp.isLoading} error={errors.cdp_id} />
      <CatalogSelect label="RED" required value={form.red_id} onChange={set("red_id")} items={red.data} isLoading={red.isLoading} error={errors.red_id} />
      <FormField
        label={`Nombre de quien te invitó${eventConfig.data?.invitado_obligatorio ? " *" : ""}`}
        value={form.nombre_invitador} onChange={set("nombre_invitador")}
        error={errors.nombre_invitador} placeholder="Opcional"
      />

      <Button size="xl" className="w-full mt-6" onClick={handleSubmit} disabled={submitting}>
        {submitting ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Registrando...</>
        ) : (
          <><UserPlus className="mr-2 h-5 w-5" /> ENVIAR</>
        )}
      </Button>
    </div>
  );
}
