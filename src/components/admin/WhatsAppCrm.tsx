import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";

const DEFAULT_TEMPLATE = `Hola {{nombre}} 👋

Te escribimos desde Doxa Eventos para compartirte esta información.

¡Te esperamos!`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function WhatsAppCrm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [fileName, setFileName] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [delayMs, setDelayMs] = useState(1200);
  const [loadingFile, setLoadingFile] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

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

  const sendOne = async (contact: CrmContact, url: string, token: string) => {
    const res = await fetch(`${url.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone: contact.telefono, message: personalizeMessage(template, contact) }),
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

    for (const contact of queue) {
      if (abortRef.current) break;
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
      if (!abortRef.current) await sleep(Math.max(400, delayMs));
    }

    setSending(false);
    if (abortRef.current) toast.message("Campaña pausada. Puedes reanudar los pendientes.");
    else toast.success(`Campaña terminada: ${sent} enviados, ${failed} fallidos`);
  };

  return <CrmUI contacts={contacts} fileName={fileName} template={template} setTemplate={setTemplate} delayMs={delayMs} setDelayMs={setDelayMs} loadingFile={loadingFile} sending={sending} progress={progress} preview={preview} pendingCount={pendingCount} sentCount={sentCount} downloadTemplate={downloadTemplate} handleFile={handleFile} startCampaign={startCampaign} abortRef={abortRef} setContacts={setContacts} setFileName={setFileName} setProgress={setProgress} fileRef={fileRef} />;
}

type CrmUIProps = {
  contacts: CrmContact[];
  fileName: string;
  template: string;
  setTemplate: (v: string) => void;
  delayMs: number;
  setDelayMs: (v: number) => void;
  loadingFile: boolean;
  sending: boolean;
  progress: { sent: number; failed: number; total: number };
  preview: string;
  pendingCount: number;
  sentCount: number;
  downloadTemplate: () => void;
  handleFile: (f?: File) => void;
  startCampaign: () => void;
  abortRef: React.MutableRefObject<boolean>;
  setContacts: React.Dispatch<React.SetStateAction<CrmContact[]>>;
  setFileName: (v: string) => void;
  setProgress: React.Dispatch<React.SetStateAction<{ sent: number; failed: number; total: number }>>;
  fileRef: React.RefObject<HTMLInputElement>;
};

function CrmUI({ contacts, fileName, template, setTemplate, delayMs, setDelayMs, loadingFile, sending, progress, preview, pendingCount, sentCount, downloadTemplate, handleFile, startCampaign, abortRef, setContacts, setFileName, setProgress, fileRef }: CrmUIProps) {
  return (
    <div className="space-y-6 animate-fade-in text-slate-900 font-sans pb-8">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-5 shadow-xs">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
          <MessageCircle className="w-6 h-6 text-teal-600" />
          CRM WhatsApp — Envío masivo personalizado
        </h2>
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          Carga una plantilla Excel/CSV con <span className="font-extrabold">nombre</span> y <span className="font-extrabold">whatsapp</span>. El mensaje se personaliza automáticamente para cada contacto. Usa el mismo servidor WhatsApp ya configurado.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="button" variant="outline" onClick={downloadTemplate} className="h-11 rounded-xl border-slate-300 font-bold">
            <Download className="w-4 h-4 mr-2" /> Descargar plantilla
          </Button>
          <Button type="button" onClick={() => fileRef.current?.click()} disabled={loadingFile || sending} className="h-11 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold">
            {loadingFile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Cargar Excel / CSV
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
        {fileName && (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3">
            <FileSpreadsheet className="w-4 h-4 text-teal-700" /> {fileName} · {contacts.length} contactos
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4 shadow-xs">
          <Label className="text-sm font-bold text-slate-900">Mensaje de la campaña</Label>
          <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} disabled={sending} className="min-h-[220px] rounded-xl border-slate-300 text-sm font-medium" placeholder="Hola {{nombre}}, ..." />
          <p className="text-xs text-slate-500 font-medium">Variables: {"{{nombre}}"}, {"{{whatsapp}}"}. Columnas extra del Excel también funcionan.</p>
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Pausa entre mensajes (ms)</Label>
            <Input type="number" min={400} step={100} value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value) || 1200)} disabled={sending} className="h-11 rounded-xl border-slate-300 font-semibold max-w-[200px]" />
          </div>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4 shadow-xs">
          <Label className="text-sm font-bold text-slate-900">Vista previa</Label>
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

      {contacts.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="font-extrabold text-slate-900">Contactos de la campaña</p>
            <span className="text-xs font-bold text-slate-500">{sending ? "Enviando..." : "Listo"}</span>
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
        El envío usa la URL y el token de la pestaña WhatsApp & Brevo. Si WhatsApp está desconectado, conecta el QR ahí antes de lanzar la campaña.
      </div>
    </div>
  );
}
