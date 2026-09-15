import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Trash2, Upload, Building2, Inbox, RefreshCw } from "lucide-react";

interface Solicitud {
  id: string;
  nombre: string;
  telefono: string;
  correo: string | null;
  organizacion: string | null;
  tipo_evento: string | null;
  fecha_evento: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  num_asistentes: number | null;
  mensaje: string | null;
  estado: string;
  created_at: string;
}

const emptyConfig = {
  id: "",
  activo: true,
  titulo: "Alquiler del Auditorio",
  subtitulo: "",
  descripcion: "",
  precio: "",
  moneda: "COP",
  mostrar_precio: true,
  texto_tarifas: "",
  condiciones: "",
  capacidad: "",
  direccion: "",
  telefono_contacto: "",
  correo_contacto: "",
};

export const AuditorioManager = () => {
  const [cfg, setCfg] = useState({ ...emptyConfig });
  const [fotos, setFotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  const cargar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("auditorio_config")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCfg({
        id: data.id,
        activo: data.activo,
        titulo: data.titulo || "",
        subtitulo: data.subtitulo || "",
        descripcion: data.descripcion || "",
        precio: data.precio != null ? String(data.precio) : "",
        moneda: data.moneda || "COP",
        mostrar_precio: data.mostrar_precio,
        texto_tarifas: data.texto_tarifas || "",
        condiciones: data.condiciones || "",
        capacidad: data.capacidad || "",
        direccion: data.direccion || "",
        telefono_contacto: data.telefono_contacto || "",
        correo_contacto: data.correo_contacto || "",
      });
      setFotos(Array.isArray(data.fotos) ? (data.fotos as unknown as string[]) : []);
    }

    const { data: sols } = await supabase
      .from("auditorio_solicitudes")
      .select("*")
      .order("created_at", { ascending: false });
    setSolicitudes((sols as Solicitud[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async (fotosOverride?: string[]) => {
    setSaving(true);
    const payload = {
      activo: cfg.activo,
      titulo: cfg.titulo.trim() || "Alquiler del Auditorio",
      subtitulo: cfg.subtitulo.trim() || null,
      descripcion: cfg.descripcion.trim() || null,
      precio: cfg.precio ? Number(cfg.precio) : null,
      moneda: cfg.moneda || "COP",
      mostrar_precio: cfg.mostrar_precio,
      texto_tarifas: cfg.texto_tarifas.trim() || null,
      condiciones: cfg.condiciones.trim() || null,
      capacidad: cfg.capacidad.trim() || null,
      direccion: cfg.direccion.trim() || null,
      telefono_contacto: cfg.telefono_contacto.trim() || null,
      correo_contacto: cfg.correo_contacto.trim() || null,
      fotos: (fotosOverride ?? fotos) as any,
    };

    let error;
    if (cfg.id) {
      ({ error } = await supabase.from("auditorio_config").update(payload).eq("id", cfg.id));
    } else {
      const res = await supabase.from("auditorio_config").insert([payload]).select().single();
      error = res.error;
      if (res.data) setCfg((p) => ({ ...p, id: res.data.id }));
    }

    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
    } else {
      toast.success("Información del auditorio guardada");
    }
  };

  const subirFotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const nuevas: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `auditorio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("invitations").upload(path, file, {
          contentType: file.type,
          upsert: true,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("invitations").getPublicUrl(path);
        nuevas.push(data.publicUrl);
      }
      const actualizadas = [...fotos, ...nuevas];
      setFotos(actualizadas);
      await guardar(actualizadas);
      toast.success(`${nuevas.length} foto(s) subida(s)`);
    } catch (err: any) {
      toast.error("Error al subir las fotos", { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const quitarFoto = async (url: string) => {
    const actualizadas = fotos.filter((f) => f !== url);
    setFotos(actualizadas);
    await guardar(actualizadas);
  };

  const cambiarEstado = async (id: string, estado: string) => {
    const { error } = await supabase.from("auditorio_solicitudes").update({ estado }).eq("id", id);
    if (error) return toast.error("No se pudo actualizar");
    setSolicitudes((prev) => prev.map((s) => (s.id === id ? { ...s, estado } : s)));
  };

  const eliminar = async (id: string) => {
    const { error } = await supabase.from("auditorio_solicitudes").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    setSolicitudes((prev) => prev.filter((s) => s.id !== id));
    toast.success("Solicitud eliminada");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-amber-600" /> Alquiler del Auditorio
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="aud_activo" className="text-xs font-semibold">Mostrar en la página</Label>
            <Switch
              id="aud_activo"
              checked={cfg.activo}
              onCheckedChange={(v) => setCfg((p) => ({ ...p, activo: v }))}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={cfg.titulo} onChange={(e) => setCfg((p) => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Subtítulo</Label>
              <Input value={cfg.subtitulo} onChange={(e) => setCfg((p) => ({ ...p, subtitulo: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={4} value={cfg.descripcion} onChange={(e) => setCfg((p) => ({ ...p, descripcion: e.target.value }))} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Precio</Label>
              <Input type="number" value={cfg.precio} onChange={(e) => setCfg((p) => ({ ...p, precio: e.target.value }))} placeholder="Ej: 500000" />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Input value={cfg.moneda} onChange={(e) => setCfg((p) => ({ ...p, moneda: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Capacidad</Label>
              <Input value={cfg.capacidad} onChange={(e) => setCfg((p) => ({ ...p, capacidad: e.target.value }))} placeholder="Ej: 300 personas" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="aud_precio"
              checked={cfg.mostrar_precio}
              onCheckedChange={(v) => setCfg((p) => ({ ...p, mostrar_precio: v }))}
            />
            <Label htmlFor="aud_precio" className="text-sm">Mostrar el precio públicamente</Label>
          </div>

          <div className="space-y-1.5">
            <Label>Texto de tarifas</Label>
            <Textarea rows={3} value={cfg.texto_tarifas} onChange={(e) => setCfg((p) => ({ ...p, texto_tarifas: e.target.value }))} placeholder="Ej: Media jornada $300.000 · Jornada completa $500.000" />
          </div>

          <div className="space-y-1.5">
            <Label>Condiciones / notas del formulario</Label>
            <Textarea rows={3} value={cfg.condiciones} onChange={(e) => setCfg((p) => ({ ...p, condiciones: e.target.value }))} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input value={cfg.direccion} onChange={(e) => setCfg((p) => ({ ...p, direccion: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono de contacto</Label>
              <Input value={cfg.telefono_contacto} onChange={(e) => setCfg((p) => ({ ...p, telefono_contacto: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Correo de contacto</Label>
              <Input value={cfg.correo_contacto} onChange={(e) => setCfg((p) => ({ ...p, correo_contacto: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fotos del auditorio</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {fotos.map((url) => (
                <div key={url} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-4/3">
                  <img src={url} alt="Foto del auditorio" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => quitarFoto(url)}
                    className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-lg p-1.5 opacity-90"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <label className="aspect-4/3 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-500 hover:border-teal-500 hover:text-teal-700 text-xs font-semibold">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span>Subir fotos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => subirFotos(e.target.files)}
                />
              </label>
            </div>
          </div>

          <Button onClick={() => guardar()} disabled={saving} className="bg-teal-700 hover:bg-teal-800">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Inbox className="w-5 h-5 text-teal-700" /> Solicitudes de alquiler
            <Badge variant="outline">{solicitudes.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={cargar}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Actualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {solicitudes.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Aún no hay solicitudes.</p>
          ) : (
            solicitudes.map((s) => (
              <div key={s.id} className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-white">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-slate-900">{s.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {s.telefono}{s.correo ? ` · ${s.correo}` : ""}{s.organizacion ? ` · ${s.organizacion}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.estado}
                      onChange={(e) => cambiarEstado(s.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-semibold"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="contactado">Contactado</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="rechazado">Rechazado</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={() => eliminar(s.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-slate-700 grid sm:grid-cols-2 gap-1">
                  {s.tipo_evento && <span>Tipo: {s.tipo_evento}</span>}
                  {s.fecha_evento && <span>Fecha: {s.fecha_evento}</span>}
                  {(s.hora_inicio || s.hora_fin) && <span>Horario: {s.hora_inicio || "?"} - {s.hora_fin || "?"}</span>}
                  {s.num_asistentes != null && <span>Asistentes: {s.num_asistentes}</span>}
                </div>
                {s.mensaje && <p className="text-sm text-slate-600 whitespace-pre-line">{s.mensaje}</p>}
                <p className="text-[11px] text-slate-400">
                  Recibida: {new Date(s.created_at).toLocaleString("es-CO")}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditorioManager;
