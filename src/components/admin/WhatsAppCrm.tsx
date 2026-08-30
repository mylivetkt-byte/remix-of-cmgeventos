import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { loadStoredContacts } from "./WhatsAppContacts";
import { toast } from "sonner";
import {
  CrmContact,
  parseSpreadsheetFile,
  personalizeMessage,
  rowsToContacts,
  sampleCsv,
} from "@/lib/whatsapp-crm";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  PauseCircle,
  Send,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
  ShieldCheck,
  Users,
} from "lucide-react";

const DEFAULT_TEMPLATE = `Hola {{nombre}} 👋

Te escribimos desde Doxa Eventos para compartirte esta información.

¡Te esperamos!`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface WhatsAppCrmProps {
  initialContacts?: CrmContact[];
}

export function WhatsAppCrm({ initialContacts }: WhatsAppCrmProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [fileName, setFileName] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [delayMs, setDelayMs] = useState(1500);
  const [antiBanEnabled, setAntiBanEnabled] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<string>("");
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  // Cargar contactos iniciales si vienen desde el Módulo de Contactos
  useEffect(() => {
    if (initialContacts && initialContacts.length > 0) {
      setContacts(initialContacts);
      setFileName(`Lista de Contactos (${initialContacts.length})`);
      setProgress({ sent: 0, failed: 0, total: initialContacts.length });
    }
  }, [initialContacts]);

  const preview = useMemo(() => {
    const sample: CrmContact = contacts[0] || {
      id: "preview",
      nombre: "Juan Pérez",
      telefono: "573001234567",
      telefonoRaw: "3001234567",
      extra: {},
      status: "pending",
    };
    return personalizeMessage(template, sample);
  }, [contacts, template]);

  const pendingCount = contacts.filter((c) => c.status === "pending" || c.status === "error").length;
  const sentCount = contacts.filter((c) => c.status === "sent").length;

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + sampleCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-crm-whatsapp.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoadingFile(true);
    try {
      const parsed = rowsToContacts(await parseSpreadsheetFile(file));
      if (parsed.length === 0) {
        toast.error("No se encontraron contactos válidos en el archivo");
        return;
      }
      setContacts(parsed);
      setFileName(file.name);
      setProgress({ sent: 0, failed: 0, total: parsed.length });
      toast.success(`${parsed.length} contactos cargados`);
    } catch (err: any) {
      toast.error(err.message || "No se pudo leer el archivo");
    } finally {
      setLoadingFile(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleLoadFromContactsModule = () => {
    const stored = loadStoredContacts();
    if (stored.length === 0) {
      toast.error("No hay contactos en el Módulo de Agenda. Agrega algunos primero.");
      return;
    }

    const crmList: CrmContact[] = stored.map((s, idx) => ({
      id: `crm-stored-${s.id}-${idx}`,
      nombre: s.nombre,
      telefono: s.telefono,
      telefonoRaw: s.telefono,
      extra: {
        correo: s.correo || "",
        categoria: s.categoria || "",
      },
      status: "pending",
    }));

    setContacts(crmList);
    setFileName(`Agenda de Contactos (${crmList.length})`);
    setProgress({ sent: 0, failed: 0, total: crmList.length });
    toast.success(`${crmList.length} contactos importados desde la Agenda`);
  };

  const loadWhatsAppConfig = async () => {
    const { data } = await supabase
      .from("app_secrets")
      .select("key, value")
      .in("key", ["WA_SERVER_URL", "WA_API_TOKEN"]);
    return {
      url: data?.find((d) => d.key === "WA_SERVER_URL")?.value || "",
      token: data?.find((d) => d.key === "WA_API_TOKEN")?.value || "",
    };
  };

  // Simular presencia "escribiendo..." en WhatsApp
  const sendPresenceTyping = async (phone: string, url: string, token: string) => {
    try {
      await fetch(`${url.replace(/\/$/, "")}/presence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, state: "composing" }),
      }).catch(() => {});
    } catch (_) {}
  };

  const sendOne = async (contact: CrmContact, url: string, token: string) => {
    const cleanUrl = url.replace(/\/$/, "");
    const messageContent = personalizeMessage(template, contact);

    // 🛡️ PROTECCIÓN ANTI-BAN: Simulación de tipeo previo
    if (antiBanEnabled) {
      setSendingStatus(`Simulando tipeo para ${contact.nombre}...`);
      await sendPresenceTyping(contact.telefono, cleanUrl, token);
      const typingTime = Math.min(2800, Math.max(1200, messageContent.length * 35));
      await sleep(typingTime);
    }

    setSendingStatus(`Enviando mensaje a ${contact.nombre}...`);
    const res = await fetch(`${cleanUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone: contact.telefono, message: messageContent }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo enviar");
  };

  const startCampaign = async () => {
    if (!template.trim()) {
      toast.error("Escribe el mensaje de la campaña");
      return;
    }
    if (!/\{\{\s*nombres?\s*\}\}/i.test(template)) {
      toast.error("Incluye {{nombre}} para personalizar cada mensaje");
      return;
    }
    const queue = contacts.filter((c) => c.status === "pending" || c.status === "error");
    if (queue.length === 0) {
      toast.error("No hay contactos pendientes");
      return;
    }
    const { url, token } = await loadWhatsAppConfig();
    if (!url || !token) {
      toast.error("Servidor WhatsApp no configurado. Ve a la pestaña WhatsApp & Brevo.");
      return;
    }

    abortRef.current = false;
    setSending(true);
    let sent = sentCount;
    let failed = contacts.filter((c) => c.status === "error").length;

    let campaignIndex = 0;

    for (const contact of queue) {
      if (abortRef.current) break;
      campaignIndex++;

      setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, status: "sending", error: undefined } : c)));

      try {
        await sendOne(contact, url, token);
        sent++;
        setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, status: "sent" } : c)));
      } catch (err: any) {
        failed++;
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, status: "error", error: err.message || "Error" } : c)),
        );
      }
      setProgress({ sent, failed, total: contacts.length });

      if (!abortRef.current) {
        // 🛡️ PROTECCIÓN ANTI-BAN 1: Retardo Humano Aleatorio (Jitter)
        const baseDelay = Math.max(500, delayMs);
        const randomJitter = antiBanEnabled ? Math.floor(Math.random() * 1800) : 0;
        const totalWait = baseDelay + randomJitter;

        setSendingStatus(`Pausa de seguridad (${(totalWait / 1000).toFixed(1)}s)...`);
        await sleep(totalWait);

        // 🛡️ PROTECCIÓN ANTI-BAN 2: Micro-Pausa Humana cada 15 mensajes
        if (antiBanEnabled && campaignIndex % 15 === 0 && campaignIndex < queue.length) {
          const pauseDuration = 12000 + Math.floor(Math.random() * 10000); // 12-22 seg
          setSendingStatus(` Micro-Pausa humana Anti-Baneo (${Math.round(pauseDuration / 1000)}s)...`);
          await sleep(pauseDuration);
        }
      }
    }

    setSending(false);
    setSendingStatus("");
    if (abortRef.current) toast.message("Campaña pausada. Puedes reanudar los pendientes.");
    else toast.success(`Campaña terminada: ${sent} enviados, ${failed} fallidos`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 font-sans pb-8">
      {/* Cabecera del CRM */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
              <MessageCircle className="w-6 h-6 text-teal-600" />
              CRM WhatsApp — Envío Masivo Personalizado
            </h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed mt-1">
              Carga tu lista por Excel/CSV o importa desde tu Agenda. Mensajes 100% personalizados con protección Anti-Baneo.
            </p>
          </div>

          {/* Toggle Protección Anti-Baneo */}
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <div>
              <Label htmlFor="anti-ban-crm" className="text-xs font-extrabold text-emerald-950 block cursor-pointer">
                Protección Anti-Baneo
              </Label>
              <p className="text-[10px] text-emerald-800 font-semibold">Tipeo + Tiempos Aleatorios + Micro-Pausas</p>
            </div>
            <Switch
              id="anti-ban-crm"
              checked={antiBanEnabled}
              onCheckedChange={setAntiBanEnabled}
              disabled={sending}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={downloadTemplate} className="h-11 rounded-xl border-slate-300 font-bold">
            <Download className="w-4 h-4 mr-2" /> Descargar plantilla
          </Button>

          <Button type="button" onClick={() => fileRef.current?.click()} disabled={loadingFile || sending} className="h-11 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold">
            {loadingFile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Cargar Excel / CSV
          </Button>

          <Button type="button" variant="outline" onClick={handleLoadFromContactsModule} disabled={sending} className="h-11 rounded-xl border-teal-200 text-teal-800 font-extrabold">
            <Users className="w-4 h-4 mr-2 text-teal-600" /> Cargar desde Agenda
          </Button>

          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>

        {fileName && (
          <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3">
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-700" /> {fileName} · {contacts.length} contactos
            </span>
            {sendingStatus && (
              <span className="text-xs font-bold text-teal-800 animate-pulse bg-white px-3 py-1 rounded-full border border-teal-200">
                {sendingStatus}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Editor de mensaje y Vista previa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4 shadow-xs">
          <Label className="text-sm font-bold text-slate-900">Mensaje de la campaña</Label>
          <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} disabled={sending} className="min-h-[220px] rounded-xl border-slate-300 text-sm font-medium" placeholder="Hola {{nombre}}, ..." />
          <p className="text-xs text-slate-500 font-medium">Variables: {"{{nombre}}"}, {"{{whatsapp}}"}. Columnas extra del Excel también funcionan.</p>
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Retardo base entre mensajes (ms)</Label>
            <Input type="number" min={500} step={100} value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value) || 1500)} disabled={sending} className="h-11 rounded-xl border-slate-300 font-semibold max-w-[200px]" />
          </div>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4 shadow-xs">
          <Label className="text-sm font-bold text-slate-900">Vista previa personalizada</Label>
          <div className="min-h-[220px] whitespace-pre-wrap rounded-2xl border border-teal-200 bg-teal-50/60 p-4 text-sm font-medium text-slate-800">{preview}</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase">Total</p>
              <p className="text-xl font-black text-slate-900">{contacts.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-xs font-bold text-emerald-700 uppercase">Enviados</p>
              <p className="text-xl font-black text-emerald-900">{progress.sent || sentCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center">
              <p className="text-xs font-bold text-amber-700 uppercase">Pendientes</p>
              <p className="text-xl font-black text-amber-950">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción de la campaña */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={startCampaign} disabled={sending || contacts.length === 0} className="h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold px-6">
          {sending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
          {sending ? "Enviando campaña..." : sentCount > 0 ? "Reanudar pendientes" : "Enviar campaña"}
        </Button>
        {sending && (
          <Button type="button" variant="outline" onClick={() => { abortRef.current = true; }} className="h-12 rounded-xl border-slate-300 font-bold">
            <PauseCircle className="w-5 h-5 mr-2" /> Pausar
          </Button>
        )}
        <Button type="button" variant="outline" disabled={sending || contacts.length === 0} onClick={() => { setContacts([]); setFileName(""); setProgress({ sent: 0, failed: 0, total: 0 }); }} className="h-12 rounded-xl border-slate-300 font-bold">
          <Trash2 className="w-4 h-4 mr-2" /> Limpiar lista
        </Button>
      </div>

      {/* Tabla de estado de envíos */}
      {contacts.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-extrabold text-slate-900">Contactos de la campaña</p>
            <span className="text-xs font-bold text-slate-500">{sending ? "Enviando con Anti-Baneo..." : "Listo"}</span>
          </div>
          <div className="overflow-x-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-extrabold">Nombre</TableHead>
                  <TableHead className="font-extrabold">WhatsApp</TableHead>
                  <TableHead className="font-extrabold">Estado</TableHead>
                  <TableHead className="font-extrabold">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{c.telefono}</TableCell>
                    <TableCell>
                      {c.status === "sent" && <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold">Enviado</Badge>}
                      {c.status === "sending" && <Badge className="bg-teal-100 text-teal-900 border-teal-300 font-extrabold">Enviando</Badge>}
                      {c.status === "error" && <Badge className="bg-red-100 text-red-900 border-red-300 font-extrabold">Error</Badge>}
                      {c.status === "pending" && <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-extrabold">Pendiente</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{c.error || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-2xl p-4">
        {contacts.length === 0 ? <WifiOff className="w-4 h-4 mt-0.5" /> : <Wifi className="w-4 h-4 mt-0.5 text-teal-700" />}
        El envío usa la URL y el token de la pestaña WhatsApp & Brevo. La protección Anti-Baneo simula patrones humanos para mayor seguridad.
      </div>
    </div>
  );
}
