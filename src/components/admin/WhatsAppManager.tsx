import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wifi, WifiOff, RefreshCw, QrCode } from "lucide-react";
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
      toast.success("Configuración guardada");
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
    <div className="space-y-6 max-w-lg animate-fade-in">

      {/* Estado de conexión */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${
        status === "connected"   ? "bg-green-50 border-green-200"  :
        status === "qr"          ? "bg-yellow-50 border-yellow-200" :
        status === "loading"     ? "bg-gray-50 border-gray-200"     :
                                   "bg-red-50 border-red-200"
      }`}>
        {status === "connected"   && <Wifi     className="w-6 h-6 text-green-600" />}
        {status === "qr"          && <QrCode   className="w-6 h-6 text-yellow-600" />}
        {status === "loading"     && <Loader2  className="w-6 h-6 text-gray-400 animate-spin" />}
        {status === "disconnected"&& <WifiOff  className="w-6 h-6 text-red-500" />}
        <div>
          <p className="font-semibold text-sm">
            {status === "connected"    && "✅ WhatsApp Conectado"}
            {status === "qr"           && "📱 Escanea el código QR"}
            {status === "loading"      && "Verificando conexión..."}
            {status === "disconnected" && "❌ WhatsApp Desconectado"}
          </p>
          <p className="text-xs text-muted-foreground">
            {status === "connected"    && "Listo para enviar invitaciones"}
            {status === "qr"           && "Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo"}
            {status === "disconnected" && "Configura el servidor y guarda"}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => checkStatus()} disabled={checking}>
          <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* QR Code */}
      {status === "qr" && qrCode && (
        <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border-2 border-yellow-300">
          <p className="font-semibold text-sm text-center">Escanea este código con tu WhatsApp</p>
          <img src={qrCode} alt="QR WhatsApp" className="w-56 h-56 rounded-lg border-4 border-green-500" />
          <p className="text-xs text-muted-foreground text-center">Se actualiza automáticamente cada 10 segundos</p>
        </div>
      )}

      {/* Configuración del servidor */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Configuración del Servidor</h2>
        <div>
          <Label>URL del Servidor</Label>
          <Input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://cmg-whatsapp.onrender.com"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">URL de tu servidor en Render</p>
        </div>
        <div>
          <Label>Token de Seguridad</Label>
          <Input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="cmg-token-2024"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">El API_TOKEN configurado en Render</p>
        </div>
        <Button onClick={saveConfig} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? "Guardando..." : "Guardar y Conectar"}
        </Button>
      </div>
    </div>
  );
}
