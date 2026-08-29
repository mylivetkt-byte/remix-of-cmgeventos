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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Calendar, MapPin, CheckCircle2, XCircle, ExternalLink, Sparkles, Pencil, Trash2, Upload, Image as ImageIcon } from "lucide-react";

export const EventManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

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
  });

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
    });
  };

  const handleEditClick = (evt: EventItem) => {
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
      slug: evt.slug || "",
      descripcion: evt.descripcion || "",
      fecha_evento: dateVal,
      lugar_evento: evt.lugar_evento || "",
      logo_url: evt.logo_url || "",
      banner_url: evt.banner_url || "",
      color_primario: evt.color_primario || "#083E30",
      color_secundario: evt.color_secundario || "#CFAA37",
      activo: evt.activo ?? true,
    });
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

  const saveEventMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const slugClean = data.slug.trim().toLowerCase().replace(/\s+/g, "-");
      const payload = {
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
      };

      if (editingEventId) {
        const { error } = await supabase.from("events").update(payload).eq("id", editingEventId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingEventId ? "¡Evento actualizado exitosamente!" : "¡Evento creado exitosamente!");
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
    setFormData((prev) => ({
      ...prev,
      nombre: val,
      slug: prev.slug === "" || prev.slug === generateSlug(prev.nombre) ? generateSlug(val) : prev.slug,
    }));
  };

  return (
    <div className="space-y-6 text-emerald-950 font-sans">
      {/* Banner Superior Admin */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-white/80 shadow-md">
        <div>
          <h2 className="text-2xl font-bold font-heading text-emerald-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600" />
            Gestión de Eventos
          </h2>
          <p className="text-xs text-emerald-800 mt-1 font-medium">
            Crea, edita y administra los eventos disponibles y sus formularios de registro.
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
          <DialogContent className="max-w-xl bg-white border border-emerald-200 text-emerald-950 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading text-emerald-900">
                {editingEventId ? "Editar Evento" : "Nuevo Evento"}
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEventMutation.mutate(formData);
              }}
              className="space-y-4 pt-2 text-xs"
            >
              <div>
                <Label className="text-xs font-semibold text-emerald-900 mb-1 block">Nombre del Evento *</Label>
                <Input
                  required
                  placeholder="Ej: Retiro de Jóvenes 2026"
                  value={formData.nombre}
                  onChange={handleNameChange}
                  className="bg-white border-emerald-300 text-emerald-950 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-emerald-900 mb-1 block">URL / Slug de Registro *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 font-mono">/eventos/</span>
                  <Input
                    required
                    placeholder="retiro-jovenes-2026"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    className="bg-white border-emerald-300 text-emerald-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-emerald-900 mb-1 block">Descripción</Label>
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

              {/* Cargar Logo desde archivo local */}
              <div className="space-y-2 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <Label className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-700" />
                  Logo del Evento (Subir archivo local)
                </Label>

                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "logo")}
                    className="bg-white border-emerald-300 text-xs text-emerald-950 file:bg-emerald-100 file:text-emerald-900 file:border-0 file:rounded-md file:px-2 file:py-1 hover:file:bg-emerald-200 cursor-pointer"
                  />
                </div>

                {logoPreview && (
                  <div className="flex items-center gap-2 pt-2">
                    <img src={logoPreview} alt="Logo Preview" className="h-12 w-auto max-w-[120px] object-contain rounded border border-emerald-200 bg-white p-1" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setLogoPreview(null); setFormData(p => ({ ...p, logo_url: "" })); }} className="text-red-600 text-xs">
                      Quitar
                    </Button>
                  </div>
                )}
              </div>

              {/* Cargar Banner desde archivo local */}
              <div className="space-y-2 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <Label className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  Banner / Portada (Subir archivo local)
                </Label>

                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "banner")}
                    className="bg-white border-emerald-300 text-xs text-emerald-950 file:bg-emerald-100 file:text-emerald-900 file:border-0 file:rounded-md file:px-2 file:py-1 hover:file:bg-emerald-200 cursor-pointer"
                  />
                </div>

                {bannerPreview && (
                  <div className="flex items-center gap-2 pt-2">
                    <img src={bannerPreview} alt="Banner Preview" className="h-16 w-32 object-cover rounded border border-emerald-200" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setBannerPreview(null); setFormData(p => ({ ...p, banner_url: "" })); }} className="text-red-600 text-xs">
                      Quitar
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
                <div>
                  <Label className="text-xs font-semibold text-emerald-950">Evento Activo</Label>
                  <p className="text-[11px] text-emerald-700">Si está activo, aparecerá en el catálogo público.</p>
                </div>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(val) => setFormData((prev) => ({ ...prev, activo: val }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-emerald-100">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-emerald-300 text-emerald-900">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveEventMutation.isPending} className="bg-emerald-800 hover:bg-emerald-900 text-white">
                  {saveEventMutation.isPending ? "Guardando..." : editingEventId ? "Actualizar Evento" : "Crear Evento"}
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
                  <Badge variant={evt.activo ? "default" : "secondary"} className={evt.activo ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-700"}>
                    {evt.activo ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {evt.activo ? "Activo" : "Inactivo"}
                  </Badge>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(evt)}
                      className="h-8 w-8 text-emerald-800 hover:bg-emerald-100"
                      title="Editar evento"
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
                          <AlertDialogTitle className="text-emerald-950 font-heading">¿Eliminar este evento?</AlertDialogTitle>
                          <AlertDialogDescription className="text-emerald-800 text-xs">
                            Se eliminará el evento <strong>{evt.nombre}</strong>. Esta acción no se puede deshacer.
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
                  <Pencil className="w-3 h-3 mr-1" /> Editar
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
