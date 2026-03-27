import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LogOut, Users, Settings, List, Search, Download, QrCode, Trash2, Trash, Pencil, MessageCircle } from "lucide-react";
import { CatalogManager } from "@/components/admin/CatalogManager";
import { EventConfigManager } from "@/components/admin/EventConfigManager";
import { AttendanceReport } from "@/components/admin/AttendanceReport";
import { WhatsAppManager } from "@/components/admin/WhatsAppManager";
import { useCatalog } from "@/hooks/useCatalogs";
import { toast } from "sonner";

type Tab = "registros" | "asistencia" | "catalogos" | "config" | "whatsapp";

function csvCell(val: unknown): string {
  const str = val == null ? "" : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function buildCSV(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
}
function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const HEADERS = [
  "Nombres", "Apellidos", "Fecha Nac.", "Edad", "Tipo Doc.", "N° Documento",
  "Teléfono", "Dirección", "Barrio", "Correo", "Estado Civil", "Sexo",
  "CDP", "RED", "Nombre Invitador", "Fecha Registro",
];

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("registros");
  const [search, setSearch] = useState("");
  const [filterRed, setFilterRed] = useState<string>("all");
  const [filterCdp, setFilterCdp] = useState<string>("all");
  const [editReg, setEditReg] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const reds = useCatalog("catalog_red");
  const cdps = useCatalog("catalog_cdp");

  const registrations = useQuery({
    queryKey: ["admin_registrations", search, filterRed, filterCdp],
    queryFn: async () => {
      let q = supabase.from("registrations").select(`
        *, catalog_tipo_documento(nombre), catalog_estado_civil(nombre),
        catalog_sexo(nombre), catalog_cdp(nombre), catalog_red(nombre)
      `).order("created_at", { ascending: false });
      if (search) q = q.or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%,numero_documento.ilike.%${search}%,correo.ilike.%${search}%`);
      if (filterRed !== "all") q = q.eq("red_id", filterRed);
      if (filterCdp !== "all") q = q.eq("cdp_id", filterCdp);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const data = registrations.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin_registrations"] });

  // Eliminar uno
  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("registrations").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar: " + error.message); return; }
    toast.success("Registro eliminado");
    refresh();
  };

  // Eliminar todos
  const deleteAll = async () => {
    const { error } = await supabase.from("registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Error al eliminar: " + error.message); return; }
    toast.success("Todos los registros eliminados");
    refresh();
  };

  // Abrir edición
  const openEdit = (r: any) => {
    setEditReg(r);
    setEditForm({
      nombres: r.nombres,
      apellidos: r.apellidos,
      telefono: r.telefono,
      correo: r.correo,
      direccion: r.direccion,
      barrio: r.barrio,
      nombre_invitador: r.nombre_invitador || "",
    });
  };

  // Guardar edición
  const saveEdit = async () => {
    if (!editReg) return;
    setSaving(true);
    const { error } = await supabase.from("registrations").update(editForm).eq("id", editReg.id);
    setSaving(false);
    if (error) { toast.error("Error al guardar: " + error.message); return; }
    toast.success("Registro actualizado");
    setEditReg(null);
    refresh();
  };

  const getRow = (r: typeof data[0]) => [
    r.nombres, r.apellidos, r.fecha_nacimiento, r.edad,
    (r as any).catalog_tipo_documento?.nombre ?? "",
    r.numero_documento, r.telefono, r.direccion, r.barrio, r.correo,
    (r as any).catalog_estado_civil?.nombre ?? "",
    (r as any).catalog_sexo?.nombre ?? "",
    (r as any).catalog_cdp?.nombre ?? "",
    (r as any).catalog_red?.nombre ?? "",
    r.nombre_invitador ?? "",
    new Date(r.created_at).toLocaleString(),
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "registros", label: "Registros", icon: <Users className="w-4 h-4" /> },
    { id: "asistencia", label: "Asistencia", icon: <QrCode className="w-4 h-4" /> },
    { id: "catalogos", label: "Catálogos", icon: <List className="w-4 h-4" /> },
    { id: "config", label: "Configuración", icon: <Settings className="w-4 h-4" /> },
    { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <h1 className="font-heading font-bold text-lg">Panel Admin</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Salir
          </Button>
        </div>
      </header>

      <div className="container mt-4">
        <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-lg mb-4">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                tab === t.id ? "bg-white/10 text-foreground shadow-sm border border-white/20" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === "asistencia" && <div className="animate-fade-in pb-8"><AttendanceReport /></div>}

        {tab === "registros" && (
          <div className="space-y-4 animate-fade-in pb-8">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre, documento, correo..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterRed} onValueChange={setFilterRed}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por RED" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las RED</SelectItem>
                  {reds.data?.map((r) => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCdp} onValueChange={setFilterCdp}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por CDP" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los CDP</SelectItem>
                  {cdps.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Stats, exports y eliminar todos */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{data.length} registro(s)</span>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => downloadCSV(buildCSV(HEADERS, data.map(getRow)), "registros.csv")}>
                  <Download className="w-4 h-4 mr-1" /> Registros (.csv)
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const map: Record<string, number> = {};
                  data.forEach((r) => { const k = (r as any).catalog_cdp?.nombre ?? "Sin CDP"; map[k] = (map[k] ?? 0) + 1; });
                  downloadCSV(buildCSV(["CDP", "Total"], Object.entries(map).sort((a, b) => b[1] - a[1])), "consolidado_cdp.csv");
                }}>
                  <Download className="w-4 h-4 mr-1" /> Por CDP
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const map: Record<string, number> = {};
                  data.forEach((r) => { const k = (r as any).catalog_red?.nombre ?? "Sin RED"; map[k] = (map[k] ?? 0) + 1; });
                  downloadCSV(buildCSV(["RED", "Total"], Object.entries(map).sort((a, b) => b[1] - a[1])), "consolidado_red.csv");
                }}>
                  <Download className="w-4 h-4 mr-1" /> Por RED
                </Button>

                {/* Eliminar todos */}
                {data.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash className="w-4 h-4 mr-1" /> Eliminar todos
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar todos los registros?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará <strong>{data.length} registros</strong> permanentemente. No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteAll} className="bg-destructive text-white hover:bg-destructive/90">
                          Sí, eliminar todos
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* Tabla */}
            <div className="rounded-lg border border-white/10 overflow-x-auto bg-white/5">
              <Table className="text-xs min-w-[1500px]">
                <TableHeader>
                  <TableRow className="bg-white/5 border-b border-white/10">
                    <TableHead className="whitespace-nowrap w-20">Acciones</TableHead>
                    <TableHead className="whitespace-nowrap">Nombres</TableHead>
                    <TableHead className="whitespace-nowrap">Apellidos</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha Nac.</TableHead>
                    <TableHead className="whitespace-nowrap">Edad</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo Doc.</TableHead>
                    <TableHead className="whitespace-nowrap">N° Documento</TableHead>
                    <TableHead className="whitespace-nowrap">Teléfono</TableHead>
                    <TableHead className="whitespace-nowrap">Dirección</TableHead>
                    <TableHead className="whitespace-nowrap">Barrio</TableHead>
                    <TableHead className="whitespace-nowrap">Correo</TableHead>
                    <TableHead className="whitespace-nowrap">Estado Civil</TableHead>
                    <TableHead className="whitespace-nowrap">Sexo</TableHead>
                    <TableHead className="whitespace-nowrap">CDP</TableHead>
                    <TableHead className="whitespace-nowrap">RED</TableHead>
                    <TableHead className="whitespace-nowrap">Invitador</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Editar */}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)} title="Editar">
                            <Pencil className="w-3 h-3 text-blue-400" />
                          </Button>
                          {/* Eliminar */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Eliminar">
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará el registro de <strong>{r.nombres} {r.apellidos}</strong>. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteOne(r.id)} className="bg-destructive text-white hover:bg-destructive/90">
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{r.nombres}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.apellidos}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.fecha_nacimiento}</TableCell>
                      <TableCell>{r.edad}</TableCell>
                      <TableCell className="whitespace-nowrap">{(r as any).catalog_tipo_documento?.nombre}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.numero_documento}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.telefono}</TableCell>
                      <TableCell className="max-w-[160px] truncate" title={r.direccion}>{r.direccion}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.barrio}</TableCell>
                      <TableCell className="max-w-[160px] truncate" title={r.correo}>{r.correo}</TableCell>
                      <TableCell className="whitespace-nowrap">{(r as any).catalog_estado_civil?.nombre}</TableCell>
                      <TableCell className="whitespace-nowrap">{(r as any).catalog_sexo?.nombre}</TableCell>
                      <TableCell className="whitespace-nowrap">{(r as any).catalog_cdp?.nombre}</TableCell>
                      <TableCell className="whitespace-nowrap">{(r as any).catalog_red?.nombre}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.nombre_invitador ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {!data.length && (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center text-muted-foreground py-8">
                        No hay registros aún
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {tab === "catalogos" && <CatalogManager />}
        {tab === "whatsapp" && <div className="animate-fade-in pb-8"><WhatsAppManager /></div>}
        {tab === "config" && <EventConfigManager />}
      </div>

      {/* Modal de edición */}
      <Dialog open={!!editReg} onOpenChange={(o) => !o && setEditReg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {[
              { field: "nombres", label: "Nombres" },
              { field: "apellidos", label: "Apellidos" },
              { field: "telefono", label: "Teléfono" },
              { field: "correo", label: "Correo" },
              { field: "direccion", label: "Dirección" },
              { field: "barrio", label: "Barrio" },
              { field: "nombre_invitador", label: "Nombre Invitador" },
            ].map(({ field, label }) => (
              <div key={field} className={field === "direccion" || field === "correo" ? "col-span-2" : ""}>
                <Label className="text-xs mb-1">{label}</Label>
                <Input value={editForm[field] || ""} onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditReg(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
