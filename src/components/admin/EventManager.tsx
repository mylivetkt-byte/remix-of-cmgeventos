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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Calendar, MapPin, Settings, CheckCircle2, XCircle, Link as LinkIcon, Sparkles } from "lucide-react";

export const EventManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const createEventMutation = useMutation({
    mutationFn: async (newEvent: typeof formData) => {
      const slugClean = newEvent.slug.trim().toLowerCase().replace(/\s+/g, "-");
      const { data, error } = await supabase.from("events").insert({
        nombre: newEvent.nombre,
        slug: slugClean,
        descripcion: newEvent.descripcion,
        fecha_evento: newEvent.fecha_evento ? new Date(newEvent.fecha_evento).toISOString() : null,
        lugar_evento: newEvent.lugar_evento,
        logo_url: newEvent.logo_url || null,
        banner_url: newEvent.banner_url || null,
        color_primario: newEvent.color_primario,
        color_secundario: newEvent.color_secundario,
        activo: newEvent.activo,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("¡Evento creado exitosamente!");
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setIsDialogOpen(false);
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
    },
    onError: (err: any) => {
      toast.error("Error al crear evento: " + (err.message || "Verifica que el slug sea único"));
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-emerald-800/40">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Gestión de Eventos
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Crea nuevos eventos, personaliza sus enlaces de inscripción y activa o desactiva su acceso público.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950">
              <Plus className="w-4 h-4" />
              Crear Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl bg-slate-900 border-emerald-800 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-emerald-300">Nuevo Evento</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createEventMutation.mutate(formData);
              }}
              className="space-y-4 pt-4"
            >
              <div>
                <Label className="text-xs font-semibold text-slate-300">Nombre del Evento *</Label>
                <Input
                  required
                  placeholder="Ej: Retiro de Jóvenes 2026"
                  value={formData.nombre}
                  onChange={handleNameChange}
                  className="bg-slate-950 border-emerald-800 text-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-300">URL / Slug de Registro *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 bg-slate-950 px-3 py-2.5 rounded-md border border-emerald-900">/eventos/</span>
                  <Input
                    required
                    placeholder="retiro-jovenes-2026"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    className="bg-slate-950 border-emerald-800 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-300">Descripción</Label>
                <Textarea
                  placeholder="Información relevante para los asistentes..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                  className="bg-slate-950 border-emerald-800 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-300">Fecha y Hora</Label>
                  <Input
                    type="datetime-local"
                    value={formData.fecha_evento}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fecha_evento: e.target.value }))}
                    className="bg-slate-950 border-emerald-800 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-300">Lugar</Label>
                  <Input
                    placeholder="Ej: Auditorio Principal CMG"
                    value={formData.lugar_evento}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lugar_evento: e.target.value }))}
                    className="bg-slate-950 border-emerald-800 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-300">URL del Logo (Opcional)</Label>
                <Input
                  placeholder="https://..."
                  value={formData.logo_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                  className="bg-slate-950 border-emerald-800 text-white"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-emerald-900/60">
                <div>
                  <Label className="text-sm font-semibold text-slate-200">Evento Activo</Label>
                  <p className="text-xs text-slate-400">Si está activo, aparecerá en el catálogo público.</p>
                </div>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(val) => setFormData((prev) => ({ ...prev, activo: val }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-white">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500">
                  {createEventMutation.isPending ? "Guardando..." : "Crear Evento"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Cargando eventos...</div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <Card key={evt.id} className="bg-slate-900/80 border-emerald-800/40 text-white flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={evt.activo ? "default" : "secondary"} className={evt.activo ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"}>
                    {evt.activo ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {evt.activo ? "Activo" : "Inactivo"}
                  </Badge>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={evt.activo}
                      onCheckedChange={(val) => toggleActiveMutation.mutate({ id: evt.id, activo: val })}
                    />
                  </div>
                </div>

                <CardTitle className="text-lg font-bold text-emerald-200">{evt.nombre}</CardTitle>
                <CardDescription className="text-xs text-slate-400 line-clamp-2">
                  {evt.descripcion || "Sin descripción"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-emerald-400 font-mono">/eventos/{evt.slug}</span>
                </div>
                {evt.fecha_evento && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{new Date(evt.fecha_evento).toLocaleDateString("es-ES")}</span>
                  </div>
                )}
                {evt.lugar_evento && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{evt.lugar_evento}</span>
                  </div>
                )}
              </CardContent>

              <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 rounded-b-xl flex items-center justify-between">
                <a
                  href={`/eventos/${evt.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  Abrir enlace público
                  <LinkIcon className="w-3 h-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
          No hay eventos creados. ¡Crea el primero usando el botón superior!
        </div>
      )}
    </div>
  );
};
