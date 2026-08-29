import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventItem } from "@/integrations/supabase/event-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Calendar, MapPin, CheckCircle2, XCircle, ExternalLink, Sparkles, Pencil, Trash2, Upload, Image as ImageIcon, Settings2, Mail, MessageSquare, ListChecks, DollarSign, CreditCard } from "lucide-react";

interface CustomField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

const AVAILABLE_SYSTEM_FIELDS = [
  { key: "nombres", label: "Nombre(s)", type: "text", defaultRequired: true },
  { key: "apellidos", label: "Apellidos / 1er Apellido", type: "text", defaultRequired: true },
  { key: "segundo_apellido", label: "2do Apellido", type: "text", defaultRequired: false },
  { key: "tipo_documento_id", label: "Tipo de Documento (Catálogo)", type: "select", defaultRequired: true },
  { key: "numero_documento", label: "Número de Documento", type: "text", defaultRequired: true },
  { key: "sexo_id", label: "Sexo (Catálogo)", type: "radio", defaultRequired: true },
  { key: "fecha_nacimiento", label: "Fecha de Nacimiento", type: "date", defaultRequired: true },
  { key: "telefono", label: "Teléfono / Celular", type: "phone", defaultRequired: true },
  { key: "correo", label: "Correo Electrónico", type: "email", defaultRequired: true },
  { key: "direccion", label: "Dirección", type: "text", defaultRequired: false },
  { key: "barrio", label: "Barrio", type: "text", defaultRequired: false },
  { key: "ciudad", label: "Ciudad", type: "text", defaultRequired: false },
  { key: "pais", label: "País", type: "text", defaultRequired: false },
  { key: "bautizo", label: "Estado de Bautizo (Opciones)", type: "radio", defaultRequired: false },
  { key: "estado_civil_id", label: "Estado Civil (Catálogo)", type: "select", defaultRequired: false },
  { key: "participo_previo", label: "Participación Previa (Sí/No)", type: "radio", defaultRequired: false },
  { key: "red_id", label: "RED (Catálogo)", type: "select", defaultRequired: false },
  { key: "cdp_id", label: "CDP (Catálogo)", type: "select", defaultRequired: false },
  { key: "iglesia_cobertura", label: "Iglesia en Cobertura", type: "text", defaultRequired: false },
  { key: "nombre_invitador", label: "Nombre de quien te invitó", type: "text", defaultRequired: false },
];

export const EventManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "campos" | "pago" | "sistema">("general");

  const [formData, setFormData] = useState({
    nombre: "",
    slug: "",
    descripcion: "",
    fecha_evento: "",
    lugar_evento: "",
    logo_url: "",
    banner_url: "",
    color_primario: "#083E30",
    color_secundario: "#CFAA37",
    activo: true,
    requiere_checkin: true,
    invitado_obligatorio: false,
    asunto_correo: "Tu invitación al evento",
    mensaje_correo: "Te invitamos a nuestro evento especial.",
    mensaje_whatsapp: "Hola, aquí está mi invitación al evento. Puedes descargarla desde este enlace:",
    correo_remitente: "cmgeventos0@gmail.com",
    es_de_pago: false,
    precio: 0,
    moneda: "COP",
    instrucciones_pago: "",
    requiere_comprobante: false,
  });

  const [selectedFields, setSelectedFields] = useState<string[]>([
    "nombres", "apellidos", "tipo_documento_id", "numero_documento", "telefono", "correo", "fecha_nacimiento", "red_id", "cdp_id"
  ]);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomType, setNewCustomType] = useState("text");
  const [newCustomReq, setNewCustomReq] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EventItem[];
    },
  });

  const resetForm = () => {
    setEditingEventId(null);
    setLogoPreview(null);
    setBannerPreview(null);
    setActiveTab("general");
    setSelectedFields([
      "nombres", "apellidos", "tipo_documento_id", "numero_documento", "telefono", "correo", "fecha_nacimiento", "red_id", "cdp_id"
    ]);
    setCustomFields([]);
    setFormData({
      nombre: "",
      slug: "",
      descripcion: "",
      fecha_evento: "",
      lugar_evento: "",
      logo_url: "",
      banner_url: "",
      color_primario: "#083E30",
      color_secundario: "#CFAA37",
      activo: true,
      requiere_checkin: true,
      invitado_obligatorio: false,
      asunto_correo: "Tu invitación al evento",
      mensaje_correo: "Te invitamos a nuestro evento especial.",
      mensaje_whatsapp: "Hola, aquí está mi invitación al evento. Puedes descargarla desde este enlace:",
      correo_remitente: "cmgeventos0@gmail.com",
      es_de_pago: false,
      precio: 0,
      moneda: "COP",
      instrucciones_pago: "",
      requiere_comprobante: false,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const autoSlug = generateSlug(val);
    setFormData((prev) => ({
      ...prev,
      nombre: val,
      slug: autoSlug,
    }));
  };

  const handleEditClick = async (evt: EventItem) => {
    setEditingEventId(evt.id);
    setLogoPreview(evt.logo_url || null);
    setBannerPreview(evt.banner_url || null);

    let dateVal = "";
    if (evt.fecha_evento) {
      try {
        const d = new Date(evt.fecha_evento);
        dateVal = d.toISOString().slice(0, 16);
      } catch {}
    }

    setFormData({
      nombre: evt.nombre || "",
      slug: evt.slug || generateSlug(evt.nombre || ""),
      descripcion: evt.descripcion || "",
      fecha_evento: dateVal,
      lugar_evento: evt.lugar_evento || "",
      logo_url: evt.logo_url || "",
      banner_url: evt.banner_url || "",
      color_primario: evt.color_primario || "#083E30",
      color_secundario: evt.color_secundario || "#CFAA37",
      activo: evt.activo ?? true,
      requiere_checkin: evt.requiere_checkin ?? true,
      invitado_obligatorio: evt.invitado_obligatorio ?? false,
      asunto_correo: evt.asunto_correo || "Tu invitación al evento",
      mensaje_correo: evt.mensaje_correo || "Te invitamos a nuestro evento especial.",
      mensaje_whatsapp: evt.mensaje_whatsapp || "Hola, aquí está mi invitación al evento. Puedes descargarla desde este enlace:",
      correo_remitente: evt.correo_remitente || "cmgeventos0@gmail.com",
      es_de_pago: evt.es_de_pago ?? false,
      precio: evt.precio ?? 0,
      moneda: evt.moneda || "COP",
      instrucciones_pago: evt.instrucciones_pago || "",
      requiere_comprobante: evt.requiere_comprobante ?? false,
    });

    const { data: savedFields } = await supabase
      .from("event_field_configs")
      .select("*")
      .eq("event_id", evt.id);

    if (savedFields && savedFields.length > 0) {
      const keys = savedFields.map((f: any) => f.field_key);
      setSelectedFields(keys);
    }

    setIsDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (type === "logo") {
        setLogoPreview(result);
        setFormData((prev) => ({ ...prev, logo_url: result }));
      } else {
        setBannerPreview(result);
        setFormData((prev) => ({ ...prev, banner_url: result }));
      }
      toast.success(`Imagen de ${type === "logo" ? "logo" : "banner"} cargada localmente`);
    };
    reader.readAsDataURL(file);
  };

  const toggleFieldSelection = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const addCustomField = () => {
    if (!newCustomLabel.trim()) {
      toast.error("Ingresa el nombre del campo personalizado");
      return;
    }
    const key = "custom_" + generateSlug(newCustomLabel).replace(/-/g, "_");
    setCustomFields((prev) => [
      ...prev,
      { key, label: newCustomLabel.trim(), type: newCustomType, required: newCustomReq }
    ]);
    setSelectedFields((prev) => [...prev, key]);
    setNewCustomLabel("");
    toast.success("Campo personalizado agregado");
  };

  const saveEventMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const slugClean = generateSlug(data.nombre);
      const fullPayload: Record<string, any> = {
        nombre: data.nombre,
        slug: slugClean,
        descripcion: data.descripcion,
        fecha_evento: data.fecha_evento ? new Date(data.fecha_evento).toISOString() : null,
        lugar_evento: data.lugar_evento,
        logo_url: data.logo_url || null,
        banner_url: data.banner_url || null,
        color_primario: data.color_primario,
        color_secundario: data.color_secundario,
        activo: data.activo,
        requiere_checkin: data.requiere_checkin,
        invitado_obligatorio: data.invitado_obligatorio,
        asunto_correo: data.asunto_correo,
        mensaje_correo: data.mensaje_correo,
        mensaje_whatsapp: data.mensaje_whatsapp,
        correo_remitente: data.correo_remitente,
        es_de_pago: data.es_de_pago,
        precio: data.es_de_pago ? Number(data.precio) : 0,
        moneda: data.moneda,
        instrucciones_pago: data.es_de_pago ? data.instrucciones_pago : null,
        requiere_comprobante: data.es_de_pago ? data.requiere_comprobante : false,
      };

      let targetEventId = editingEventId;

      const performSave = async (currentPayload: Record<string, any>) => {
        if (targetEventId) {
          const { error } = await supabase.from("events").update(currentPayload).eq("id", targetEventId);
          if (error) throw error;
        } else {
          const { data: newEvt, error } = await supabase.from("events").insert(currentPayload).select().single();
          if (error) throw error;
          targetEventId = newEvt.id;
        }
      };

      try {
        await performSave(fullPayload);
      } catch (firstErr: any) {
        let lastErr = firstErr;
        let currentPayload = { ...fullPayload };
        let attempts = 0;

        while (attempts < 6 && lastErr && lastErr.message && lastErr.message.includes("Could not find the")) {
          attempts++;
          const match = lastErr.message.match(/Could not find the '([^']+)' column/);
          if (match && match[1] && currentPayload[match[1]] !== undefined) {
            delete currentPayload[match[1]];
            try {
              await performSave(currentPayload);
              lastErr = null; // Guardado con éxito
              break;
            } catch (retryErr: any) {
              lastErr = retryErr;
            }
          } else {
            break;
          }
        }

        if (lastErr) throw lastErr;
      }

      if (targetEventId) {
        await supabase.from("event_field_configs").delete().eq("event_id", targetEventId);

        const configsToInsert = selectedFields.map((fieldKey, index) => {
          const sys = AVAILABLE_SYSTEM_FIELDS.find((f) => f.key === fieldKey);
          const cust = customFields.find((f) => f.key === fieldKey);

          return {
            event_id: targetEventId,
            field_key: fieldKey,
            field_type: sys?.type || cust?.type || "text",
            label: sys?.label || cust?.label || fieldKey,
            required: sys?.defaultRequired ?? cust?.required ?? false,
            orden: index + 1,
          };
        });

        if (configsToInsert.length > 0) {
          await supabase.from("event_field_configs").insert(configsToInsert);
        }
      }

      try {
        await supabase.rpc("create_event_registration_table", { event_slug: slugClean });
      } catch (e) {
        console.warn("RPC create_event_registration_table fallback:", e);
      }
    },
    onSuccess: () => {
      toast.success(editingEventId ? "¡Evento y configuración actualizados!" : "¡Evento, precio y tabla creados!");
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error("Error al guardar evento: " + (err.message || "Verifica los campos"));
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => {
      toast.error("Error al eliminar: " + err.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("events").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado del evento actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => {
      toast.error("Error al actualizar: " + err.message);
    },
  });

  const formatMoney = (amount?: number | null, curr = "COP") => {
    if (!amount) return "Gratis";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 text-emerald-950 font-sans">
      {/* Banner Superior Admin */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-white/80 shadow-md">
        <div>
          <h2 className="text-2xl font-bold font-heading text-emerald-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600" />
            Gestión de Eventos (Gratuitos & de Pago)
          </h2>
          <p className="text-xs text-emerald-800 mt-1 font-medium">
            Crea y edita eventos gratuitos o de pago, configura precios, cuentas bancarias y campos de formulario.
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold flex items-center gap-2 shadow-md rounded-xl">
              <Plus className="w-4 h-4" />
              Crear Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white border border-emerald-200 text-emerald-950 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading text-emerald-900">
                {editingEventId ? "Editar Evento" : "Nuevo Evento"}
              </DialogTitle>
            </DialogHeader>

            {/* Pestañas dentro del Modal */}
            <div className="flex flex-wrap gap-2 border-b border-emerald-100 pb-2 pt-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "general" ? "bg-emerald-800 text-white" : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"}`}
              >
                1. Info & Imágenes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pago")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${activeTab === "pago" ? "bg-emerald-800 text-white" : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"}`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                2. Configuración de Pago
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("campos")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${activeTab === "campos" ? "bg-emerald-800 text-white" : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"}`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                3. Campos Formulario ({selectedFields.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sistema")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${activeTab === "sistema" ? "bg-emerald-800 text-white" : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"}`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                4. Mensajes & Sistema
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEventMutation.mutate(formData);
              }}
              className="space-y-4 pt-2 text-xs"
            >
              {/* TAB 1: GENERAL */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-emerald-900 mb-1 block">Nombre del Evento *</Label>
                    <Input
                      required
                      placeholder="Ej: Retiro de Jóvenes / Conferencia de Parejas"
                      value={formData.nombre}
                      onChange={handleNameChange}
                      className="bg-white border-emerald-300 text-emerald-950 font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-emerald-900 mb-1 block">URL de Registro (Auto-generada) *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 font-mono">/eventos/</span>
                      <Input
                        required
                        readOnly
                        value={formData.slug}
                        className="bg-emerald-50/60 border-emerald-300 text-emerald-900 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-emerald-900 mb-1 block">Descripción del Evento</Label>
                    <Textarea
                      placeholder="Información relevante para los asistentes..."
                      value={formData.descripcion}
                      onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                      className="bg-white border-emerald-300 text-emerald-950"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-emerald-900 mb-1 block">Fecha y Hora</Label>
                      <Input
                        type="datetime-local"
                        value={formData.fecha_evento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fecha_evento: e.target.value }))}
                        className="bg-white border-emerald-300 text-emerald-950"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-emerald-900 mb-1 block">Lugar</Label>
                      <Input
                        placeholder="Ej: Auditorio Principal CMG"
                        value={formData.lugar_evento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, lugar_evento: e.target.value }))}
                        className="bg-white border-emerald-300 text-emerald-950"
                      />
                    </div>
                  </div>

                  {/* Imágenes Locales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                      <Label className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-700" />
                        Logo (Subir archivo local)
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "logo")}
                        className="bg-white border-emerald-300 text-xs text-emerald-950 cursor-pointer"
                      />
                      {logoPreview && (
                        <img src={logoPreview} alt="Logo" className="h-10 w-auto object-contain rounded border border-emerald-200 bg-white p-1" />
                      )}
                    </div>

                    <div className="space-y-2 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                      <Label className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-emerald-700" />
                        Banner (Subir archivo local)
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "banner")}
                        className="bg-white border-emerald-300 text-xs text-emerald-950 cursor-pointer"
                      />
                      {bannerPreview && (
                        <img src={bannerPreview} alt="Banner" className="h-10 w-24 object-cover rounded border border-emerald-200" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONFIGURACIÓN DE PAGO (GRATIS VS DE PAGO) */}
              {activeTab === "pago" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div>
                      <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-amber-700" />
                        ¿Este evento es de PAGO?
                      </Label>
                      <p className="text-[11px] text-amber-800">
                        Si está activo, se mostrará el valor de la boleta y las instrucciones de transferencia/pago.
                      </p>
                    </div>
                    <Switch
                      checked={formData.es_de_pago}
                      onCheckedChange={(val) => setFormData((prev) => ({ ...prev, es_de_pago: val }))}
                    />
                  </div>

                  {formData.es_de_pago && (
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold text-emerald-900 mb-1 block">Precio de la Entrada / Inscripción *</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">$</span>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Ej: 50000"
                              value={formData.precio}
                              onChange={(e) => setFormData((prev) => ({ ...prev, precio: Number(e.target.value) }))}
                              className="pl-7 bg-white border-emerald-300 text-emerald-950 font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold text-emerald-900 mb-1 block">Moneda</Label>
                          <Input
                            placeholder="COP"
                            value={formData.moneda}
                            onChange={(e) => setFormData((prev) => ({ ...prev, moneda: e.target.value }))}
                            className="bg-white border-emerald-300 text-emerald-950 font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-emerald-900 mb-1 block">
                          Instrucciones de Pago / Cuentas Bancarias
                        </Label>
                        <Textarea
                          rows={3}
                          placeholder="Ej: Transferir Nequi/Daviplata al 3001234567 o Bancolombia Ahorros #1234567..."
                          value={formData.instrucciones_pago}
                          onChange={(e) => setFormData((prev) => ({ ...prev, instrucciones_pago: e.target.value }))}
                          className="bg-white border-emerald-300 text-emerald-950 text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                        <div>
                          <Label className="text-xs font-semibold text-emerald-950">Solicitar Comprobante de Pago en el Registro</Label>
                          <p className="text-[11px] text-emerald-700">El usuario deberá adjuntar la foto/comprobante de su transferencia.</p>
                        </div>
                        <Switch
                          checked={formData.requiere_comprobante}
                          onCheckedChange={(val) => setFormData((prev) => ({ ...prev, requiere_comprobante: val }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CAMPOS DEL FORMULARIO */}
              {activeTab === "campos" && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5 text-xs">
                      <ListChecks className="w-4 h-4 text-amber-600" />
                      Seleccionar Campos del Formulario
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      Marca los campos que se solicitarán en el formulario de este evento:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-2 bg-white border border-emerald-200 rounded-xl">
                    {AVAILABLE_SYSTEM_FIELDS.map((field) => {
                      const isSelected = selectedFields.includes(field.key);
                      return (
                        <label
                          key={field.key}
                          className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${isSelected ? "bg-emerald-50 border-emerald-300 font-semibold" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleFieldSelection(field.key)}
                          />
                          <span className="text-xs text-emerald-950">{field.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Campos Personalizados */}
                  <div className="space-y-2 pt-2 border-t border-emerald-100">
                    <h5 className="font-bold text-emerald-900 text-xs">+ Agregar Campo Personalizado</h5>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        placeholder="Ej: Talla de Camiseta"
                        value={newCustomLabel}
                        onChange={(e) => setNewCustomLabel(e.target.value)}
                        className="flex-1 min-w-[150px] bg-white border-emerald-300 text-xs"
                      />
                      <select
                        value={newCustomType}
                        onChange={(e) => setNewCustomType(e.target.value)}
                        className="bg-white border border-emerald-300 text-xs rounded-md p-2 text-emerald-950"
                      >
                        <option value="text">Texto corto</option>
                        <option value="date">Fecha</option>
                        <option value="phone">Teléfono</option>
                        <option value="email">Correo</option>
                      </select>
                      <Button type="button" size="sm" onClick={addCustomField} className="bg-emerald-800 hover:bg-emerald-900 text-white">
                        Agregar
                      </Button>
                    </div>

                    {customFields.length > 0 && (
                      <div className="space-y-1 pt-2">
                        {customFields.map((f) => (
                          <div key={f.key} className="flex items-center justify-between p-2 bg-emerald-50 rounded border border-emerald-200 text-xs">
                            <span>{f.label} ({f.type})</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setCustomFields(prev => prev.filter(c => c.key !== f.key))} className="text-red-600 h-6">
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CONFIGURACIÓN DEL SISTEMA Y MENSAJES INDIVIDUALES */}
              {activeTab === "sistema" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-emerald-900 mb-1 block flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-700" /> Correo Remitente (Brevo) para este evento
                    </Label>
                    <Input
                      placeholder="cmgeventos0@gmail.com"
                      value={formData.correo_remitente}
                      onChange={(e) => setFormData((prev) => ({ ...prev, correo_remitente: e.target.value }))}
                      className="bg-white border-emerald-300 text-emerald-950"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-emerald-900 mb-1 block flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-700" /> Asunto del Correo Electrónico
                    </Label>
                    <Input
                      value={formData.asunto_correo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, asunto_correo: e.target.value }))}
                      className="bg-white border-emerald-300 text-emerald-950 font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-emerald-900 mb-1 block flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-700" /> Cuerpo / Mensaje del Correo Electrónico
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Escribe aquí el texto personalizado que llegará en el correo del usuario..."
                      value={formData.mensaje_correo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, mensaje_correo: e.target.value }))}
                      className="bg-white border-emerald-300 text-emerald-950 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-emerald-900 mb-1 block flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Mensaje para WhatsApp
                    </Label>
                    <Textarea
                      rows={2}
                      value={formData.mensaje_whatsapp}
                      onChange={(e) => setFormData((prev) => ({ ...prev, mensaje_whatsapp: e.target.value }))}
                      className="bg-white border-emerald-300 text-emerald-950 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center justify-between bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                      <Label className="text-xs font-semibold text-emerald-950">Invitado Obligatorio</Label>
                      <Switch
                        checked={formData.invitado_obligatorio}
                        onCheckedChange={(val) => setFormData((prev) => ({ ...prev, invitado_obligatorio: val }))}
                      />
                    </div>

                    <div className="flex items-center justify-between bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                      <Label className="text-xs font-semibold text-emerald-950">Requiere Check-in</Label>
                      <Switch
                        checked={formData.requiere_checkin}
                        onCheckedChange={(val) => setFormData((prev) => ({ ...prev, requiere_checkin: val }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                    <div>
                      <Label className="text-xs font-semibold text-emerald-950">Evento Activo en Catálogo</Label>
                    </div>
                    <Switch
                      checked={formData.activo}
                      onCheckedChange={(val) => setFormData((prev) => ({ ...prev, activo: val }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-emerald-100">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-emerald-300 text-emerald-900">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveEventMutation.isPending} className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold">
                  {saveEventMutation.isPending ? "Guardando..." : editingEventId ? "Guardar Cambios" : "Crear Evento y Tabla Dedicada"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid de Tarjetas de Eventos */}
      {isLoading ? (
        <div className="py-12 text-center text-emerald-700">Cargando eventos...</div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <Card key={evt.id} className="glass-card border-white/90 text-emerald-950 flex flex-col justify-between shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={evt.activo ? "default" : "secondary"} className={evt.activo ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-700"}>
                      {evt.activo ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {evt.activo ? "Activo" : "Inactivo"}
                    </Badge>

                    {evt.es_de_pago ? (
                      <Badge className="bg-amber-400 text-emerald-950 font-bold border-amber-300">
                        {formatMoney(evt.precio, evt.moneda || "COP")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-900 bg-white">
                        Gratis
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(evt)}
                      className="h-8 w-8 text-emerald-800 hover:bg-emerald-100"
                      title="Editar evento, precio y campos"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" title="Eliminar evento">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white border-emerald-200">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-emerald-950 font-heading">¿Eliminar evento?</AlertDialogTitle>
                          <AlertDialogDescription className="text-emerald-800 text-xs">
                            Se eliminará el evento <strong>{evt.nombre}</strong> y sus registros.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-emerald-300">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteEventMutation.mutate(evt.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Switch
                      checked={evt.activo}
                      onCheckedChange={(val) => toggleActiveMutation.mutate({ id: evt.id, activo: val })}
                    />
                  </div>
                </div>

                <CardTitle className="text-base font-bold font-heading text-emerald-900">{evt.nombre}</CardTitle>
                <CardDescription className="text-xs text-emerald-700 line-clamp-2">
                  {evt.descripcion || "Sin descripción"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 text-xs text-emerald-800 border-t border-emerald-100/80 pt-3">
                <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-700">
                  <span className="bg-emerald-100 px-2 py-0.5 rounded font-semibold">URL:</span>
                  <span className="line-clamp-1">/eventos/{evt.slug}</span>
                </div>
                {evt.fecha_evento && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{new Date(evt.fecha_evento).toLocaleDateString("es-ES")}</span>
                  </div>
                )}
                {evt.lugar_evento && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="line-clamp-1">{evt.lugar_evento}</span>
                  </div>
                )}
              </CardContent>

              <div className="p-3 border-t border-emerald-100 bg-white/50 rounded-b-xl flex items-center justify-between">
                <a
                  href={`/eventos/${evt.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold flex items-center gap-1"
                >
                  Abrir enlace público
                  <ExternalLink className="w-3 h-3 text-amber-600" />
                </a>

                <Button variant="outline" size="sm" onClick={() => handleEditClick(evt)} className="text-xs h-7 border-emerald-300 text-emerald-900">
                  <Pencil className="w-3 h-3 mr-1" /> Configurar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 glass-card rounded-2xl text-emerald-800">
          No hay eventos creados. Usa el botón superior para agregar el primero.
        </div>
      )}
    </div>
  );
};
