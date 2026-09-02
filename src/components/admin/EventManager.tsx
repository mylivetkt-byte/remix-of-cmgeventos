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
import { Plus, Calendar, MapPin, CheckCircle2, XCircle, ExternalLink, Sparkles, Pencil, Trash2, Upload, Image as ImageIcon, Settings2, Mail, MessageSquare, ListChecks, DollarSign, CreditCard, ArrowUp, ArrowDown, GripVertical, X, Check, ListPlus } from "lucide-react";

interface CustomField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
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
    enviar_whatsapp_checkin: false,
    mensaje_whatsapp_checkin: "¡Hola {nombres}! 👋 Te damos la bienvenida oficial a {evento}. Tu ingreso ha sido registrado exitosamente.",
    pdf_whatsapp_checkin_url: "",
  });

  const [selectedFields, setSelectedFields] = useState<string[]>([
    "nombres", "apellidos", "tipo_documento_id", "numero_documento", "telefono", "correo", "fecha_nacimiento", "red_id", "cdp_id"
  ]);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomType, setNewCustomType] = useState("text");
  const [newCustomReq, setNewCustomReq] = useState(false);
  const [newCustomOptions, setNewCustomOptions] = useState<string[]>([]);
  const [newCustomOptionInput, setNewCustomOptionInput] = useState("");

  // Estado para modificar campos personalizados existentes
  const [editingCustomKey, setEditingCustomKey] = useState<string | null>(null);
  const [editCustomLabel, setEditCustomLabel] = useState("");
  const [editCustomType, setEditCustomType] = useState("text");
  const [editCustomReq, setEditCustomReq] = useState(false);
  const [editCustomOptions, setEditCustomOptions] = useState<string[]>([]);
  const [editCustomOptionInput, setEditCustomOptionInput] = useState("");

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
    setEditingCustomKey(null);
    setNewCustomOptions([]);
    setNewCustomOptionInput("");
    setEditCustomOptions([]);
    setEditCustomOptionInput("");
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
      enviar_whatsapp_checkin: evt.enviar_whatsapp_checkin ?? false,
      mensaje_whatsapp_checkin: evt.mensaje_whatsapp_checkin || "¡Hola {nombres}! 👋 Te damos la bienvenida oficial a {evento}. Tu ingreso ha sido registrado exitosamente.",
      pdf_whatsapp_checkin_url: evt.pdf_whatsapp_checkin_url || "",
    });

    const { data: savedFields } = await supabase
      .from("event_field_configs")
      .select("*")
      .eq("event_id", evt.id)
      .order("orden");

    if (savedFields && savedFields.length > 0) {
      const keys = savedFields.map((f: any) => f.field_key);
      setSelectedFields(keys);

      const systemKeys = AVAILABLE_SYSTEM_FIELDS.map((f) => f.key);
      const loadedCustomFields: CustomField[] = savedFields
        .filter((f: any) => !systemKeys.includes(f.field_key))
        .map((f: any) => {
          let parsedOpts: string[] = [];
          if (Array.isArray(f.options)) {
            parsedOpts = f.options.map((o: any) => (typeof o === "string" ? o : o.label || o.value || String(o)));
          } else if (typeof f.options === "string" && f.options.trim()) {
            try {
              const p = JSON.parse(f.options);
              if (Array.isArray(p)) {
                parsedOpts = p.map((o: any) => (typeof o === "string" ? o : o.label || o.value || String(o)));
              } else {
                parsedOpts = [f.options];
              }
            } catch {
              parsedOpts = [f.options];
            }
          }
          return {
            key: f.field_key,
            label: f.label,
            type: f.field_type || "text",
            required: f.required ?? false,
            options: parsedOpts.length > 0 ? parsedOpts : undefined,
          };
        });

      setCustomFields(loadedCustomFields);
    } else {
      setCustomFields([]);
    }
    setEditingCustomKey(null);
    setNewCustomOptions([]);
    setNewCustomOptionInput("");

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

  const moveFieldUp = (index: number) => {
    if (index <= 0) return;
    setSelectedFields((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveFieldDown = (index: number) => {
    setSelectedFields((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleAddNewCustomOption = () => {
    if (!newCustomOptionInput.trim()) return;
    const val = newCustomOptionInput.trim();
    if (!newCustomOptions.includes(val)) {
      setNewCustomOptions((prev) => [...prev, val]);
    }
    setNewCustomOptionInput("");
  };

  const handleRemoveNewCustomOption = (index: number) => {
    setNewCustomOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustomField = () => {
    if (!newCustomLabel.trim()) {
      toast.error("Ingresa el nombre del campo personalizado");
      return;
    }
    const cleanSlug = generateSlug(newCustomLabel).replace(/-/g, "_");
    const key = `custom_${cleanSlug}_${Date.now().toString().slice(-4)}`;
    const hasOptions = ["select", "radio", "checkbox"].includes(newCustomType) || newCustomOptions.length > 0;

    setCustomFields((prev) => [
      ...prev,
      {
        key,
        label: newCustomLabel.trim(),
        type: newCustomType,
        required: newCustomReq,
        options: hasOptions && newCustomOptions.length > 0 ? [...newCustomOptions] : undefined,
      },
    ]);
    setSelectedFields((prev) => [...prev, key]);
    setNewCustomLabel("");
    setNewCustomType("text");
    setNewCustomReq(false);
    setNewCustomOptions([]);
    setNewCustomOptionInput("");
    toast.success("Campo personalizado agregado");
  };

  const startEditCustomField = (field: CustomField) => {
    setEditingCustomKey(field.key);
    setEditCustomLabel(field.label);
    setEditCustomType(field.type || "text");
    setEditCustomReq(field.required ?? false);
    setEditCustomOptions(field.options ? [...field.options] : []);
    setEditCustomOptionInput("");
  };

  const cancelEditCustomField = () => {
    setEditingCustomKey(null);
    setEditCustomLabel("");
    setEditCustomType("text");
    setEditCustomReq(false);
    setEditCustomOptions([]);
    setEditCustomOptionInput("");
  };

  const saveEditCustomField = () => {
    if (!editCustomLabel.trim()) {
      toast.error("El nombre del campo no puede estar vacío");
      return;
    }
    if (!editingCustomKey) return;

    const hasOptions = ["select", "radio", "checkbox"].includes(editCustomType) || editCustomOptions.length > 0;

    setCustomFields((prev) =>
      prev.map((f) => {
        if (f.key !== editingCustomKey) return f;
        return {
          ...f,
          label: editCustomLabel.trim(),
          type: editCustomType,
          required: editCustomReq,
          options: hasOptions && editCustomOptions.length > 0 ? [...editCustomOptions] : undefined,
        };
      })
    );
    setEditingCustomKey(null);
    toast.success("Campo personalizado modificado exitosamente");
  };

  const handleAddEditCustomOption = () => {
    if (!editCustomOptionInput.trim()) return;
    const val = editCustomOptionInput.trim();
    if (!editCustomOptions.includes(val)) {
      setEditCustomOptions((prev) => [...prev, val]);
    }
    setEditCustomOptionInput("");
  };

  const handleRemoveEditCustomOption = (index: number) => {
    setEditCustomOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEditCustomOptionText = (index: number, val: string) => {
    setEditCustomOptions((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const removeCustomField = (key: string) => {
    setCustomFields((prev) => prev.filter((c) => c.key !== key));
    setSelectedFields((prev) => prev.filter((k) => k !== key));
    if (editingCustomKey === key) {
      cancelEditCustomField();
    }
    toast.info("Campo eliminado");
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
            options: cust?.options && cust.options.length > 0 ? cust.options : null,
          };
        });

        if (configsToInsert.length > 0) {
          await supabase.from("event_field_configs").insert(configsToInsert as any);
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
          <DialogContent className="max-w-4xl w-[95vw] bg-white border border-slate-200 text-slate-900 max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-heading text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-teal-600" />
                {editingEventId ? "Editar Configuración del Evento" : "Crear Nuevo Evento"}
              </DialogTitle>
            </DialogHeader>

            {/* Pestañas dentro del Modal (Amplias y Cómodas) */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 pt-2 text-sm font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`px-4 py-2.5 rounded-xl transition-all ${activeTab === "general" ? "bg-teal-100/90 text-teal-950 border border-teal-200 font-extrabold shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"}`}
              >
                1. Info & Imágenes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pago")}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "pago" ? "bg-teal-100/90 text-teal-950 border border-teal-200 font-extrabold shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"}`}
              >
                <DollarSign className="w-4 h-4 text-teal-700" />
                2. Configuración de Pago
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("campos")}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "campos" ? "bg-teal-100/90 text-teal-950 border border-teal-200 font-extrabold shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"}`}
              >
                <ListChecks className="w-4 h-4 text-teal-700" />
                3. Campos Formulario ({selectedFields.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sistema")}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 ${activeTab === "sistema" ? "bg-teal-100/90 text-teal-950 border border-teal-200 font-extrabold shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"}`}
              >
                <Settings2 className="w-4 h-4 text-teal-700" />
                4. Mensajes & Sistema
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEventMutation.mutate(formData);
              }}
              className="space-y-5 pt-3 text-sm"
            >
              {/* TAB 1: GENERAL */}
              {activeTab === "general" && (
                <div className="space-y-5">
                  <div>
                    <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Nombre del Evento *</Label>
                    <Input
                      required
                      placeholder="Ej: Retiro de Jóvenes / Conferencia de Parejas"
                      value={formData.nombre}
                      onChange={handleNameChange}
                      className="bg-white border-slate-300 text-slate-900 font-semibold h-11 text-sm rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-slate-900 mb-1.5 block">URL de Registro (Auto-generada) *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-teal-900 bg-teal-50 px-3.5 py-2.5 rounded-xl border border-teal-200 font-mono">/eventos/</span>
                      <Input
                        required
                        readOnly
                        value={formData.slug}
                        className="bg-slate-50 border-slate-300 text-slate-900 font-mono font-bold h-11 text-sm rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Descripción del Evento</Label>
                    <Textarea
                      placeholder="Información relevante para los asistentes..."
                      value={formData.descripcion}
                      onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                      rows={3}
                      className="bg-white border-slate-300 text-slate-900 text-sm rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Fecha y Hora</Label>
                      <Input
                        type="datetime-local"
                        value={formData.fecha_evento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fecha_evento: e.target.value }))}
                        className="bg-white border-slate-300 text-slate-900 h-11 text-sm rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Lugar del Evento</Label>
                      <Input
                        placeholder="Ej: Auditorio Principal CMG"
                        value={formData.lugar_evento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, lugar_evento: e.target.value }))}
                        className="bg-white border-slate-300 text-slate-900 h-11 text-sm rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Imágenes Locales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-teal-700" />
                        Logo (Subir archivo local)
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "logo")}
                        className="bg-white border-slate-300 text-sm text-slate-900 cursor-pointer h-10"
                      />
                      {logoPreview && (
                        <img src={logoPreview} alt="Logo" className="h-14 w-auto object-contain rounded-xl border border-slate-200 bg-white p-1.5 mt-2" />
                      )}
                    </div>

                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-teal-700" />
                        Banner (Subir archivo local)
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "banner")}
                        className="bg-white border-slate-300 text-sm text-slate-900 cursor-pointer h-10"
                      />
                      {bannerPreview && (
                        <img src={bannerPreview} alt="Banner" className="h-14 w-28 object-cover rounded-xl border border-slate-200 mt-2" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONFIGURACIÓN DE PAGO */}
              {activeTab === "pago" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <div>
                      <Label className="text-sm font-bold text-amber-950 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-amber-700" />
                        ¿Este evento es de PAGO?
                      </Label>
                      <p className="text-xs text-amber-900 mt-0.5">
                        Si está activo, se mostrará el valor de la boleta y las instrucciones de transferencia/pago.
                      </p>
                    </div>
                    <Switch
                      checked={formData.es_de_pago}
                      onCheckedChange={(val) => setFormData((prev) => ({ ...prev, es_de_pago: val }))}
                    />
                  </div>

                  {formData.es_de_pago && (
                    <div className="space-y-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Precio por Boleta *</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Ej: 50000"
                            value={formData.precio}
                            onChange={(e) => setFormData((prev) => ({ ...prev, precio: Number(e.target.value) }))}
                            className="bg-white border-slate-300 text-slate-900 font-bold h-11 text-sm rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Moneda</Label>
                          <Input
                            value={formData.moneda}
                            onChange={(e) => setFormData((prev) => ({ ...prev, moneda: e.target.value }))}
                            className="bg-white border-slate-300 text-slate-900 font-bold h-11 text-sm rounded-xl"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Instrucciones de Pago / Cuentas Bancarias</Label>
                        <Textarea
                          rows={3}
                          placeholder="Ej: Transferir a Nequi / Bancolombia Cta 123456789..."
                          value={formData.instrucciones_pago}
                          onChange={(e) => setFormData((prev) => ({ ...prev, instrucciones_pago: e.target.value }))}
                          className="bg-white border-slate-300 text-slate-900 text-sm rounded-xl"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <Label className="text-sm font-bold text-slate-900">Requiere adjuntar comprobante de pago</Label>
                        <Switch
                          checked={formData.requiere_comprobante}
                          onCheckedChange={(val) => setFormData((prev) => ({ ...prev, requiere_comprobante: val }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CAMPOS DEL FORMULARIO (Gran Tamaño y Legibilidad) */}
              {activeTab === "campos" && (
                <div className="space-y-5">
                  <div className="bg-teal-50/80 p-4 rounded-2xl border border-teal-200">
                    <h4 className="font-bold text-teal-950 mb-1 flex items-center gap-2 text-sm">
                      <ListChecks className="w-5 h-5 text-teal-700" />
                      Seleccionar Campos del Formulario de Registro
                    </h4>
                    <p className="text-xs text-teal-900 font-medium">
                      Marca los campos que se solicitarán a los usuarios al registrarse en este evento:
                    </p>
                  </div>

                  {/* Panel de Ordenación / Posiciones del Formulario */}
                  {selectedFields.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-teal-600" />
                          Orden de Aparición en el Formulario Público ({selectedFields.length} campos)
                        </h5>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Usa las flechas ⬆️ ⬇️ para modificar la posición
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-1">
                        {selectedFields.map((fieldKey, idx) => {
                          const sys = AVAILABLE_SYSTEM_FIELDS.find((f) => f.key === fieldKey);
                          const cust = customFields.find((f) => f.key === fieldKey);
                          const label = sys?.label || cust?.label || fieldKey;

                          return (
                            <div
                              key={fieldKey}
                              className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge className="bg-teal-700 text-white font-black px-2 py-0.5 text-[10px] shrink-0">
                                  #{idx + 1}
                                </Badge>
                                <span className="truncate">{label}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === 0}
                                  onClick={() => moveFieldUp(idx)}
                                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                                  title="Subir posición"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === selectedFields.length - 1}
                                  onClick={() => moveFieldDown(idx)}
                                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                                  title="Bajar posición"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    {AVAILABLE_SYSTEM_FIELDS.map((field) => {
                      const isSelected = selectedFields.includes(field.key);
                      return (
                        <label
                          key={field.key}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-teal-100/90 border-teal-300 font-extrabold text-teal-950 shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 font-semibold"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleFieldSelection(field.key)}
                            className="w-4 h-4 border-teal-600"
                          />
                          <span className="text-xs sm:text-sm">{field.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Campos Personalizados */}
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <h5 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4 text-teal-600" /> Crear Campo Personalizado Adicional
                      </h5>
                      <span className="text-xs text-slate-500 font-medium">
                        Crea preguntas personalizadas con o sin opciones de respuesta
                      </span>
                    </div>

                    {/* FORMULARIO DE CREACIÓN DE CAMPO */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-6">
                          <Label className="text-xs font-bold text-slate-700 mb-1 block">Nombre / Pregunta del Campo</Label>
                          <Input
                            placeholder="Ej: Talla de Camiseta, Ocupación, etc."
                            value={newCustomLabel}
                            onChange={(e) => setNewCustomLabel(e.target.value)}
                            className="bg-white border-slate-300 text-sm h-10 rounded-xl"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <Label className="text-xs font-bold text-slate-700 mb-1 block">Tipo de Campo</Label>
                          <select
                            value={newCustomType}
                            onChange={(e) => setNewCustomType(e.target.value)}
                            className="w-full bg-white border border-slate-300 text-sm font-semibold rounded-xl px-3 h-10 text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                          >
                            <option value="text">Texto corto</option>
                            <option value="select">Menú Desplegable (Con Opciones)</option>
                            <option value="radio">Selección Única (Con Opciones)</option>
                            <option value="date">Fecha</option>
                            <option value="phone">Teléfono / Celular</option>
                            <option value="email">Correo Electrónico</option>
                            <option value="number">Número</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2 flex items-center gap-2 pt-4 sm:pt-4">
                          <Checkbox
                            id="newCustomReq"
                            checked={newCustomReq}
                            onCheckedChange={(c) => setNewCustomReq(!!c)}
                            className="w-4 h-4 border-teal-600"
                          />
                          <Label htmlFor="newCustomReq" className="text-xs font-bold text-slate-800 cursor-pointer">
                            Obligatorio
                          </Label>
                        </div>
                      </div>

                      {/* SECCIÓN DE OPCIONES DE RESPUESTA PARA EL NUEVO CAMPO */}
                      {(["select", "radio"].includes(newCustomType) || newCustomOptions.length > 0) && (
                        <div className="pt-3 border-t border-slate-200/80 space-y-2 bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                          <Label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                            <ListPlus className="w-3.5 h-3.5 text-teal-700" />
                            Opciones de Respuesta para este campo:
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Escribe una opción (Ej: Talla S, Invitado, etc.)"
                              value={newCustomOptionInput}
                              onChange={(e) => setNewCustomOptionInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddNewCustomOption();
                                }
                              }}
                              className="bg-white border-teal-200 text-xs h-9 rounded-lg flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAddNewCustomOption}
                              className="bg-teal-700 hover:bg-teal-800 text-white font-bold h-9 px-3 text-xs rounded-lg shrink-0"
                            >
                              + Añadir Opción
                            </Button>
                          </div>

                          {newCustomOptions.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {newCustomOptions.map((opt, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="bg-white text-teal-950 border border-teal-300 font-semibold px-2.5 py-1 text-xs rounded-lg flex items-center gap-1.5 shadow-2xs"
                                >
                                  <span>{opt}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveNewCustomOption(idx)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-0.5"
                                    title="Quitar opción"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-teal-800/80 italic">
                              Agrega al menos una opción para que el usuario pueda seleccionarla en el formulario.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={addCustomField}
                          className="bg-teal-700 hover:bg-teal-800 text-white font-bold h-10 px-5 rounded-xl text-xs sm:text-sm shadow-xs"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Agregar Campo Personalizado
                        </Button>
                      </div>
                    </div>

                    {/* LISTADO DE CAMPOS PERSONALIZADOS CREADOS Y EDITOR INLINE */}
                    {customFields.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Campos Personalizados Configurados ({customFields.length})
                        </Label>

                        <div className="space-y-2.5">
                          {customFields.map((f) => {
                            const isEditingThis = editingCustomKey === f.key;

                            if (isEditingThis) {
                              return (
                                <div
                                  key={f.key}
                                  className="p-4 bg-teal-50/80 rounded-2xl border-2 border-teal-500 shadow-sm space-y-3.5 transition-all"
                                >
                                  <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                                    <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                                      <Pencil className="w-3.5 h-3.5 text-teal-700" /> Modificando Campo: {f.label}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditCustomField}
                                      className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                                    >
                                      <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                    <div className="sm:col-span-6">
                                      <Label className="text-xs font-bold text-slate-800 mb-1 block">Nombre / Pregunta</Label>
                                      <Input
                                        value={editCustomLabel}
                                        onChange={(e) => setEditCustomLabel(e.target.value)}
                                        className="bg-white border-teal-300 text-sm h-9 rounded-xl"
                                      />
                                    </div>
                                    <div className="sm:col-span-4">
                                      <Label className="text-xs font-bold text-slate-800 mb-1 block">Tipo</Label>
                                      <select
                                        value={editCustomType}
                                        onChange={(e) => setEditCustomType(e.target.value)}
                                        className="w-full bg-white border border-teal-300 text-xs font-bold rounded-xl px-2.5 h-9 text-slate-900"
                                      >
                                        <option value="text">Texto corto</option>
                                        <option value="select">Menú Desplegable (Con Opciones)</option>
                                        <option value="radio">Selección Única (Con Opciones)</option>
                                        <option value="date">Fecha</option>
                                        <option value="phone">Teléfono / Celular</option>
                                        <option value="email">Correo Electrónico</option>
                                        <option value="number">Número</option>
                                      </select>
                                    </div>
                                    <div className="sm:col-span-2 flex items-center gap-2 pt-4">
                                      <Checkbox
                                        id={`editReq_${f.key}`}
                                        checked={editCustomReq}
                                        onCheckedChange={(c) => setEditCustomReq(!!c)}
                                        className="w-4 h-4 border-teal-600"
                                      />
                                      <Label htmlFor={`editReq_${f.key}`} className="text-xs font-bold text-slate-800 cursor-pointer">
                                        Obligatorio
                                      </Label>
                                    </div>
                                  </div>

                                  {/* OPCIONES DE RESPUESTA EN LA PARTE DE ABAJO PARA MODIFICAR O QUITAR */}
                                  <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                                        <ListPlus className="w-3.5 h-3.5 text-teal-700" />
                                        Opciones de Respuesta del Campo
                                      </Label>
                                      <span className="text-[11px] font-medium text-slate-500">
                                        Puedes cambiar el texto de cada opción o presionar 🗑️ para quitarla
                                      </span>
                                    </div>

                                    {/* Input para agregar nueva opción a este campo */}
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Escribe una nueva opción..."
                                        value={editCustomOptionInput}
                                        onChange={(e) => setEditCustomOptionInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddEditCustomOption();
                                          }
                                        }}
                                        className="bg-slate-50 border-slate-300 text-xs h-8 rounded-lg flex-1"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleAddEditCustomOption}
                                        className="bg-teal-700 hover:bg-teal-800 text-white font-bold h-8 px-3 text-xs rounded-lg shrink-0"
                                      >
                                        + Agregar Opción
                                      </Button>
                                    </div>

                                    {/* Lista de opciones con modificación y eliminación */}
                                    {editCustomOptions.length > 0 ? (
                                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                        {editCustomOptions.map((opt, oIdx) => (
                                          <div
                                            key={oIdx}
                                            className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                                          >
                                            <span className="text-[11px] font-black text-teal-800 w-6 text-center shrink-0">
                                              #{oIdx + 1}
                                            </span>
                                            <Input
                                              value={opt}
                                              onChange={(e) => handleUpdateEditCustomOptionText(oIdx, e.target.value)}
                                              placeholder={`Opción ${oIdx + 1}`}
                                              className="bg-white border-slate-300 text-xs h-7 rounded px-2 flex-1 font-medium"
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRemoveEditCustomOption(oIdx)}
                                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-100/80 rounded-md shrink-0"
                                              title="Eliminar opción"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic py-1">
                                        No hay opciones configuradas todavía. Agrega al menos una opción para menús desplegables o selección única.
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={cancelEditCustomField}
                                      className="h-9 px-4 text-xs font-semibold rounded-xl"
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={saveEditCustomField}
                                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold h-9 px-4 text-xs rounded-xl shadow-xs"
                                    >
                                      <Check className="w-3.5 h-3.5 mr-1" /> Guardar Cambios del Campo
                                    </Button>
                                  </div>
                                </div>
                              );
                            }

                            // VISTA NORMAL DEL CAMPO PERSONALIZADO
                            return (
                              <div
                                key={f.key}
                                className="p-3 bg-white rounded-xl border border-teal-200/90 shadow-2xs hover:border-teal-400 transition-all space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-bold text-slate-900">{f.label}</span>
                                    <Badge variant="outline" className="bg-teal-50 text-teal-900 border-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      {f.type === "select" ? "Desplegable" : f.type === "radio" ? "Selección Única" : f.type === "date" ? "Fecha" : f.type === "phone" ? "Teléfono" : f.type === "email" ? "Correo" : f.type === "number" ? "Número" : "Texto"}
                                    </Badge>
                                    {f.required && (
                                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                                        Obligatorio
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEditCustomField(f)}
                                      className="h-8 px-2.5 text-xs font-bold text-teal-800 border-teal-300 hover:bg-teal-50 rounded-lg flex items-center gap-1"
                                      title="Modificar campo y opciones"
                                    >
                                      <Pencil className="w-3.5 h-3.5" /> Modificar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeCustomField(f.key)}
                                      className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg flex items-center gap-1"
                                      title="Eliminar campo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Quitar
                                    </Button>
                                  </div>
                                </div>

                                {/* Mostrar opciones existentes si las tiene */}
                                {f.options && f.options.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500">Opciones ({f.options.length}):</span>
                                    {f.options.map((opt, oIdx) => (
                                      <Badge
                                        key={oIdx}
                                        variant="secondary"
                                        className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-medium px-2 py-0.5 rounded-md"
                                      >
                                        {opt}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CONFIGURACIÓN DEL SISTEMA Y MENSAJES INDIVIDUALES */}
              {activeTab === "sistema" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-bold text-slate-900 mb-1.5 block flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-teal-700" /> Correo Remitente (Brevo) para este evento
                    </Label>
                    <Input
                      placeholder="cmgeventos0@gmail.com"
                      value={formData.correo_remitente}
                      onChange={(e) => setFormData((prev) => ({ ...prev, correo_remitente: e.target.value }))}
                      className="bg-white border-slate-300 text-slate-900 h-11 text-sm rounded-xl font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-slate-900 mb-1.5 block flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-teal-700" /> Asunto del Correo Electrónico
                    </Label>
                    <Input
                      value={formData.asunto_correo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, asunto_correo: e.target.value }))}
                      className="bg-white border-slate-300 text-slate-900 font-bold h-11 text-sm rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-slate-900 mb-1.5 block flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-teal-700" /> Cuerpo / Mensaje del Correo Electrónico
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Escribe aquí el texto personalizado que llegará en el correo del usuario..."
                      value={formData.mensaje_correo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, mensaje_correo: e.target.value }))}
                      className="bg-white border-slate-300 text-slate-900 text-sm rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-slate-900 mb-1.5 block flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-teal-700" /> Mensaje para WhatsApp (Registro Inicial)
                    </Label>
                    <Textarea
                      rows={2}
                      value={formData.mensaje_whatsapp}
                      onChange={(e) => setFormData((prev) => ({ ...prev, mensaje_whatsapp: e.target.value }))}
                      className="bg-white border-slate-300 text-slate-900 text-sm rounded-xl"
                    />
                  </div>

                  {/* SECCIÓN DE CHECK-IN AUTOMÁTICO POR WHATSAPP Y PDF ADJUNTO */}
                  <div className="bg-teal-50/90 p-4.5 rounded-2xl border border-teal-300 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm font-extrabold text-teal-950 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-teal-700" />
                          Enviar WhatsApp automático al hacer Check-in en Puerta
                        </Label>
                        <p className="text-xs text-teal-800 font-medium mt-0.5">
                          Envía un mensaje de bienvenida y un archivo PDF adjunto opcional cuando el escaner valida el ingreso.
                        </p>
                      </div>
                      <Switch
                        checked={formData.enviar_whatsapp_checkin}
                        onCheckedChange={(val) => setFormData((prev) => ({ ...prev, enviar_whatsapp_checkin: val }))}
                      />
                    </div>

                    {formData.enviar_whatsapp_checkin && (
                      <div className="space-y-3.5 pt-3 border-t border-teal-200/80 animate-fade-in">
                        <div>
                          <Label className="text-xs font-bold text-slate-800 mb-1 block">
                            Mensaje de Bienvenida al Ingresar (Check-in)
                          </Label>
                          <Textarea
                            rows={3}
                            placeholder="Ej: ¡Hola {nombres}! 👋 Te damos la bienvenida oficial a {evento}. Tu ingreso ha sido registrado exitosamente."
                            value={formData.mensaje_whatsapp_checkin}
                            onChange={(e) => setFormData((prev) => ({ ...prev, mensaje_whatsapp_checkin: e.target.value }))}
                            className="bg-white border-teal-300 text-slate-900 text-sm rounded-xl"
                          />
                          <p className="text-[11px] text-slate-500 mt-1">
                            Puedes usar etiquetas como: <code className="font-mono font-bold text-teal-700">{`{nombres}`}</code>, <code className="font-mono font-bold text-teal-700">{`{apellidos}`}</code>, <code className="font-mono font-bold text-teal-700">{`{evento}`}</code>.
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-800 mb-1 block">
                            URL del PDF Adjunto para el Check-in (Opcional - Guía, Programa o Material)
                          </Label>
                          <Input
                            placeholder="https://... o pega la URL pública del PDF"
                            value={formData.pdf_whatsapp_checkin_url}
                            onChange={(e) => setFormData((prev) => ({ ...prev, pdf_whatsapp_checkin_url: e.target.value }))}
                            className="bg-white border-teal-300 text-slate-900 font-mono text-xs h-10 rounded-xl"
                          />
                          <p className="text-[11px] text-slate-500 mt-1">
                            Si ingresas una URL de un PDF, la persona recibirá el enlace directo a su material de evento junto a su WhatsApp.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <Label className="text-sm font-bold text-slate-900">Invitado Obligatorio</Label>
                      <Switch
                        checked={formData.invitado_obligatorio}
                        onCheckedChange={(val) => setFormData((prev) => ({ ...prev, invitado_obligatorio: val }))}
                      />
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <Label className="text-sm font-bold text-slate-900">Requiere Check-in</Label>
                      <Switch
                        checked={formData.requiere_checkin}
                        onCheckedChange={(val) => setFormData((prev) => ({ ...prev, requiere_checkin: val }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-teal-50 p-4 rounded-xl border border-teal-200">
                    <div>
                      <Label className="text-sm font-bold text-teal-950">Evento Activo en Catálogo</Label>
                    </div>
                    <Switch
                      checked={formData.activo}
                      onCheckedChange={(val) => setFormData((prev) => ({ ...prev, activo: val }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-300 text-slate-700 font-bold px-6 py-2.5 text-sm rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveEventMutation.isPending} className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold px-8 py-2.5 text-sm sm:text-base rounded-xl shadow-md">
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
