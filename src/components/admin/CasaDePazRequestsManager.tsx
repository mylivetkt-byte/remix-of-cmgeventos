import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Download, MessageCircle, Home, RefreshCw, Trash2, CheckCircle2, Clock, Phone, MapPin, Mail, User } from "lucide-react";
import { toast } from "sonner";

export interface CasaDePazSolicitud {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  barrio: string;
  correo?: string;
  estado?: string;
  notas?: string;
  created_at: string;
}

export function CasaDePazRequestsManager() {
  const [solicitudes, setSolicitudes] = useState<CasaDePazSolicitud[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<CasaDePazSolicitud | null>(null);
  const [editStatus, setEditStatus] = useState<string>("pendiente");
  const [editNotas, setEditNotas] = useState<string>("");

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      // 1. Intentar cargar desde Supabase
      const { data, error } = await supabase
        .from("casa_de_paz_solicitudes" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Cargando desde localStorage como fallback:", error.message);
        const local = JSON.parse(localStorage.getItem("casa_de_paz_solicitudes") || "[]");
        setSolicitudes(local);
      } else if (data) {
        // Combinar con local si hubiese pendientes
        const local = JSON.parse(localStorage.getItem("casa_de_paz_solicitudes") || "[]");
        const combined = [...(data as unknown as CasaDePazSolicitud[])];
        local.forEach((loc: any) => {
          if (!combined.some((c) => c.id === loc.id)) {
            combined.push(loc);
          }
        });
        setSolicitudes(combined);
      }
    } catch (err) {
      console.error("Error al cargar solicitudes:", err);
      const local = JSON.parse(localStorage.getItem("casa_de_paz_solicitudes") || "[]");
      setSolicitudes(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const handleUpdateStatus = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from("casa_de_paz_solicitudes" as any)
        .update({
          estado: editStatus,
          notas: editNotas,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", editingItem.id);

      // Actualizar también local
      const local = JSON.parse(localStorage.getItem("casa_de_paz_solicitudes") || "[]");
      const updatedLocal = local.map((item: any) =>
        item.id === editingItem.id ? { ...item, estado: editStatus, notas: editNotas } : item
      );
      localStorage.setItem("casa_de_paz_solicitudes", JSON.stringify(updatedLocal));

      // Actualizar estado en memoria
      setSolicitudes((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, estado: editStatus, notas: editNotas } : item
        )
      );

      toast.success("Solicitud actualizada correctamente");
      setEditingItem(null);
    } catch (err: any) {
      toast.error("Error al actualizar la solicitud");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este contacto?")) return;

    try {
      await supabase
        .from("casa_de_paz_solicitudes" as any)
        .delete()
        .eq("id", id);

      const local = JSON.parse(localStorage.getItem("casa_de_paz_solicitudes") || "[]");
      const updatedLocal = local.filter((item: any) => item.id !== id);
      localStorage.setItem("casa_de_paz_solicitudes", JSON.stringify(updatedLocal));

      setSolicitudes((prev) => prev.filter((item) => item.id !== id));
      toast.success("Contacto eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  const handleExportCSV = () => {
    if (solicitudes.length === 0) {
      toast.error("No hay solicitudes para exportar");
      return;
    }

    const headers = ["ID", "NOMBRE", "TELEFONO", "DIRECCION", "BARRIO", "CORREO", "ESTADO", "NOTAS", "FECHA_SOLICITUD"];
    const rows = filteredSolicitudes.map((s) => [
      s.id,
      `"${s.nombre.replace(/"/g, '""')}"`,
      `"${s.telefono}"`,
      `"${s.direccion.replace(/"/g, '""')}"`,
      `"${s.barrio.replace(/"/g, '""')}"`,
      `"${(s.correo || "").replace(/"/g, '""')}"`,
      s.estado || "pendiente",
      `"${(s.notas || "").replace(/"/g, '""')}"`,
      new Date(s.created_at).toLocaleString("es-CO"),
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solicitudes_casa_de_paz_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado exitosamente a CSV");
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
    const text = encodeURIComponent(`¡Hola ${name}! Te saludamos del Centro Mundial de Gloria respecto a tu solicitud de Casa de Paz.`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, "_blank");
  };

  const filteredSolicitudes = solicitudes.filter((s) => {
    const matchSearch =
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.telefono.toLowerCase().includes(search.toLowerCase()) ||
      s.barrio.toLowerCase().includes(search.toLowerCase()) ||
      s.direccion.toLowerCase().includes(search.toLowerCase()) ||
      (s.correo && s.correo.toLowerCase().includes(search.toLowerCase()));

    const matchEstado = filterEstado === "all" || (s.estado || "pendiente") === filterEstado;

    return matchSearch && matchEstado;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Home className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Solicitudes de Casas de Paz</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Personas interesadas que diligenciaron el formulario al pie del catálogo para encontrar una Casa de Paz.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSolicitudes}
            disabled={loading}
            className="rounded-xl border-slate-200 text-slate-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, teléfono, barrio o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white rounded-xl border-slate-200"
          />
        </div>

        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-full sm:w-48 h-11 bg-white rounded-xl border-slate-200">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">⏳ Pendientes</SelectItem>
            <SelectItem value="contactado">📞 Contactados</SelectItem>
            <SelectItem value="asignado">🏠 Asignado a CDP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-slate-700">Nombre</TableHead>
                <TableHead className="font-bold text-slate-700">Teléfono</TableHead>
                <TableHead className="font-bold text-slate-700">Dirección</TableHead>
                <TableHead className="font-bold text-slate-700">Barrio</TableHead>
                <TableHead className="font-bold text-slate-700">Correo</TableHead>
                <TableHead className="font-bold text-slate-700">Estado</TableHead>
                <TableHead className="font-bold text-slate-700">Fecha</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Cargando solicitudes...
                  </TableCell>
                </TableRow>
              ) : filteredSolicitudes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    <Home className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No hay solicitudes registradas</p>
                    <p className="text-xs text-slate-400 mt-1">Los contactos enviados desde el formulario web aparecerán aquí.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSolicitudes.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-semibold text-slate-900">
                      {item.nombre}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{item.telefono}</span>
                        <button
                          onClick={() => openWhatsApp(item.telefono, item.nombre)}
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors title='Contactar por WhatsApp'"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {item.direccion}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      <Badge variant="outline" className="bg-slate-100 border-slate-200 font-semibold">
                        {item.barrio}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {item.correo || "-"}
                    </TableCell>
                    <TableCell>
                      {item.estado === "contactado" ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          📞 Contactado
                        </Badge>
                      ) : item.estado === "asignado" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          ✅ Asignado a CDP
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                          ⏳ Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setEditStatus(item.estado || "pendiente");
                            setEditNotas(item.notas || "");
                          }}
                          className="text-slate-600 hover:text-slate-900 rounded-lg text-xs"
                        >
                          Gestionar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Gestión */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Gestionar Solicitud de Casa de Paz
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-200">
                <p><strong>Nombre:</strong> {editingItem.nombre}</p>
                <p><strong>Teléfono:</strong> {editingItem.telefono}</p>
                <p><strong>Dirección:</strong> {editingItem.direccion}</p>
                <p><strong>Barrio:</strong> {editingItem.barrio}</p>
                {editingItem.correo && <p><strong>Correo:</strong> {editingItem.correo}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Estado de la Solicitud</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                    <SelectItem value="contactado">📞 Contactado</SelectItem>
                    <SelectItem value="asignado">🏠 Asignado a Casa de Paz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Notas de Seguimiento</Label>
                <Input
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  placeholder="Ej: Se le contactó y asistirá a la CDP del hermano Pedro en Barrio Centro..."
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => openWhatsApp(editingItem.telefono, editingItem.nombre)}
                  variant="outline"
                  className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl h-10 font-bold flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir Chat de WhatsApp
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingItem(null)} className="rounded-xl">
                Cancelar
              </Button>
              <Button onClick={handleUpdateStatus} className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
