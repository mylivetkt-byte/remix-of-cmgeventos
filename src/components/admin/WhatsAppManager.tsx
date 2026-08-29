import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wifi, WifiOff, RefreshCw, QrCode, Key, Save, Eye, EyeOff, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function WhatsAppManager() {
  const [serverUrl, setServerUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [status, setStatus] = useState<"connected" | "qr" | "disconnected" | "loading">("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  // Cargar config guardada
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_secrets")
        .select("key, value")
        .in("key", ["WA_SERVER_URL", "WA_API_TOKEN"]);
      const url   = data?.find((d) => d.key === "WA_SERVER_URL")?.value || "";
      const token = data?.find((d) => d.key === "WA_API_TOKEN")?.value  || "";
      setServerUrl(url);
      setApiToken(token);
      if (url && token) checkStatus(url, token);
      else setStatus("disconnected");
    };
    load();
  }, []);

  // Verificar estado del servidor
  const checkStatus = async (url = serverUrl, token = apiToken) => {
    if (!url) return;
    setChecking(true);
    try {
      const res  = await fetch(`${url}/status`);
      const data = await res.json();
      setStatus(data.status);

      // Si hay QR pendiente, obtenerlo
      if (data.status === "qr") {
        fetchQR(url);
      } else {
        setQrCode(null);
      }
    } catch (_) {
      setStatus("disconnected");
    } finally {
      setChecking(false);
    }
  };

  // Obtener QR como imagen
  const fetchQR = async (url = serverUrl) => {
    try {
      const res  = await fetch(`${url}/qr-base64`);
      const data = await res.json();
      if (data.qr) setQrCode(data.qr);
    } catch (_) {}
  };

  // Guardar configuración
  const saveConfig = async () => {
    if (!serverUrl || !apiToken) {
      toast.error("Completa la URL y el token");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("app_secrets").upsert(
        [
          { key: "WA_SERVER_URL", value: serverUrl, updated_at: new Date().toISOString() },
          { key: "WA_API_TOKEN",  value: apiToken,  updated_at: new Date().toISOString() },
        ],
        { onConflict: "key" }
      );
      toast.success("Configuración de WhatsApp guardada");
      checkStatus();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Auto-refrescar QR cada 10 seg si está en modo QR
  useEffect(() => {
    if (status !== "qr") return;
    const interval = setInterval(() => checkStatus(), 10000);
    return () => clearInterval(interval);
  }, [status, serverUrl, apiToken]);

  return (
    <div className="space-y-8 max-w-2xl animate-fade-in text-slate-900 font-sans pb-8">
      {/* 1. SECCIÓN WHATSAPP */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-5 shadow-xs">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
          <MessageCircle className="w-6 h-6 text-teal-600" />
          Configuración e Integración de WhatsApp
        </h2>

        {/* Estado de conexión */}
        <div className={`flex items-center gap-4 p-5 rounded-2xl border ${
          status === "connected"   ? "bg-green-50 border-green-200 text-green-950"  :
          status === "qr"          ? "bg-amber-50 border-amber-200 text-amber-950" :
          status === "loading"     ? "bg-slate-50 border-slate-200 text-slate-900"   :
                                     "bg-red-50 border-red-200 text-red-950"
        }`}>
          {status === "connected"   && <Wifi     className="w-7 h-7 text-green-600 shrink-0" />}
          {status === "qr"          && <QrCode   className="w-7 h-7 text-amber-600 shrink-0" />}
          {status === "loading"     && <Loader2  className="w-7 h-7 text-slate-400 animate-spin shrink-0" />}
          {status === "disconnected"&& <WifiOff  className="w-7 h-7 text-red-500 shrink-0" />}
          <div>
            <p className="font-extrabold text-base">
              {status === "connected"    && "✅ WhatsApp Conectado"}
              {status === "qr"           && "📱 Escanea el código QR"}
              {status === "loading"      && "Verificando conexión..."}
              {status === "disconnected" && "❌ WhatsApp Desconectado"}
            </p>
            <p className="text-xs sm:text-sm font-medium mt-0.5">
              {status === "connected"    && "Listo para enviar invitaciones y pases por WhatsApp"}
              {status === "qr"           && "Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo"}
              {status === "disconnected" && "Configura la URL del servidor y guarda para conectar"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => checkStatus()} disabled={checking}>
            <RefreshCw className={`w-5 h-5 ${checking ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* QR Code */}
        {status === "qr" && qrCode && (
          <div className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-2xl border-2 border-amber-300">
            <p className="font-bold text-base text-center">Escanea este código con tu WhatsApp</p>
            <img src={qrCode} alt="QR WhatsApp" className="w-64 h-64 rounded-xl border-4 border-teal-500 shadow-md" />
            <p className="text-xs text-slate-500 text-center font-medium">Se actualiza automáticamente cada 10 segundos</p>
          </div>
        )}

        {/* Configuración del servidor */}
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-1.5 block">URL del Servidor WhatsApp</Label>
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://cmg-whatsapp.onrender.com"
              className="bg-white border-slate-300 text-sm font-semibold text-slate-900 h-11 rounded-xl"
            />
            <p className="text-xs text-slate-500 mt-1">URL del servicio de WhatsApp (ej. Render/VPS)</p>
          </div>
          <div>
            <Label className="text-sm font-bold text-slate-900 mb-1.5 block">Token de Seguridad API</Label>
            <Input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="cmg-token-2024"
              className="bg-white border-slate-300 text-sm font-semibold text-slate-900 h-11 rounded-xl"
            />
          </div>
          <Button onClick={saveConfig} disabled={saving} className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold h-12 text-sm sm:text-base rounded-xl shadow-md">
            {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {saving ? "Guardando..." : "Guardar y Conectar WhatsApp"}
          </Button>
        </div>
      </div>

      {/* 2. SECCIÓN BREVO EMAIL API KEY */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-5 shadow-xs">
        <BrevoApiKeySection />
      </div>
    </div>
  );
}

function BrevoApiKeySection() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_secrets")
        .select("value")
        .eq("key", "BREVO_API_KEY")
        .maybeSingle();
      if (data?.value) {
        setHasExisting(true);
        setApiKey(data.value);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Ingresa una API Key válida");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_secrets")
        .upsert({ key: "BREVO_API_KEY", value: apiKey.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      setHasExisting(true);
      toast.success("API Key de Brevo guardada correctamente");
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
        <Mail className="w-6 h-6 text-teal-600" />
        Configuración de Correos con Brevo API Key
      </h2>

      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
        Ingresa tu clave API de Brevo para habilitar el envío automático de invitaciones por correo electrónico.
      </p>

      <div>
        <Label className="text-sm font-bold text-slate-900 mb-1.5 block">
          Brevo API Key {hasExisting && <span className="text-xs text-teal-700 font-bold ml-1.5">✓ Configurada</span>}
        </Label>
        <div className="flex gap-2.5 mt-1">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={loading ? "Cargando..." : hasExisting ? "••••••••••••••••" : "xkeysib-xxxxxxxx..."}
              disabled={loading}
              className="bg-white border-slate-300 text-sm font-semibold text-slate-900 pr-10 h-11 rounded-xl"
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => setShowKey(!showKey)} className="border-slate-300 text-slate-700 h-11 w-11 rounded-xl">
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Obtén tu API Key en <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="underline text-teal-700 font-bold">Brevo → Configuración → API Keys</a>
        </p>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving || loading} className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold h-12 text-sm sm:text-base rounded-xl shadow-md">
        {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
        {hasExisting ? "Actualizar API Key de Brevo" : "Guardar API Key de Brevo"}
      </Button>
    </div>
  );
}
