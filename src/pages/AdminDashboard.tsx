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
import { LogOut, Users, Settings, List, Search, Download, QrCode, Trash2, Trash, Pencil, MessageCircle, Mail, UserCheck, UserX, RefreshCw, LayoutDashboard } from "lucide-react";
import { CatalogManager } from "@/components/admin/CatalogManager";
import { EventConfigManager } from "@/components/admin/EventConfigManager";
import { AttendanceReport } from "@/components/admin/AttendanceReport";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { WhatsAppManager } from "@/components/admin/WhatsAppManager";
import { useCatalog } from "@/hooks/useCatalogs";
import { toast } from "sonner";

type Tab = "registros" | "asistencia" | "catalogos" | "config" | "whatsapp" | "dashboard";

function csvCell(val: unknown): string {
  const str = val == null ? "" : String(val);
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function buildCSV(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvCell).join(";"), ...rows.map((r) => r.map(csvCell).join(";"))].join("\n");
}
function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const HEADERS = [
  "NOMBRES", "APELLIDOS", "EDAD", "DOC_ID", "NUM_DOC",
  "TELEFONO", "CORREO", "DIRECCION", "BARRIO", "FECHA_NACIMIENTO",
  "EST_CIVIL", "SEXO", "RED", "CDP", "INVITADO_POR", "ASISTIO", "FECHA_REGISTRO",
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
  const [regenerating, setRegenerating] = useState(false);

  const reds      = useCatalog("catalog_red");
  const cdps      = useCatalog("catalog_cdp");
  const tiposDocs = useCatalog("catalog_tipo_documento");
  const estadosCiviles = useCatalog("catalog_estado_civil");
  const sexos     = useCatalog("catalog_sexo");

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
      nombres:          r.nombres          ?? "",
      apellidos:        r.apellidos        ?? "",
      telefono:         r.telefono         ?? "",
      correo:           r.correo           ?? "",
      direccion:        r.direccion        ?? "",
      barrio:           r.barrio           ?? "",
      numero_documento: r.numero_documento ?? "",
      fecha_nacimiento: r.fecha_nacimiento ?? "",
      nombre_invitador: r.nombre_invitador ?? "",
      red_id:           r.red_id           ?? "",
      cdp_id:           r.cdp_id           ?? "",
      tipo_documento_id: r.tipo_documento_id ?? "",
      estado_civil_id:  r.estado_civil_id  ?? "",
      sexo_id:          r.sexo_id          ?? "",
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

  // Reenviar Email
  const resendEmail = async (r: any) => {
    try {
      const { error } = await supabase.functions.invoke("send-brevo-email", {
        body: { registrationId: r.id },
      });
      if (error) toast.error("Error al reenviar: " + error.message);
      else toast.success(`Email reenviado a ${r.correo}`);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  // Check-in manual
  const checkInManual = async (r: any) => {
    const yaAsistio = r.asistio;
    const { error } = await supabase
      .from("registrations")
      .update({
        asistio: !yaAsistio,
        fecha_asistencia: !yaAsistio ? new Date().toISOString() : null,
      })
      .eq("id", r.id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success(!yaAsistio ? `✅ Check-in registrado para ${r.nombres}` : `↩️ Check-in revertido para ${r.nombres}`);
    refresh();
  };

  // Reenviar WhatsApp
  const sendWhatsApp = async (r: any) => {
    try {
      const { data: waUrl }   = await supabase.from("app_secrets").select("value").eq("key", "WA_SERVER_URL").maybeSingle();
      const { data: waToken } = await supabase.from("app_secrets").select("value").eq("key", "WA_API_TOKEN").maybeSingle();

      if (!waUrl?.value || !waToken?.value) {
        toast.error("Servidor WhatsApp no configurado. Ve a la pestaña WhatsApp.");
        return;
      }
      if (!r.telefono) {
        toast.error("Este registro no tiene teléfono");
        return;
      }

      const downloadUrl = r.pdf_url || `${window.location.origin}/descargar/${r.id}`;

      // Obtener config del evento
      const { data: evConfig } = await supabase
        .from("event_config")
        .select("nombre_evento, fecha_evento, lugar_evento")
        .limit(1)
        .single();

      const eventName  = evConfig?.nombre_evento || "Evento";
      const eventPlace = evConfig?.lugar_evento  || "";
      const eventDate  = evConfig?.fecha_evento
        ? new Date(evConfig.fecha_evento).toLocaleDateString("es-CO", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })
        : "";
      const eventTime = evConfig?.fecha_evento
        ? new Date(evConfig.fecha_evento).toLocaleTimeString("es-CO", {
            hour: "2-digit", minute: "2-digit",
          })
        : "";

      const lines = [
        `🎉 *${eventName.toUpperCase()}*`,
        ``,
        `Hola *${r.nombres} ${r.apellidos}*,`,
        `¡Tu invitación está lista! 🎊`,
        ``,
      ];
      if (eventDate)  lines.push(`📅 *Fecha:* ${eventDate}${eventTime ? " · " + eventTime : ""}`);
      if (eventPlace) lines.push(`📍 *Lugar:* ${eventPlace}`);
      lines.push(``, `📄 *Descarga tu invitación:*`, downloadUrl);
      const message = lines.join("\n");

      const res = await fetch(`${waUrl.value}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${waToken.value}`,
        },
        body: JSON.stringify({ phone: r.telefono, message }),
      });

      const data = await res.json();
      if (res.ok) toast.success(`WhatsApp enviado a ${r.telefono}`);
      else toast.error("Error: " + (data.error || "No se pudo enviar"));
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  // Regenerar todos los PDFs
  const regenerateAllPDFs = async () => {
    if (data.length === 0) return;
    setRegenerating(true);
    let success = 0;
    let failed = 0;
    for (const r of data) {
      try {
        const { error } = await supabase.functions.invoke("generate-invitation", {
          body: { registrationId: r.id },
        });
        if (error) failed++;
        else success++;
      } catch {
        failed++;
      }
    }
    setRegenerating(false);
    toast.success(`PDFs regenerados: ${success} exitosos, ${failed} fallidos`);
    refresh();
  };

  const getRow = (r: typeof data[0]) => [
    r.nombres,
    r.apellidos,
    r.edad,
    (r as any).catalog_tipo_documento?.nombre ?? "",
    r.numero_documento,
    r.telefono,
    r.correo,
    r.direccion,
    r.barrio,
    r.fecha_nacimiento,
    (r as any).catalog_estado_civil?.nombre ?? "",
    (r as any).catalog_sexo?.nombre ?? "",
    (r as any).catalog_red?.nombre ?? "",
    (r as any).catalog_cdp?.nombre ?? "",
    r.nombre_invitador ?? "",
    r.asistio ? "SÍ" : "NO",
    new Date(r.created_at).toLocaleString("es-CO"),
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
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

                {data.length > 0 && (
                  <Button variant="outline" size="sm" onClick={regenerateAllPDFs} disabled={regenerating}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${regenerating ? "animate-spin" : ""}`} />
                    {regenerating ? "Regenerando..." : "Regenerar PDFs"}
                  </Button>
                )}

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

            {/* Tarjetas de registros */}
            <div className="space-y-3">
              {data.map((r) => {
                const initials = `${r.nombres?.[0] ?? ""}${r.apellidos?.[0] ?? ""}`.toUpperCase();
                const cdp      = (r as any).catalog_cdp?.nombre;
                const red      = (r as any).catalog_red?.nombre;
                const sexo     = (r as any).catalog_sexo?.nombre;
                const ecivil   = (r as any).catalog_estado_civil?.nombre;
                const tdoc     = (r as any).catalog_tipo_documento?.nombre;
                const avatarColors = ["#16a34a","#0d9488","#2563eb","#7c3aed","#dc2626","#ea580c","#ca8a04","#0891b2"];
                const avatarColor  = avatarColors[(r.nombres?.charCodeAt(0) ?? 0) % avatarColors.length];

                return (
                  <div key={r.id}
                    className={`rounded-2xl overflow-hidden shadow-md transition-all duration-200
                      ${r.asistio
                        ? "bg-gradient-to-r from-green-900/40 to-green-800/20 border border-green-500/40"
                        : "bg-gradient-to-r from-slate-800/80 to-slate-700/40 border border-slate-600/40 hover:border-slate-500/60 hover:shadow-lg"
                      }`}>

                    {/* Franja superior de color */}
                    <div className="h-1 w-full" style={{ backgroundColor: avatarColor }} />

                    <div className="p-4">
                      <div className="flex items-start gap-4">

                        {/* Avatar grande */}
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-shrink-0 shadow-lg"
                          style={{ backgroundColor: avatarColor }}>
                          {initials}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">

                          {/* Fila 1: nombre + asistencia */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-base text-white">{r.nombres} {r.apellidos}</span>
                            {r.asistio
                              ? <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow">
                                  <UserCheck className="w-3 h-3" /> Asistió
                                </span>
                              : <span className="inline-flex items-center gap-1 bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                                  Pendiente
                                </span>
                            }
                            <span className="text-xs text-slate-400 ml-auto">{new Date(r.created_at).toLocaleDateString("es-CO")}</span>
                          </div>

                          {/* Fila 2: contacto */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                            <span className="text-xs text-slate-300 flex items-center gap-1">📱 <span className="font-medium">{r.telefono}</span></span>
                            <span className="text-xs text-slate-300 flex items-center gap-1">🪪 {tdoc} <span className="font-medium">{r.numero_documento}</span></span>
                            <span className="text-xs text-slate-300 flex items-center gap-1 max-w-[220px] truncate">✉️ {r.correo}</span>
                          </div>

                          {/* Fila 3: datos personales */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                            {r.edad && <span className="text-xs text-slate-400">🎂 <span className="text-slate-200">{r.edad} años</span></span>}
                            {sexo   && <span className="text-xs text-slate-400">⚧ <span className="text-slate-200">{sexo}</span></span>}
                            {ecivil && <span className="text-xs text-slate-400">💍 <span className="text-slate-200">{ecivil}</span></span>}
                            {r.barrio && <span className="text-xs text-slate-400">📍 <span className="text-slate-200">{r.barrio}</span></span>}
                          </div>

                          {/* Fila 4: CDP, RED, invitador + botones a la derecha */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {cdp && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                                style={{ backgroundColor: "#1e3a5f", color: "#60a5fa", border: "1px solid #2563eb55" }}>
                                🏠 {cdp}
                              </span>
                            )}
                            {red && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                                style={{ backgroundColor: "#3b1f5e", color: "#c084fc", border: "1px solid #7c3aed55" }}>
                                🌐 {red}
                              </span>
                            )}
                            {r.nombre_invitador && (
                              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                                style={{ backgroundColor: "#1c3a2e", color: "#6ee7b7", border: "1px solid #16a34a44" }}>
                                👤 {r.nombre_invitador}
                              </span>
                            )}
                            {/* Botones al final de la fila */}
                            <div className="ml-auto flex gap-1.5 flex-shrink-0">
                              <button onClick={() => openEdit(r)} title="Editar"
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => checkInManual(r)} title={r.asistio ? "Revertir asistencia" : "Marcar asistencia"}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow transition-colors
                                  ${r.asistio ? "bg-green-600 hover:bg-green-500" : "bg-slate-600 hover:bg-green-600"}`}>
                                {r.asistio ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => resendEmail(r)} title="Reenviar correo"
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-600 hover:bg-amber-500 text-white shadow transition-colors">
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => sendWhatsApp(r)} title="Reenviar WhatsApp"
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors">
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button title="Eliminar"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-700 hover:bg-red-600 text-white shadow transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminará el registro de <strong>{r.nombres} {r.apellidos}</strong>. No se puede deshacer.
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
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!data.length && (
                <div className="text-center text-slate-400 py-16 rounded-2xl border border-slate-700 bg-slate-800/30">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay registros aún</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "dashboard" && (
          <div className="animate-fade-in pb-8">
            <DashboardStats />
          </div>
        )}
        {tab === "catalogos" && <CatalogManager />}
        {tab === "whatsapp" && <div className="animate-fade-in pb-8"><WhatsAppManager /></div>}
        {tab === "config" && <EventConfigManager />}
      </div>

      {/* Modal de edición */}
      <Dialog open={!!editReg} onOpenChange={(o) => !o && setEditReg(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✏️ Editar Registro — {editReg?.nombres} {editReg?.apellidos}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">

            {/* Texto simples */}
            {[
              { field: "nombres",           label: "Nombres",          span: false },
              { field: "apellidos",         label: "Apellidos",        span: false },
              { field: "telefono",          label: "Teléfono",         span: false },
              { field: "fecha_nacimiento",  label: "Fecha Nacimiento", span: false },
              { field: "numero_documento",  label: "N° Documento",     span: false },
              { field: "barrio",            label: "Barrio",           span: false },
              { field: "correo",            label: "Correo",           span: true  },
              { field: "direccion",         label: "Dirección",        span: true  },
              { field: "nombre_invitador",  label: "Invitado por",     span: true  },
            ].map(({ field, label, span }) => (
              <div key={field} className={span ? "col-span-2" : ""}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input
                  value={editForm[field] || ""}
                  onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            ))}

            {/* Selects de catálogos */}
            <div>
              <Label className="text-xs mb-1 block">Tipo Documento</Label>
              <select value={editForm.tipo_documento_id || ""} onChange={(e) => setEditForm({ ...editForm, tipo_documento_id: e.target.value })}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
                <option value="">— Seleccionar —</option>
                {tiposDocs.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Estado Civil</Label>
              <select value={editForm.estado_civil_id || ""} onChange={(e) => setEditForm({ ...editForm, estado_civil_id: e.target.value })}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
                <option value="">— Seleccionar —</option>
                {estadosCiviles.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Sexo</Label>
              <select value={editForm.sexo_id || ""} onChange={(e) => setEditForm({ ...editForm, sexo_id: e.target.value })}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
                <option value="">— Seleccionar —</option>
                {sexos.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">RED</Label>
              <select value={editForm.red_id || ""} onChange={(e) => setEditForm({ ...editForm, red_id: e.target.value })}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
                <option value="">— Seleccionar —</option>
                {reds.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Casa de Paz (CDP)</Label>
              <select value={editForm.cdp_id || ""} onChange={(e) => setEditForm({ ...editForm, cdp_id: e.target.value })}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
                <option value="">— Seleccionar —</option>
                {cdps.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" onClick={() => setEditReg(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
