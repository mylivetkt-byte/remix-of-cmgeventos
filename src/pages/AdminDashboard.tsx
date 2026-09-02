import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LogOut, Users, Settings, List, Search, Download, QrCode, Trash2, Trash, Pencil, MessageCircle, Mail, UserCheck, UserX, RefreshCw, LayoutDashboard, Sparkles, Globe, ShieldCheck, ChevronLeft, ChevronRight, ChevronDown, Menu, UserPlus, Send } from "lucide-react";
import { CatalogManager } from "@/components/admin/CatalogManager";
import { EventConfigManager } from "@/components/admin/EventConfigManager";
import { AttendanceReport } from "@/components/admin/AttendanceReport";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { WhatsAppCrm } from "@/components/admin/WhatsAppCrm";
import { WhatsAppManager } from "@/components/admin/WhatsAppManager";
import { WhatsAppChat } from "@/components/admin/chat/WhatsAppChat";
import { WhatsAppContacts, StoredContact } from "@/components/admin/WhatsAppContacts";
import { EventManager } from "@/components/admin/EventManager";
import { UserManager } from "@/components/admin/UserManager";
import { UserRole, ROLE_LABELS, ROLE_PERMISSIONS_MAP } from "@/integrations/supabase/user-role-types";
import { useCatalog } from "@/hooks/useCatalogs";
import { sendCheckInWhatsAppNotification } from "@/lib/whatsapp-bot";
import { toast } from "sonner";

type Tab = "dashboard" | "eventos" | "registros" | "asistencia" | "catalogos" | "whatsapp" | "usuarios" | "crm" | "chat" | "contactos";

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
  "EVENTO", "NOMBRES", "APELLIDOS", "EDAD", "DOC_ID", "NUM_DOC",
  "TELEFONO", "CORREO", "DIRECCION", "BARRIO", "FECHA_NACIMIENTO",
  "EST_CIVIL", "SEXO", "RED", "CDP", "INVITADO_POR", "ASISTIO", "FECHA_REGISTRO",
];

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>("super_admin");
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [filterRed, setFilterRed] = useState<string>("all");
  const [filterCdp, setFilterCdp] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [registrosSubmenuOpen, setRegistrosSubmenuOpen] = useState(true);
  const [asistenciaSubmenuOpen, setAsistenciaSubmenuOpen] = useState(true);

  const [editReg, setEditReg] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedChatContact, setSelectedChatContact] = useState<{ name: string; phone: string } | null>(null);
  const [crmContacts, setCrmContacts] = useState<any[]>([]);

  // Estados para Modal de Control de Pagos
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentReg, setPaymentReg] = useState<any>(null);
  const [paymentState, setPaymentState] = useState<string>("Pendiente");
  const [montoPagado, setMontoPagado] = useState<number>(0);
  const [montoPendiente, setMontoPendiente] = useState<number>(0);
  const [notasPago, setNotasPago] = useState<string>("");
  const [comprobanteUrl, setComprobanteUrl] = useState<string>("");
  const [savingPayment, setSavingPayment] = useState(false);

  const reds      = useCatalog("catalog_red");
  const cdps      = useCatalog("catalog_cdp");
  const tiposDocs = useCatalog("catalog_tipo_documento");
  const estadosCiviles = useCatalog("catalog_estado_civil");
  const sexos     = useCatalog("catalog_sexo");

  const allTabs: { id: Tab; label: string; icon: React.ReactNode; roles: UserRole[] }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["super_admin", "coordinador", "validador", "lider_red"] },
    { id: "eventos", label: "Eventos", icon: <Sparkles className="w-5 h-5" />, roles: ["super_admin", "coordinador"] },
    { id: "registros", label: "Registros", icon: <Users className="w-5 h-5" />, roles: ["super_admin", "coordinador", "lider_red"] },
    { id: "asistencia", label: "Asistencia", icon: <QrCode className="w-5 h-5" />, roles: ["super_admin", "coordinador"] },
    { id: "catalogos", label: "Catálogos", icon: <List className="w-5 h-5" />, roles: ["super_admin"] },
    { id: "usuarios", label: "Usuarios & Roles", icon: <ShieldCheck className="w-5 h-5" />, roles: ["super_admin"] },
    { id: "whatsapp", label: "WhatsApp & Brevo", icon: <MessageCircle className="w-5 h-5" />, roles: ["super_admin"] },
    { id: "contactos", label: "Agenda Contactos", icon: <Users className="w-5 h-5" />, roles: ["super_admin"] },
    { id: "crm", label: "Envío Masivo", icon: <Send className="w-5 h-5" />, roles: ["super_admin"] },
    { id: "chat", label: "Chat WhatsApp", icon: <MessageCircle className="w-5 h-5" />, roles: ["super_admin"] },
  ];

  // Sincronizar rol según usuario logueado
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem("cmg_admin_users");
      const list = saved ? JSON.parse(saved) : [];
      const matched = list.find((u: any) => u.email.toLowerCase() === user.email?.toLowerCase());
      if (matched) {
        setCurrentRole(matched.rol);
        const allowed = allTabs.filter((t) => t.roles.includes(matched.rol)).map((t) => t.id);
        if (!allowed.includes(tab)) {
          setTab(allowed[0] || "dashboard");
        }
      } else {
        const emailLower = user.email?.toLowerCase() || "";
        let resolvedRole: UserRole = "super_admin";
        if (emailLower.includes("coordinacion")) resolvedRole = "coordinador";
        else if (emailLower.includes("logistica")) resolvedRole = "validador";
        else if (emailLower.includes("lider")) resolvedRole = "lider_red";
        
        setCurrentRole(resolvedRole);
        const allowed = allTabs.filter((t) => t.roles.includes(resolvedRole)).map((t) => t.id);
        if (!allowed.includes(tab)) {
          setTab(allowed[0] || "dashboard");
        }
      }
    } catch (e) {}
  }, [user]);

  const currentUserObj = (() => {
    try {
      const saved = localStorage.getItem("cmg_admin_users");
      const list = saved ? JSON.parse(saved) : [];
      const found = list.find((u: any) => u.email.toLowerCase() === user?.email?.toLowerCase());
      if (found) return found;
    } catch (e) {}
    
    // Fallback con formato amigable
    let name = "Administrador";
    if (user?.email) {
      const prefix = user.email.split("@")[0] || "";
      name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return {
      nombre_completo: name,
      rol: currentRole,
      email: user?.email || "admin@cmgeventos.org",
    };
  })();

  const permissions = ROLE_PERMISSIONS_MAP[currentRole];

  const navigate = useNavigate();

  const tabs = allTabs.filter((t) => t.roles.includes(currentRole));
  const activeTabObj = allTabs.find((t) => t.id === tab);

  const eventsList = useQuery({
    queryKey: ["admin_events_filter_list"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, nombre, slug").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const registrations = useQuery({
    queryKey: ["admin_registrations", search, filterEvent, filterRed, filterCdp, filterPayment],
    queryFn: async () => {
      let q = supabase.from("registrations").select(`
        *, catalog_tipo_documento(nombre), catalog_estado_civil(nombre),
        catalog_sexo(nombre), catalog_cdp(nombre), catalog_red(nombre)
      `).order("created_at", { ascending: false });
      if (search) q = q.or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%,numero_documento.ilike.%${search}%,correo.ilike.%${search}%`);
      if (filterEvent !== "all") q = q.eq("event_id", filterEvent);
      if (filterRed !== "all") q = q.eq("red_id", filterRed);
      if (filterCdp !== "all") q = q.eq("cdp_id", filterCdp);
      if (filterPayment !== "all") q = q.eq("estado_pago", filterPayment);
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

  // Eliminar registros (delimitado por evento si hay un evento seleccionado)
  const deleteAll = async () => {
    let q = supabase.from("registrations").delete();
    if (filterEvent !== "all") {
      q = q.eq("event_id", filterEvent);
    } else {
      q = q.neq("id", "00000000-0000-0000-0000-000000000000");
    }

    const { error } = await q;
    if (error) { toast.error("Error al eliminar: " + error.message); return; }

    const activeEvtName = eventsList.data?.find((e) => e.id === filterEvent)?.nombre;
    toast.success(
      filterEvent !== "all"
        ? `Registros del evento "${activeEvtName}" eliminados con éxito`
        : "Todos los registros de todos los eventos eliminados"
    );
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
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  // Abrir Modal de Pagos
  const openPaymentModal = (r: any) => {
    setPaymentReg(r);
    const evtObj = eventsList.data?.find((e: any) => e.id === r.event_id);
    const evtPrice = (evtObj as any)?.precio || 0;
    const initialPaid = Number(r.monto_pagado || 0);
    const initialPend = Number(r.monto_pendiente ?? Math.max(0, evtPrice - initialPaid));
    
    setPaymentState(
      r.estado_pago || (initialPaid >= evtPrice && evtPrice > 0 ? "Pagado Completo" : initialPaid > 0 ? "Abonado" : "Pendiente")
    );
    setMontoPagado(initialPaid);
    setMontoPendiente(initialPend);
    setNotasPago(r.notas_pago || "");
    setComprobanteUrl(r.comprobante_pago_url || "");
    setIsPaymentModalOpen(true);
  };

  // Guardar Pago
  const handleSavePayment = async () => {
    if (!paymentReg) return;
    setSavingPayment(true);
    try {
      const { error } = await supabase
        .from("registrations")
        .update({
          estado_pago: paymentState,
          monto_pagado: Number(montoPagado),
          monto_pendiente: Number(montoPendiente),
          notas_pago: notasPago,
          comprobante_pago_url: comprobanteUrl || null,
        })
        .eq("id", paymentReg.id);

      if (error) throw error;

      toast.success(`Pago actualizado para ${paymentReg.nombres}`);
      setIsPaymentModalOpen(false);
      refresh();
    } catch (err: any) {
      toast.error("Error al guardar pago: " + err.message);
    } finally {
      setSavingPayment(false);
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

    if (!yaAsistio && r.telefono && r.event_id) {
      sendCheckInWhatsAppNotification({
        phone: r.telefono,
        nombres: r.nombres,
        apellidos: r.apellidos,
        eventId: r.event_id,
        eventName: (r as any).catalog_event?.nombre || "Evento",
      }).catch((e) => console.warn("WhatsApp checkin notification error:", e));
    }

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
    (r as any).events?.nombre ?? "Evento General",
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

  return (
    <div className="min-h-screen text-slate-900 font-sans bg-slate-50 selection:bg-teal-200 flex flex-col md:flex-row relative">
      {/* TELÓN DE FONDO (BACKDROP) MÓVIL */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* SIDEBAR LATERAL COLAPSABLE (Móvil + Desktop) */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 bg-white border-r border-slate-200/80 flex flex-col justify-between shadow-lg md:shadow-xs transition-transform md:transition-all duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-20" : "md:w-64"} w-72`}
      >
        {/* Cabecera del Sidebar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-teal-700" />
            </div>
            {(!collapsed || mobileMenuOpen) && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-heading font-black text-sm text-slate-900 tracking-tight truncate">
                    Doxa Eventos
                  </h1>
                </div>
                <p className="text-[10px] text-slate-500 font-medium truncate">Centro Mundial de Gloria</p>
              </div>
            )}
          </div>

          {/* Botón Colapsar / Expandir (O Cerrar en Móvil) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileMenuOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg shrink-0"
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Lista de Navegación de Pestañas */}
        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          {(!collapsed || mobileMenuOpen) && (
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-3.5 mb-2.5">
              Comunidad / Admin
            </p>
          )}

          {tabs.map((t) => {
            const isActive = tab === t.id;
            const isRegistros = t.id === "registros";
            const isAsistencia = t.id === "asistencia";

            if (isRegistros) {
              return (
                <div key={t.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setTab("registros");
                      setRegistrosSubmenuOpen(!registrosSubmenuOpen);
                    }}
                    title={collapsed ? t.label : undefined}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-teal-100/90 text-teal-950 shadow-xs border border-teal-200/80 font-extrabold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    } ${collapsed && !mobileMenuOpen ? "justify-center px-0" : ""}`}
                  >
                    <div className="flex items-center gap-3.5 truncate">
                      <div className={`${isActive ? "text-teal-900" : "text-slate-500"}`}>{t.icon}</div>
                      {(!collapsed || mobileMenuOpen) && <span className="truncate">{t.label}</span>}
                    </div>
                    {(!collapsed || mobileMenuOpen) && (
                      <div className="text-slate-400">
                        {registrosSubmenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    )}
                  </button>

                  {/* Sub-menú desplegable de eventos en Registros */}
                  {registrosSubmenuOpen && (!collapsed || mobileMenuOpen) && (
                    <div className="pl-6 space-y-1 border-l-2 border-teal-200/60 ml-4 py-1 animate-fade-in">
                      <button
                        onClick={() => {
                          setTab("registros");
                          setFilterEvent("all");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                          isActive && filterEvent === "all"
                            ? "bg-teal-700 text-white font-extrabold shadow-2xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>📊 Todos los Registros</span>
                      </button>

                      {eventsList.data?.map((evt) => {
                        const isEvtActive = isActive && filterEvent === evt.id;
                        return (
                          <button
                            key={evt.id}
                            onClick={() => {
                              setTab("registros");
                              setFilterEvent(evt.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-1.5 ${
                              isEvtActive
                                ? "bg-teal-700 text-white font-extrabold shadow-2xs"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span className="truncate">{evt.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (isAsistencia) {
              return (
                <div key={t.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setTab("asistencia");
                      setAsistenciaSubmenuOpen(!asistenciaSubmenuOpen);
                    }}
                    title={collapsed ? t.label : undefined}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-teal-100/90 text-teal-950 shadow-xs border border-teal-200/80 font-extrabold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    } ${collapsed && !mobileMenuOpen ? "justify-center px-0" : ""}`}
                  >
                    <div className="flex items-center gap-3.5 truncate">
                      <div className={`${isActive ? "text-teal-900" : "text-slate-500"}`}>{t.icon}</div>
                      {(!collapsed || mobileMenuOpen) && <span className="truncate">{t.label}</span>}
                    </div>
                    {(!collapsed || mobileMenuOpen) && (
                      <div className="text-slate-400">
                        {asistenciaSubmenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    )}
                  </button>

                  {/* Sub-menú desplegable de eventos en Asistencia */}
                  {asistenciaSubmenuOpen && (!collapsed || mobileMenuOpen) && (
                    <div className="pl-6 space-y-1 border-l-2 border-teal-200/60 ml-4 py-1 animate-fade-in">
                      <button
                        onClick={() => {
                          setTab("asistencia");
                          setFilterEvent("all");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                          isActive && filterEvent === "all"
                            ? "bg-teal-700 text-white font-extrabold shadow-2xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>📊 Toda la Asistencia</span>
                      </button>

                      {eventsList.data?.map((evt) => {
                        const isEvtActive = isActive && filterEvent === evt.id;
                        return (
                          <button
                            key={evt.id}
                            onClick={() => {
                              setTab("asistencia");
                              setFilterEvent(evt.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-1.5 ${
                              isEvtActive
                                ? "bg-teal-700 text-white font-extrabold shadow-2xs"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span className="truncate">{evt.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setMobileMenuOpen(false);
                }}
                title={collapsed ? t.label : undefined}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-teal-100/90 text-teal-950 shadow-xs border border-teal-200/80 font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                } ${collapsed && !mobileMenuOpen ? "justify-center px-0" : ""}`}
              >
                <div className={`${isActive ? "text-teal-900" : "text-slate-500"}`}>{t.icon}</div>
                {(!collapsed || mobileMenuOpen) && <span className="truncate">{t.label}</span>}
              </button>
            );
          })}

          <div className="pt-4 my-2 border-t border-slate-100">
            {(!collapsed || mobileMenuOpen) && (
              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-3.5 mb-2.5">
                Accesos Rápidos
              </p>
            )}

            <button
              onClick={() => {
                navigate("/");
                setMobileMenuOpen(false);
              }}
              title={collapsed ? "Sitio Público" : undefined}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all ${
                collapsed && !mobileMenuOpen ? "justify-center px-0" : ""
              }`}
            >
              <Globe className="w-5 h-5 text-teal-600 shrink-0" />
              {(!collapsed || mobileMenuOpen) && <span className="truncate">Sitio Público</span>}
            </button>

            <button
              onClick={() => {
                navigate("/checkin");
                setMobileMenuOpen(false);
              }}
              title={collapsed ? "Escáner Puerta" : undefined}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all mt-1 ${
                collapsed && !mobileMenuOpen ? "justify-center px-0" : ""
              }`}
            >
              <QrCode className="w-5 h-5 text-teal-600 shrink-0" />
              {(!collapsed || mobileMenuOpen) && <span className="truncate">Escáner Puerta</span>}
            </button>

            <a
              href="/manual-usuario.html"
              target="_blank"
              rel="noreferrer"
              title={collapsed ? "Manual Web" : undefined}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 transition-all mt-2.5 shadow-2xs ${
                collapsed && !mobileMenuOpen ? "justify-center px-0" : ""
              }`}
            >
              <Sparkles className="w-5 h-5 text-teal-700 shrink-0" />
              {(!collapsed || mobileMenuOpen) && <span className="truncate font-extrabold text-teal-950">Manual Web</span>}
            </a>
          </div>
        </div>

        {/* Footer del Sidebar (Cuenta y Salir) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={signOut}
            title={collapsed ? "Cerrar Sesión" : undefined}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all ${
              collapsed && !mobileMenuOpen ? "justify-center px-0" : ""
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0 text-red-500" />
            {(!collapsed || mobileMenuOpen) && <span className="truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className={`flex-1 transition-all duration-300 w-full ${collapsed ? "md:ml-20" : "md:ml-64"} ml-0`}>
        {/* Cabecera Superior del Área de Contenido */}
        <header className="border-b border-slate-200/80 bg-white sticky top-0 z-30 shadow-xs h-16 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Botón Menú Hamburguesa para Celulares */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden h-10 w-10 text-slate-700 hover:bg-slate-100 rounded-xl shrink-0"
              title="Abrir Menú"
            >
              <Menu className="w-5 h-5 text-teal-700" />
            </Button>

            <h2 className="font-heading font-extrabold text-base sm:text-xl text-slate-900 flex items-center gap-2 truncate">
              {activeTabObj?.icon}
              <span className="truncate">
                {activeTabObj?.label}
                {filterEvent !== "all" && (tab === "registros" || tab === "asistencia") && (
                  <span className="text-teal-700 font-extrabold ml-1">
                    · {eventsList.data?.find((e) => e.id === filterEvent)?.nombre}
                  </span>
                )}
              </span>
            </h2>
            {filterEvent !== "all" && (tab === "registros" || tab === "asistencia") ? (
              <Badge className="bg-teal-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-0.5 shrink-0 shadow-xs">
                {eventsList.data?.find((e) => e.id === filterEvent)?.nombre}
              </Badge>
            ) : (
              <Badge className="bg-teal-50 text-teal-900 border-teal-200 text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 shrink-0">
                Admin
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Distintivo de Usuario Logueado */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-2xl shadow-xs">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0 select-none">
                {currentUserObj.nombre_completo.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-black text-slate-900 leading-none">
                  {currentUserObj.nombre_completo}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-none">
                  {ROLE_LABELS[currentRole]?.label || "Super Admin"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold rounded-xl hidden md:flex items-center gap-1.5 px-3 py-2"
            >
              <Globe className="w-4 h-4 text-teal-600" /> Ver Sitio
            </Button>
          </div>
        </header>

        {/* Barra de Pestañas Deslizable Horizontal en Móviles */}
        <div className="flex md:hidden overflow-x-auto p-2.5 bg-white border-b border-slate-200 gap-1.5 scrollbar-none shadow-2xs">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Vista del Módulo Seleccionado */}
        <main className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">

        {tab === "eventos" && <div className="animate-fade-in pb-8"><EventManager /></div>}
        {tab === "asistencia" && (
          <div className="animate-fade-in pb-8">
            <AttendanceReport filterEvent={filterEvent} onFilterEventChange={setFilterEvent} />
          </div>
        )}

        {tab === "registros" && (
          <div className="space-y-4 animate-fade-in pb-8">
            {/* Cabecera del Modo Evento Aislado si aplica */}
            {filterEvent !== "all" && (
              <div className="bg-teal-700 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="text-xs sm:text-sm font-extrabold">
                    Módulo Aislado del Evento: <span className="underline underline-offset-4 font-black">{eventsList.data?.find((e) => e.id === filterEvent)?.nombre}</span>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFilterEvent("all")} className="text-white hover:bg-teal-800 text-xs font-bold px-3 py-1 rounded-xl">
                  ✕ Ver Todos los Registros
                </Button>
              </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre, documento, correo..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white border-emerald-300" />
              </div>
              <Select value={filterEvent} onValueChange={setFilterEvent}>
                <SelectTrigger className="w-52 bg-white border-emerald-300 font-bold text-emerald-950">
                  <SelectValue placeholder="Filtrar por Evento" />
                </SelectTrigger>
                <SelectContent className="bg-white border-emerald-200">
                  <SelectItem value="all">📊 Todos los Eventos</SelectItem>
                  {eventsList.data?.map((evt) => (
                    <SelectItem key={evt.id} value={evt.id}>{evt.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRed} onValueChange={setFilterRed}>
                <SelectTrigger className="w-44 bg-white border-emerald-300"><SelectValue placeholder="Filtrar por RED" /></SelectTrigger>
                <SelectContent className="bg-white border-emerald-200">
                  <SelectItem value="all">Todas las RED</SelectItem>
                  {reds.data?.map((r) => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCdp} onValueChange={setFilterCdp}>
                <SelectTrigger className="w-44 bg-white border-emerald-300"><SelectValue placeholder="Filtrar por CDP" /></SelectTrigger>
                <SelectContent className="bg-white border-emerald-200">
                  <SelectItem value="all">Todos los CDP</SelectItem>
                  {cdps.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="w-48 bg-white border-amber-400 font-bold text-amber-950">
                  <SelectValue placeholder="Estado de Pago" />
                </SelectTrigger>
                <SelectContent className="bg-white border-amber-200">
                  <SelectItem value="all">💰 Todas las Finanzas</SelectItem>
                  <SelectItem value="Pagado Completo">🟢 Pagados Completo</SelectItem>
                  <SelectItem value="Abonado">🟡 Abonados (Parcial)</SelectItem>
                  <SelectItem value="Pendiente">🔴 Pendientes de Pago</SelectItem>
                  <SelectItem value="Becado">🎓 Becados / Exentos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats, exports y eliminar delimitado */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-700">
                {data.length} registro(s) {filterEvent !== "all" ? `en ${eventsList.data?.find((e) => e.id === filterEvent)?.nombre}` : "totales"}
              </span>
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

                {/* Eliminar delimitado por evento */}
                {data.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="font-bold">
                        <Trash className="w-4 h-4 mr-1" />
                        {filterEvent !== "all"
                          ? `Eliminar registros de ${eventsList.data?.find((e) => e.id === filterEvent)?.nombre}`
                          : "Eliminar todos los registros de todos los eventos"
                        }
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-red-600">
                          {filterEvent !== "all"
                            ? `¿Eliminar inscritos de "${eventsList.data?.find((e) => e.id === filterEvent)?.nombre}"?`
                            : "⚠️ ¿ELIMINAR REGISTROS DE TODOS LOS EVENTOS?"
                          }
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-slate-700">
                          {filterEvent !== "all"
                            ? `Esta acción eliminará únicamente los ${data.length} participantes del evento "${eventsList.data?.find((e) => e.id === filterEvent)?.nombre}". Los demás eventos NO se verán afectados. No se puede deshacer.`
                            : `⚠️ ATENCIÓN: Se eliminarán ${data.length} registros pertenecientes a TODOS los eventos del sistema. Esta acción no se puede deshacer.`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteAll} className="bg-destructive text-white font-extrabold hover:bg-destructive/90">
                          Sí, eliminar {filterEvent !== "all" ? "estos registros" : "todos"}
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

                          {/* Fila 1: nombre + evento + asistencia */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-base text-white">{r.nombres} {r.apellidos}</span>
                            <span className="bg-amber-400/90 text-slate-950 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-sm">
                              {eventsList.data?.find((e) => e.id === r.event_id)?.nombre ?? "Evento General"}
                            </span>
                            {r.asistio
                              ? <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow">
                                  <UserCheck className="w-3 h-3" /> Asistió
                                </span>
                              : <span className="inline-flex items-center gap-1 bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                                  Pendiente
                                </span>
                            }
                            {r.estado_pago === "Pagado Completo" && (
                              <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow">
                                🟢 Pagado Completo
                              </span>
                            )}
                            {r.estado_pago === "Abonado" && (
                              <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 text-xs px-2.5 py-0.5 rounded-full font-black shadow">
                                🟡 Abonado (${Number(r.monto_pagado || 0).toLocaleString("es-CO")})
                              </span>
                            )}
                            {r.estado_pago === "Becado" && (
                              <span className="inline-flex items-center gap-1 bg-purple-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow">
                                🎓 Becado / Exento
                              </span>
                            )}
                            {(!r.estado_pago || r.estado_pago === "Pendiente") && (
                              <span className="inline-flex items-center gap-1 bg-slate-700/80 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                                🔴 Pendiente Pago
                              </span>
                            )}
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
                              <button onClick={() => openPaymentModal(r)} title="Registrar / Editar Pago"
                                className="h-8 px-2.5 rounded-lg flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition-colors">
                                💰 Pago
                              </button>
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
        {tab === "usuarios" && <div className="animate-fade-in pb-8"><UserManager /></div>}
        {tab === "whatsapp" && <div className="animate-fade-in pb-8"><WhatsAppManager /></div>}
        {tab === "contactos" && (
          <div className="animate-fade-in pb-8">
            <WhatsAppContacts
              onOpenChatWithContact={(c) => {
                setSelectedChatContact(c);
                setTab("chat");
              }}
              onSendContactsToCrm={(list) => {
                setCrmContacts(
                  list.map((s, i) => ({
                    id: `contact-${s.id}-${i}`,
                    nombre: s.nombre,
                    telefono: s.telefono,
                    telefonoRaw: s.telefono,
                    extra: { correo: s.correo || "", categoria: s.categoria || "" },
                    status: "pending",
                  }))
                );
                setTab("crm");
              }}
            />
          </div>
        )}
        {tab === "crm" && <div className="animate-fade-in pb-8"><WhatsAppCrm initialContacts={crmContacts} /></div>}
        {tab === "chat" && <div className="animate-fade-in pb-8"><WhatsAppChat selectedContact={selectedChatContact} /></div>}
        </main>
      </div>

      {/* Modal de edición (Amplio y cómodo) */}
      <Dialog open={!!editReg} onOpenChange={(o) => !o && setEditReg(null)}>
        <DialogContent className="max-w-3xl w-[95vw] bg-white border border-slate-200 text-slate-900 max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black font-heading text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-teal-600" />
              Editar Registro — {editReg?.nombres} {editReg?.apellidos}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">

            {/* Texto simples */}
            {[
              { field: "nombres",           label: "Nombres",          span: false },
              { field: "apellidos",         label: "Apellidos",        span: false },
              { field: "telefono",          label: "Teléfono / WhatsApp", span: false },
              { field: "fecha_nacimiento",  label: "Fecha Nacimiento", span: false },
              { field: "numero_documento",  label: "N° Documento",     span: false },
              { field: "barrio",            label: "Barrio",           span: false },
              { field: "correo",            label: "Correo Electrónico", span: true  },
              { field: "direccion",         label: "Dirección Residencia", span: true  },
              { field: "nombre_invitador",  label: "Invitado Por (Persona que lo invitó)", span: true },
            ].map(({ field, label, span }) => (
              <div key={field} className={span ? "sm:col-span-2" : ""}>
                <Label className="text-sm font-bold text-slate-900 mb-1.5 block">{label}</Label>
                <Input
                  value={editForm[field] || ""}
                  onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                  className="h-11 text-sm font-semibold border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>
            ))}

            {/* Selects de catálogos */}
            <div>
              <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Tipo Documento</Label>
              <select value={editForm.tipo_documento_id || ""} onChange={(e) => setEditForm({ ...editForm, tipo_documento_id: e.target.value })}
                className="w-full h-11 text-sm font-semibold rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
                <option value="">— Seleccionar —</option>
                {tiposDocs.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Estado Civil</Label>
              <select value={editForm.estado_civil_id || ""} onChange={(e) => setEditForm({ ...editForm, estado_civil_id: e.target.value })}
                className="w-full h-11 text-sm font-semibold rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
                <option value="">— Seleccionar —</option>
                {estadosCiviles.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Sexo</Label>
              <select value={editForm.sexo_id || ""} onChange={(e) => setEditForm({ ...editForm, sexo_id: e.target.value })}
                className="w-full h-11 text-sm font-semibold rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
                <option value="">— Seleccionar —</option>
                {sexos.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-bold text-slate-900 mb-1.5 block">RED</Label>
              <select value={editForm.red_id || ""} onChange={(e) => setEditForm({ ...editForm, red_id: e.target.value })}
                className="w-full h-11 text-sm font-semibold rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
                <option value="">— Seleccionar —</option>
                {reds.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Casa de Paz (CDP)</Label>
              <select value={editForm.cdp_id || ""} onChange={(e) => setEditForm({ ...editForm, cdp_id: e.target.value })}
                className="w-full h-11 text-sm font-semibold rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
                <option value="">— Seleccionar —</option>
                {cdps.data?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setEditReg(null)} className="border-slate-300 text-slate-700 font-bold px-6 py-2.5 text-sm rounded-xl">
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold px-8 py-2.5 text-sm sm:text-base rounded-xl shadow-md">
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Registro y Control de Pagos */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-lg w-[95vw] bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black font-heading text-slate-900 flex items-center gap-2">
              💰 Control de Pago — {paymentReg?.nombres} {paymentReg?.apellidos}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Estado de Pago */}
            <div>
              <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Estado Financiero de Inscripción</Label>
              <select
                value={paymentState}
                onChange={(e) => {
                  const newState = e.target.value;
                  setPaymentState(newState);
                  const evtPrice = (eventsList.data?.find((ev: any) => ev.id === paymentReg?.event_id) as any)?.precio || 0;
                  if (newState === "Pagado Completo" && evtPrice > 0) {
                    setMontoPagado(evtPrice);
                    setMontoPendiente(0);
                  } else if (newState === "Becado") {
                    setMontoPagado(0);
                    setMontoPendiente(0);
                  } else if (newState === "Pendiente") {
                    setMontoPagado(0);
                    setMontoPendiente(evtPrice);
                  }
                }}
                className="w-full h-11 text-sm font-bold rounded-xl border border-amber-300 bg-amber-50/50 px-3 text-slate-900"
              >
                <option value="Pendiente">🔴 Pendiente (Sin Pago)</option>
                <option value="Abonado">🟡 Abonado (Pago Parcial)</option>
                <option value="Pagado Completo">🟢 Pagado Completo (100%)</option>
                <option value="Becado">🎓 Becado / Exento de Pago</option>
              </select>
            </div>

            {/* Monto Abonado / Pagado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Monto Abonado ($ COP)</Label>
                <Input
                  type="number"
                  value={montoPagado}
                  onChange={(e) => {
                    const paid = Number(e.target.value);
                    setMontoPagado(paid);
                    const evtPrice = (eventsList.data?.find((ev: any) => ev.id === paymentReg?.event_id) as any)?.precio || 0;
                    setMontoPendiente(Math.max(0, evtPrice - paid));
                  }}
                  className="h-11 text-sm font-bold border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div>
                <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Saldo Pendiente ($ COP)</Label>
                <Input
                  type="number"
                  value={montoPendiente}
                  onChange={(e) => setMontoPendiente(Number(e.target.value))}
                  className="h-11 text-sm font-bold border-slate-300 rounded-xl bg-slate-50 text-slate-900"
                />
              </div>
            </div>

            {/* Observaciones / Notas de Pago */}
            <div>
              <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Notas de Pago / Transferencia</Label>
              <Input
                placeholder="Ej. Transferencia Nequi #98421, Pago en efectivo presencial..."
                value={notasPago}
                onChange={(e) => setNotasPago(e.target.value)}
                className="h-11 text-sm font-semibold border-slate-300 rounded-xl bg-white text-slate-900"
              />
            </div>

            {/* URL o Enlace del Comprobante */}
            <div>
              <Label className="text-sm font-bold text-slate-900 mb-1.5 block">URL o Link del Comprobante / Recibo</Label>
              <Input
                placeholder="https://... URL de la imagen del comprobante"
                value={comprobanteUrl}
                onChange={(e) => setComprobanteUrl(e.target.value)}
                className="h-11 text-sm font-semibold border-slate-300 rounded-xl bg-white text-slate-900"
              />
              {comprobanteUrl && (
                <a
                  href={comprobanteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-teal-700 underline mt-1.5 inline-block"
                >
                  🔗 Ver Comprobante de Pago Cargado
                </a>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="border-slate-300 text-slate-700 font-bold px-6 py-2.5 text-sm rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSavePayment} disabled={savingPayment} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-8 py-2.5 text-sm sm:text-base rounded-xl shadow-md">
              {savingPayment ? "Guardando..." : "Guardar Estado de Pago"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
