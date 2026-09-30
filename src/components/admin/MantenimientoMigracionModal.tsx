import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Database,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  Layers,
  Sparkles,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Package,
  Users,
  Receipt,
  Wallet,
  Coins,
  TrendingDown,
  Activity,
  Archive,
  Info,
  Play,
  RotateCcw,
  Folder,
  FolderCheck,
  HardDrive,
  Cloud,
  ShieldCheck,
  KeyRound,
  History,
  Lock,
  Check,
  ExternalLink,
  Settings,
  Plug,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  Rocket,
  Calendar,
  UserCheck,
  MessageCircle,
  Home,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AsistenteRestauracionModal } from "./AsistenteRestauracionModal";
import * as XLSX from "xlsx";

interface MantenimientoMigracionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminNombre?: string;
  onDatosActualizados?: () => void;
}

interface EstadisticasSistema {
  eventos: number;
  registros: number;
  asistencias: number;
  contactos: number;
  casasDePaz: number;
  mensajesWhatsApp: number;
  usuariosAdmin: number;
}

interface OpcionesPurga {
  registros: boolean;
  asistencias: boolean;
  contactos: boolean;
  casasDePaz: boolean;
  mensajesChat: boolean;
}

export function MantenimientoMigracionModal({
  open,
  onOpenChange,
  adminNombre = "SUPER ADMIN",
  onDatosActualizados,
}: MantenimientoMigracionModalProps) {
  // Pestaña Activa: "limpiar_pruebas" | "reseteo" | "excel" | "sql" | "backup" | "conexion_bd"
  const [tabActiva, setTabActiva] = useState<
    "limpiar_pruebas" | "reseteo" | "excel" | "sql" | "backup" | "conexion_bd"
  >("limpiar_pruebas");

  const [modalAsistente, setModalAsistente] = useState(false);

  // Estadísticas del sistema
  const [stats, setStats] = useState<EstadisticasSistema>({
    eventos: 0,
    registros: 0,
    asistencias: 0,
    contactos: 0,
    casasDePaz: 0,
    mensajesWhatsApp: 0,
    usuariosAdmin: 0,
  });
  const [cargandoStats, setCargandoStats] = useState(false);

  // Estados de Operación: Limpiar pruebas
  const [procesandoLimpieza, setProcesandoLimpieza] = useState(false);
  const [confirmarLimpiezaModal, setConfirmarLimpiezaModal] = useState(false);

  // Estados de Operación: Reseteo Selectivo
  const [opcionesPurga, setOpcionesPurga] = useState<OpcionesPurga>({
    registros: true,
    asistencias: true,
    contactos: false,
    casasDePaz: false,
    mensajesChat: false,
  });
  const [procesandoPurga, setProcesandoPurga] = useState(false);
  const [confirmarPurgaModal, setConfirmarPurgaModal] = useState(false);
  const [textoConfirmacionPurga, setTextoConfirmacionPurga] = useState("");

  // Estados de Operación: Migración Excel
  const [tipoImportacion, setTipoImportacion] = useState<"registros" | "contactos">("registros");
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [datosPrevisualizacion, setDatosPrevisualizacion] = useState<any[]>([]);
  const [procesandoExcel, setProcesandoExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Operación: Migración SQL
  const [scriptSql, setScriptSql] = useState<string>(`-- Script de Creación y Mantenimiento CMG Eventos
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  fecha TIMESTAMP WITH TIME ZONE,
  lugar VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  nombres VARCHAR(255) NOT NULL,
  apellidos VARCHAR(255) NOT NULL,
  numero_documento VARCHAR(100),
  telefono VARCHAR(100),
  correo VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Permitir todo events') THEN
    CREATE POLICY "Permitir todo events" ON public.events FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Permitir todo registrations') THEN
    CREATE POLICY "Permitir todo registrations" ON public.registrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'Permitir todo attendance') THEN
    CREATE POLICY "Permitir todo attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`);
  const [copiadoSql, setCopiadoSql] = useState(false);

  // Estados de Operación: Backup & Restauración
  const [procesandoBackup, setProcesandoBackup] = useState(false);
  const [procesandoRestauracion, setProcesandoRestauracion] = useState(false);
  const [archivoBackup, setArchivoBackup] = useState<File | null>(null);
  const [pinRestauracion, setPinRestauracion] = useState("");
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Operación: Conexión BD
  const [bdUrl, setBdUrl] = useState(() => localStorage.getItem("custom_supabase_url") || (import.meta as any).env.VITE_SUPABASE_URL || "");
  const [bdKey, setBdKey] = useState(() => localStorage.getItem("custom_supabase_key") || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "");
  const [mostrarKey, setMostrarKey] = useState(false);
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState<"idle" | "ok" | "error">("idle");
  const [mensajeConexion, setMensajeConexion] = useState("");

  useEffect(() => {
    if (open) {
      cargarEstadisticas();
    }
  }, [open]);

  async function cargarEstadisticas() {
    setCargandoStats(true);
    try {
      const [
        { count: countEventos },
        { count: countRegistros },
        { count: countAsistencias },
        { count: countContactos },
        { count: countCasas },
        { count: countMensajes },
      ] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("registrations").select("*", { count: "exact", head: true }),
        supabase.from("attendance").select("*", { count: "exact", head: true }),
        supabase.from("whatsapp_contacts").select("*", { count: "exact", head: true }),
        supabase.from("casas_de_paz_requests").select("*", { count: "exact", head: true }),
        supabase.from("whatsapp_crm_messages").select("*", { count: "exact", head: true }),
      ]);

      let usuariosCount = 0;
      try {
        const localUsers = JSON.parse(localStorage.getItem("cmg_admin_users") || "[]");
        usuariosCount = localUsers.length || 1;
      } catch (e) {
        usuariosCount = 1;
      }

      setStats({
        eventos: countEventos || 0,
        registros: countRegistros || 0,
        asistencias: countAsistencias || 0,
        contactos: countContactos || 0,
        casasDePaz: countCasas || 0,
        mensajesWhatsApp: countMensajes || 0,
        usuariosAdmin: usuariosCount,
      });
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
    } finally {
      setCargandoStats(false);
    }
  }

  async function handleEjecutarLimpiezaPruebas() {
    setProcesandoLimpieza(true);
    try {
      const { error: errAsistencias } = await supabase.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (errAsistencias) throw errAsistencias;

      const { error: errRegistros } = await supabase.from("registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (errRegistros) throw errRegistros;

      toast.success("¡Registros y asistencias de prueba eliminados correctamente!");
      setConfirmarLimpiezaModal(false);
      await cargarEstadisticas();
      onDatosActualizados?.();
    } catch (err: any) {
      toast.error(`Error al limpiar registros: ${err?.message || "Desconocido"}`);
    } finally {
      setProcesandoLimpieza(false);
    }
  }

  async function handleEjecutarPurga() {
    if (textoConfirmacionPurga !== "PURGAR") {
      toast.error('Debes escribir "PURGAR" en mayúsculas para confirmar.');
      return;
    }

    setProcesandoPurga(true);
    try {
      if (opcionesPurga.asistencias) {
        await supabase.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (opcionesPurga.registros) {
        await supabase.from("registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (opcionesPurga.contactos) {
        await supabase.from("whatsapp_contacts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (opcionesPurga.casasDePaz) {
        await supabase.from("casas_de_paz_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (opcionesPurga.mensajesChat) {
        await supabase.from("whatsapp_crm_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }

      toast.success("Purga selectiva completada con éxito.");
      setConfirmarPurgaModal(false);
      setTextoConfirmacionPurga("");
      await cargarEstadisticas();
      onDatosActualizados?.();
    } catch (err: any) {
      toast.error(`Error durante la purga: ${err?.message || "Desconocido"}`);
    } finally {
      setProcesandoPurga(false);
    }
  }

  function handleDescargarPlantillaExcel() {
    let headers: string[] = [];
    let ejemploFila: any = {};

    if (tipoImportacion === "registros") {
      headers = ["NOMBRES", "APELLIDOS", "NUMERO_DOCUMENTO", "TELEFONO", "CORREO", "BARRIO", "EDAD"];
      ejemploFila = {
        NOMBRES: "Carlos Alberto",
        APELLIDOS: "Pérez Gómez",
        NUMERO_DOCUMENTO: "1020304050",
        TELEFONO: "3001234567",
        CORREO: "carlos@ejemplo.com",
        BARRIO: "Centro",
        EDAD: "28",
      };
    } else {
      headers = ["NOMBRE", "TELEFONO", "CORREO", "GRUPO", "NOTAS"];
      ejemploFila = {
        NOMBRE: "María Rodríguez",
        TELEFONO: "3109876543",
        CORREO: "maria@ejemplo.com",
        GRUPO: "Líderes",
        NOTAS: "Contacto importado",
      };
    }

    const ws = XLSX.utils.json_to_sheet([ejemploFila], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, `plantilla_${tipoImportacion}_cmg.xlsx`);
    toast.success(`Plantilla de ${tipoImportacion} descargada con éxito.`);
  }

  function handleSeleccionarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoExcel(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);
        setDatosPrevisualizacion(data.slice(0, 10));
        toast.info(`Se leyeron ${data.length} filas del archivo Excel.`);
      } catch (err) {
        toast.error("Error al leer el archivo Excel");
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleImportarExcel() {
    if (!archivoExcel) {
      toast.error("Selecciona un archivo Excel primero.");
      return;
    }

    setProcesandoExcel(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(ws);

          let totalInsertados = 0;

          if (tipoImportacion === "registros") {
            const formatted = rows.map((r) => ({
              nombres: r.NOMBRES || r.nombres || "Sin Nombre",
              apellidos: r.APELLIDOS || r.apellidos || "",
              numero_documento: String(r.NUMERO_DOCUMENTO || r.documento || ""),
              telefono: String(r.TELEFONO || r.telefono || ""),
              correo: r.CORREO || r.correo || "",
              barrio: r.BARRIO || r.barrio || "",
              edad: Number(r.EDAD || r.edad || 0) || null,
            }));

            for (let i = 0; i < formatted.length; i += 100) {
              const batch = formatted.slice(i, i + 100);
              const { error } = await supabase.from("registrations").insert(batch);
              if (error) throw error;
              totalInsertados += batch.length;
            }
          } else {
            const formatted = rows.map((r) => ({
              nombre: r.NOMBRE || r.nombre || "Contacto",
              telefono: String(r.TELEFONO || r.telefono || ""),
              correo: r.CORREO || r.correo || "",
              etiquetas: r.GRUPO ? [r.GRUPO] : [],
              notas: r.NOTAS || "",
            }));

            for (let i = 0; i < formatted.length; i += 100) {
              const batch = formatted.slice(i, i + 100);
              const { error } = await supabase.from("whatsapp_contacts").insert(batch);
              if (error) throw error;
              totalInsertados += batch.length;
            }
          }

          toast.success(`¡Éxito! Se importaron ${totalInsertados} registros.`);
          setArchivoExcel(null);
          setDatosPrevisualizacion([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
          await cargarEstadisticas();
          onDatosActualizados?.();
        } catch (err: any) {
          toast.error(`Error al importar: ${err?.message || "Desconocido"}`);
        } finally {
          setProcesandoExcel(false);
        }
      };
      reader.readAsBinaryString(archivoExcel);
    } catch (err: any) {
      toast.error(`Error al procesar: ${err?.message || "Desconocido"}`);
      setProcesandoExcel(false);
    }
  }

  async function handleGenerarBackupJSON() {
    setProcesandoBackup(true);
    try {
      const tablas = [
        "events",
        "registrations",
        "attendance",
        "catalog_cdp",
        "catalog_red",
        "catalog_tipo_documento",
        "catalog_estado_civil",
        "catalog_sexo",
        "casas_de_paz_requests",
        "whatsapp_contacts",
        "whatsapp_crm_messages",
        "chat_conversations",
        "chat_messages",
        "chatbot_config",
        "chatbot_faq",
        "auditorio_config",
      ];

      const backupObj: Record<string, any[]> = {};
      let totalRegistros = 0;

      for (const t of tablas) {
        try {
          const { data } = await supabase.from(t).select("*");
          backupObj[t] = data || [];
          totalRegistros += (data || []).length;
        } catch (e) {
          backupObj[t] = [];
        }
      }

      const backupCompleto = {
        metadata: {
          sistema: "CMG Eventos",
          version: "2.0",
          fecha: new Date().toISOString(),
          totalTablas: tablas.length,
          totalRegistros,
          ejecutadoPor: adminNombre,
        },
        datos: backupObj,
      };

      const jsonStr = JSON.stringify(backupCompleto, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_cmg_eventos_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Copia de seguridad generada (${totalRegistros} registros).`);
    } catch (err: any) {
      toast.error(`Error al crear copia: ${err?.message || "Desconocido"}`);
    } finally {
      setProcesandoBackup(false);
    }
  }

  async function handleRestaurarBackupJSON() {
    if (!archivoBackup) {
      toast.error("Selecciona el archivo .json de respaldo");
      return;
    }

    if (pinRestauracion !== "369700") {
      toast.error("Clave/PIN de autorización incorrecto.");
      return;
    }

    setProcesandoRestauracion(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const content = evt.target?.result as string;
          const parsed = JSON.parse(content);

          if (!parsed.datos) {
            throw new Error("El archivo no tiene el formato de respaldo válido.");
          }

          let restaurados = 0;
          for (const [tabla, rows] of Object.entries(parsed.datos)) {
            if (Array.isArray(rows) && rows.length > 0) {
              const { error } = await supabase.from(tabla).upsert(rows, { ignoreDuplicates: true });
              if (!error) {
                restaurados += rows.length;
              }
            }
          }

          toast.success(`¡Restauración exitosa! Se procesaron ${restaurados} registros.`);
          setArchivoBackup(null);
          setPinRestauracion("");
          if (backupFileInputRef.current) backupFileInputRef.current.value = "";
          await cargarEstadisticas();
          onDatosActualizados?.();
        } catch (e: any) {
          toast.error(`Error al restaurar: ${e?.message || "Archivo inválido"}`);
        } finally {
          setProcesandoRestauracion(false);
        }
      };
      reader.readAsText(archivoBackup);
    } catch (err: any) {
      toast.error(`Error crítico: ${err?.message || "Desconocido"}`);
      setProcesandoRestauracion(false);
    }
  }

  async function handleProbarConexion() {
    setProbandoConexion(true);
    setEstadoConexion("idle");
    setMensajeConexion("");

    try {
      const { error } = await supabase.from("events").select("id").limit(1);
      if (error) throw error;

      setEstadoConexion("ok");
      setMensajeConexion("¡Conexión establecida con éxito a Supabase!");
      toast.success("Conexión a Supabase OK");
    } catch (err: any) {
      setEstadoConexion("error");
      setMensajeConexion(`Error de conexión: ${err?.message || "Verifica credenciales"}`);
      toast.error("Error al conectar con la base de datos");
    } finally {
      setProbandoConexion(false);
    }
  }

  function handleGuardarCredenciales() {
    if (!bdUrl.trim() || !bdKey.trim()) {
      toast.error("Por favor ingresa la URL y la Anon Key");
      return;
    }

    localStorage.setItem("custom_supabase_url", bdUrl.trim());
    localStorage.setItem("custom_supabase_key", bdKey.trim());
    toast.success("Credenciales guardadas en el navegador.");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="fixed left-1/2 top-1/2 z-50 flex h-[92vh] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white p-0 shadow-2xl border border-slate-200 overflow-hidden font-sans select-none">
          
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black tracking-tight uppercase">
                    Mantenimiento, Reseteo & Migración de Datos
                  </h2>
                  <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-300 border border-teal-500/40">
                    Panel Avanzado
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Limpieza de datos de prueba, copias de seguridad e importación masiva por Excel / SQL.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cargarEstadisticas}
                disabled={cargandoStats}
                title="Recargar Estadísticas"
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${cargandoStats ? "animate-spin text-teal-400" : ""}`} />
                <span className="hidden sm:inline">Refrescar</span>
              </button>

              <button
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* MÉTRICAS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 bg-slate-50 border-b border-slate-200 px-6 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              <span className="text-slate-500 font-medium">Eventos:</span>
              <span className="font-bold text-slate-800">{stats.eventos}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-slate-500 font-medium">Registros:</span>
              <span className="font-bold text-slate-800">{stats.registros}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-slate-500 font-medium">Asistencias:</span>
              <span className="font-bold text-slate-800">{stats.asistencias}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-slate-500 font-medium">Contactos:</span>
              <span className="font-bold text-slate-800">{stats.contactos}</span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-3.5 w-3.5 text-cyan-600" />
              <span className="text-slate-500 font-medium">Casas Paz:</span>
              <span className="font-bold text-slate-800">{stats.casasDePaz}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-slate-500 font-medium">Admins:</span>
              <span className="font-bold text-slate-800">{stats.usuariosAdmin}</span>
            </div>
          </div>

          {/* PESTAÑAS */}
          <div className="flex items-center border-b border-slate-200 bg-white px-6 pt-2 gap-2 overflow-x-auto">
            <button
              onClick={() => setTabActiva("limpiar_pruebas")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                tabActiva === "limpiar_pruebas"
                  ? "border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <Trash2 className="h-4 w-4 text-amber-600" />
              <span>1. Limpiar Pruebas</span>
            </button>

            <button
              onClick={() => setTabActiva("reseteo")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                tabActiva === "reseteo"
                  ? "border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <RotateCcw className="h-4 w-4 text-rose-600" />
              <span>2. Reseteo Selectivo</span>
            </button>

            <button
              onClick={() => setTabActiva("excel")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                tabActiva === "excel"
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>3. Migración Excel</span>
            </button>

            <button
              onClick={() => setTabActiva("sql")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                tabActiva === "sql"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <Terminal className="h-4 w-4 text-blue-600" />
              <span>4. Migración SQL</span>
            </button>

            <button
              onClick={() => setTabActiva("backup")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                tabActiva === "backup"
                  ? "border-violet-600 text-violet-700 bg-violet-50/50 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <HardDrive className="h-4 w-4 text-violet-600" />
              <span>5. Copias de Seguridad</span>
            </button>

            <button
              onClick={() => setTabActiva("conexion_bd")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                tabActiva === "conexion_bd"
                  ? "border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <Plug className="h-4 w-4 text-teal-600" />
              <span>6. Conexión BD</span>
            </button>
          </div>

          {/* CUERPO */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">

            {/* TAB 1 */}
            {tabActiva === "limpiar_pruebas" && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-5 shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shrink-0 shadow-md">
                      <Trash2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-amber-950 uppercase tracking-tight">
                        Vaciar Registros & Asistencias de Prueba
                      </h3>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        Esta función elimina los registros de prueba y asistencias acumuladas.
                        <strong> Los eventos, auditorio, configuración y catálogos permanecen 100% intactos.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="text-xs font-bold uppercase text-slate-400">Total Registros Acumulados</div>
                    <div className="mt-1 text-3xl font-black text-slate-900">{stats.registros}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Personas inscritas en eventos</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="text-xs font-bold uppercase text-slate-400">Total Asistencias Registradas</div>
                    <div className="mt-1 text-3xl font-black text-slate-900">{stats.asistencias}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Marcaciones por escáner QR</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800">Ejecutar Limpieza</h4>
                    <p className="text-xs text-slate-500">Solo se vaciarán registros y asistencias. No se tocan eventos ni cuentas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmarLimpiezaModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    Limpiar Pruebas
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2 */}
            {tabActiva === "reseteo" && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/70 p-5 shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shrink-0 shadow-md">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-rose-950 uppercase tracking-tight">
                        Purga Selectiva de Información
                      </h3>
                      <p className="text-xs text-rose-900 leading-relaxed">
                        Selecciona exactamente cuáles módulos deseas reiniciar. Esta acción requiere confirmación explícita.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Tablas a Purgar:</h4>
                  
                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opcionesPurga.asistencias}
                      onChange={(e) => setOpcionesPurga({ ...opcionesPurga, asistencias: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Asistencias por Escáner QR</span>
                      <span className="text-slate-500 block text-[11px]">({stats.asistencias} marcaciones)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opcionesPurga.registros}
                      onChange={(e) => setOpcionesPurga({ ...opcionesPurga, registros: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Registros de Participantes</span>
                      <span className="text-slate-500 block text-[11px]">({stats.registros} inscripciones)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opcionesPurga.contactos}
                      onChange={(e) => setOpcionesPurga({ ...opcionesPurga, contactos: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Agenda de Contactos WhatsApp</span>
                      <span className="text-slate-500 block text-[11px]">({stats.contactos} contactos)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opcionesPurga.casasDePaz}
                      onChange={(e) => setOpcionesPurga({ ...opcionesPurga, casasDePaz: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Solicitudes Casas de Paz (Leads)</span>
                      <span className="text-slate-500 block text-[11px]">({stats.casasDePaz} solicitudes)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opcionesPurga.mensajesChat}
                      onChange={(e) => setOpcionesPurga({ ...opcionesPurga, mensajesChat: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Historial Mensajes CRM / Chat</span>
                      <span className="text-slate-500 block text-[11px]">({stats.mensajesWhatsApp} mensajes)</span>
                    </div>
                  </label>

                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmarPurgaModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                    >
                      Continuar con Purga
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3 */}
            {tabActiva === "excel" && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shrink-0 shadow-md">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-emerald-950 uppercase tracking-tight">
                        Importación Masiva desde Excel (.xlsx)
                      </h3>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        Carga masivamente participantes o contactos a la base de datos descargando la plantilla oficial y subiendo tu archivo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoImportacion("registros")}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
                      tipoImportacion === "registros"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    1. Registros de Participantes
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoImportacion("contactos")}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
                      tipoImportacion === "contactos"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    2. Agenda de Contactos WhatsApp
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800">Descargar Plantilla Oficial</h4>
                      <p className="text-xs text-slate-500">Obtén el formato con los encabezados exactos para evitar errores.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDescargarPlantillaExcel}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar .xlsx
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <label className="text-xs font-bold text-slate-700 block">
                      Seleccionar Archivo Excel Rellenado:
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleSeleccionarExcel}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer cursor-pointer border border-emerald-200 rounded-xl bg-white p-1"
                    />
                  </div>

                  {datosPrevisualizacion.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <span className="text-[11px] font-bold text-slate-600 block">Previsualización (Primeras filas):</span>
                      <div className="overflow-x-auto max-h-40 border border-slate-200 rounded-xl">
                        <table className="min-w-full text-[11px] text-left">
                          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                            <tr>
                              {Object.keys(datosPrevisualizacion[0] || {}).map((k) => (
                                <th key={k} className="p-2 border-b border-slate-200">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {datosPrevisualizacion.map((r, idx) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                {Object.values(r).map((val: any, vidx) => (
                                  <td key={vidx} className="p-2 truncate max-w-[150px]">{String(val)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <button
                        type="button"
                        onClick={handleImportarExcel}
                        disabled={procesandoExcel}
                        className="w-full mt-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {procesandoExcel ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Procesando e insertando registros...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span>Importar a Base de Datos</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4 */}
            {tabActiva === "sql" && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-5 shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shrink-0 shadow-md">
                      <Terminal className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-blue-950 uppercase tracking-tight">
                        Script Maestro SQL & Creación de Esquema
                      </h3>
                      <p className="text-xs text-blue-900 leading-relaxed">
                        Copia y ejecuta este script en el <strong>SQL Editor de Supabase</strong> para generar automáticamente todas las tablas, índices, llaves y políticas RLS necesarias.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-white">
                    <span className="text-xs font-mono font-bold text-slate-300">schema_cmg_eventos.sql</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(scriptSql);
                        setCopiadoSql(true);
                        toast.success("Script SQL copiado al portapapeles");
                        setTimeout(() => setCopiadoSql(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-all cursor-pointer"
                    >
                      {copiadoSql ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiadoSql ? "Copiado" : "Copiar SQL"}</span>
                    </button>
                  </div>
                  <textarea
                    value={scriptSql}
                    onChange={(e) => setScriptSql(e.target.value)}
                    rows={12}
                    className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-950/5 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* TAB 5 */}
            {tabActiva === "backup" && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                {/* BANNER ASISTENTE 4 PASOS */}
                <div className="rounded-2xl border-2 border-teal-400 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-5 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/40 shrink-0">
                      <Rocket className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black uppercase tracking-wider text-teal-200">
                          Asistente de Restauración & Script SQL (4 Pasos)
                        </h4>
                        <span className="rounded-full bg-teal-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-300 border border-teal-400/30">
                          Wizard Completo
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        Guía paso a paso para probar credenciales de Supabase, generar el script SQL completo de CMG Eventos y restaurar la base de datos completa.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalAsistente(true)}
                    className="w-full md:w-auto px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-teal-500/30 transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Rocket className="h-4 w-4" />
                    <span>Abrir Asistente 4 Pasos</span>
                  </button>
                </div>

                {/* GENERAR BACKUP */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shrink-0 shadow-md">
                      <HardDrive className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase">Sistema Integral de Copias de Seguridad</h3>
                      <p className="text-xs text-slate-600">
                        Exporta y resguarda de forma segura los eventos, registros, asistencias, catálogo y solicitudes en un archivo JSON unificado.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleGenerarBackupJSON}
                      disabled={procesandoBackup}
                      className="p-4 rounded-xl border-2 border-violet-200 bg-violet-50/60 hover:bg-violet-100/80 transition-all text-left group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="h-5 w-5 text-violet-600 group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="font-black text-xs text-violet-950 uppercase">Descarga Directa JSON</div>
                          <div className="text-[11px] text-violet-700">Respaldo descargable al navegador</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerarBackupJSON}
                      disabled={procesandoBackup}
                      className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <Cloud className="h-5 w-5 text-slate-600 group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="font-black text-xs text-slate-900 uppercase">Bóveda Cloud & Drive</div>
                          <div className="text-[11px] text-slate-600">Exportar y guardar copia externa</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* RESTAURACIÓN JSON */}
                <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-5 shadow-xs space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                          Restauración de Base de Datos
                        </h4>
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                          Protegido por Clave
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/80 mt-0.5">
                        Restaura la información a partir de un archivo JSON generado previamente. Requiere autorización explícita.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Seleccionar Archivo de Respaldo (.json):
                      </label>
                      <input
                        ref={backupFileInputRef}
                        type="file"
                        accept=".json"
                        onChange={(e) => setArchivoBackup(e.target.files?.[0] || null)}
                        disabled={procesandoRestauracion}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-600 file:text-white hover:file:bg-amber-700 file:cursor-pointer cursor-pointer border border-amber-200 rounded-xl bg-white p-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Clave de Administrador (Autorización):
                      </label>
                      <input
                        type="password"
                        placeholder="Ingresa clave de autorización"
                        value={pinRestauracion}
                        onChange={(e) => setPinRestauracion(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleRestaurarBackupJSON}
                      disabled={procesandoRestauracion || !archivoBackup}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {procesandoRestauracion ? "Restaurando..." : "Restaurar Información"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6 */}
            {tabActiva === "conexion_bd" && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/70 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shrink-0 shadow-md">
                      <Plug className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-black text-teal-950 uppercase tracking-tight">
                        Configuración de Conexión a Base de Datos (Supabase)
                      </h3>
                      <p className="text-xs text-teal-900 leading-relaxed">
                        Visualiza y gestiona las credenciales de conexión a tu base de datos Supabase. Puedes probar la conexión
                        para verificar que todo está funcionando correctamente.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ACCESO RÁPIDO AL ASISTENTE */}
                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                        ¿Configurando un nuevo proyecto Supabase?
                      </h4>
                      <p className="text-[11px] text-indigo-900/80">
                        El Asistente Paso a Paso te guía para probar credenciales, generar el script SQL completo y restaurar datos.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalAsistente(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    <span>Iniciar Asistente 4 Pasos</span>
                  </button>
                </div>

                {/* ESTADO */}
                <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${
                  estadoConexion === "ok"
                    ? "border-emerald-300 bg-emerald-50/60"
                    : estadoConexion === "error"
                    ? "border-rose-300 bg-rose-50/60"
                    : "border-slate-200 bg-white"
                }`}>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                    estadoConexion === "ok"
                      ? "bg-emerald-500 text-white"
                      : estadoConexion === "error"
                      ? "bg-rose-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}>
                    {estadoConexion === "ok" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : estadoConexion === "error" ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <Activity className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-black uppercase text-slate-700">
                      {estadoConexion === "ok" ? "Conexión Activa" : estadoConexion === "error" ? "Error de Conexión" : "Estado: Sin Verificar"}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {mensajeConexion || 'Presiona "Probar Conexión" para verificar la comunicación con la base de datos.'}
                    </p>
                  </div>
                </div>

                {/* FORMULARIO */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-teal-400" />
                    <span className="text-xs font-black uppercase text-white tracking-wider">Credenciales de Supabase</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Project URL (Supabase URL):</label>
                      <input
                        type="text"
                        value={bdUrl}
                        onChange={(e) => setBdUrl(e.target.value)}
                        placeholder="https://xxxxxxxx.supabase.co"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Anon Public Key (API Key):</label>
                      <div className="relative">
                        <input
                          type={mostrarKey ? "text" : "password"}
                          value={bdKey}
                          onChange={(e) => setBdKey(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarKey(!mostrarKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {mostrarKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleGuardarCredenciales}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase cursor-pointer transition-all"
                      >
                        Guardar en Navegador
                      </button>

                      <button
                        type="button"
                        onClick={handleProbarConexion}
                        disabled={probandoConexion}
                        className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
                      >
                        {probandoConexion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                        <span>Probar Conexión</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-100 px-6 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-4 w-4 text-slate-400" />
              <span>Módulo de Mantenimiento · CMG Eventos v2.0</span>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 transition-all shadow-xs cursor-pointer"
            >
              Cerrar Ventana
            </button>
          </div>

        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMACIÓN LIMPIEZA */}
      <Dialog open={confirmarLimpiezaModal} onOpenChange={setConfirmarLimpiezaModal}>
        <DialogContent className="fixed left-1/2 top-1/2 z-[60] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
          <div className="flex items-center gap-3 text-amber-600 mb-3">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="font-black text-sm uppercase text-slate-900">¿Vaciar registros de prueba?</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Se eliminarán permanentemente todos los registros y marcaciones de asistencia de prueba ({stats.registros} registros y {stats.asistencias} asistencias). Los eventos y catálogos no se tocarán.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmarLimpiezaModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleEjecutarLimpiezaPruebas}
              disabled={procesandoLimpieza}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              {procesandoLimpieza ? "Vaciando..." : "Sí, Vaciar Pruebas"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMACIÓN PURGA */}
      <Dialog open={confirmarPurgaModal} onOpenChange={setConfirmarPurgaModal}>
        <DialogContent className="fixed left-1/2 top-1/2 z-[60] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
          <div className="flex items-center gap-3 text-rose-600 mb-3">
            <ShieldAlert className="h-6 w-6" />
            <h3 className="font-black text-sm uppercase text-slate-900">Confirmación de Seguridad</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Esta acción es irreversible. Para proceder, escribe la palabra <strong>PURGAR</strong> en mayúsculas:
          </p>
          <input
            type="text"
            placeholder="Escribe PURGAR"
            value={textoConfirmacionPurga}
            onChange={(e) => setTextoConfirmacionPurga(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase mb-4 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmarPurgaModal(false);
                setTextoConfirmacionPurga("");
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleEjecutarPurga}
              disabled={procesandoPurga || textoConfirmacionPurga !== "PURGAR"}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-40"
            >
              {procesandoPurga ? "Purgando..." : "Confirmar Purga"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ASISTENTE RESTAURACIÓN 4 PASOS */}
      {modalAsistente && (
        <AsistenteRestauracionModal
          open={modalAsistente}
          onOpenChange={setModalAsistente}
        />
      )}
    </>
  );
}
