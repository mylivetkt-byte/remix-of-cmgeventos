import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Upload, ImageIcon, Eye, EyeOff, Key } from "lucide-react";

export function EventConfigManager() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["event_config_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("event_config")
          .insert({
            nombre_evento: "Mi Evento",
            asunto_correo: "Tu invitacion al evento",
            mensaje_correo: "Te invitamos a nuestro evento especial.",
            mensaje_whatsapp: "Hola, aqui esta mi invitacion al evento.",
            correo_remitente: "noreply@tudominio.com",
            invitado_obligatorio: false,
            barrio_como_combo: false,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        return newData;
      }
      return data;
    },
  });

  const [form, setForm] = useState<Record<string, any> | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentForm = form || config;

  const mutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (!config?.id) throw new Error("No config found");
      const { error } = await supabase
        .from("event_config")
        .update({
          nombre_evento: values.nombre_evento,
          descripcion: values.descripcion || null,
          fecha_evento: values.fecha_evento || null,
          lugar_evento: values.lugar_evento || null,
          logo_url: values.logo_url || null,
          correo_remitente: values.correo_remitente,
          asunto_correo: values.asunto_correo,
          mensaje_correo: values.mensaje_correo,
          mensaje_whatsapp: values.mensaje_whatsapp,
          invitado_obligatorio: values.invitado_obligatorio,
          barrio_como_combo: values.barrio_como_combo,
        })
        .eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      queryClient.invalidateQueries({ queryKey: ["event_config_admin"] });
      queryClient.invalidateQueries({ queryKey: ["event_config"] });
      setForm(null);
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const set = (field: string, value: any) => {
    setForm((prev) => ({ ...(prev || config), [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentForm) return <p className="text-muted-foreground text-center py-10">No se encontró configuración</p>;

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <div>
        <h2 className="text-lg font-semibold mb-4">Datos del Evento</h2>
        <div className="space-y-4">
          <div>
            <Label>Nombre del Evento *</Label>
            <Input value={currentForm.nombre_evento || ""} onChange={(e) => set("nombre_evento", e.target.value)} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={currentForm.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Fecha del Evento</Label>
            <Input type="datetime-local" value={currentForm.fecha_evento ? currentForm.fecha_evento.slice(0, 16) : ""} onChange={(e) => set("fecha_evento", e.target.value)} />
          </div>
          <div>
            <Label>Lugar del Evento</Label>
            <Input value={currentForm.lugar_evento || ""} onChange={(e) => set("lugar_evento", e.target.value)} />
          </div>
          <div>
            <Label>Logo / Imagen del Evento</Label>
            {currentForm.logo_url && (
              <div className="mt-2 mb-2 rounded-lg border overflow-hidden bg-muted flex items-center justify-center p-2">
                <img src={currentForm.logo_url} alt="Logo del evento" className="max-h-32 object-contain" />
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("La imagen no debe superar 5MB");
                  return;
                }
                setUploading(true);
                try {
                  const ext = file.name.split(".").pop();
                  const fileName = `event_logo_${Date.now()}.${ext}`;
                  const { error: uploadErr } = await supabase.storage
                    .from("invitations")
                    .upload(fileName, file, { contentType: file.type, upsert: true });
                  if (uploadErr) throw uploadErr;
                  const { data: urlData } = supabase.storage.from("invitations").getPublicUrl(fileName);
                  set("logo_url", urlData.publicUrl);
                  toast.success("Imagen cargada correctamente");
                } catch (err: any) {
                  toast.error("Error al cargar imagen: " + err.message);
                } finally {
                  setUploading(false);
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {uploading ? "Cargando..." : "Subir Imagen"}
              </Button>
              {currentForm.logo_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("logo_url", "")}>
                  Quitar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aparecerá en el formulario de registro y en la invitación PDF (máx 5MB)</p>
          </div>
        </div>
      </div>

      <BrevoApiKeySection />

      <div>
        <h2 className="text-lg font-semibold mb-4">Correo Electrónico</h2>
        <div className="space-y-4">
          <div>
            <Label>Correo Remitente (Brevo) *</Label>
            <Input value={currentForm.correo_remitente || ""} onChange={(e) => set("correo_remitente", e.target.value)} placeholder="noreply@tudominio.com" />
            <p className="text-xs text-muted-foreground mt-1">Debe ser un remitente verificado en tu cuenta de Brevo</p>
          </div>
          <div>
            <Label>Asunto del Correo</Label>
            <Input value={currentForm.asunto_correo || ""} onChange={(e) => set("asunto_correo", e.target.value)} />
          </div>
          <div>
            <Label>Mensaje del Correo</Label>
            <Textarea value={currentForm.mensaje_correo || ""} onChange={(e) => set("mensaje_correo", e.target.value)} rows={3} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">WhatsApp</h2>
        <div>
          <Label>Mensaje de WhatsApp</Label>
          <Textarea value={currentForm.mensaje_whatsapp || ""} onChange={(e) => set("mensaje_whatsapp", e.target.value)} rows={2} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Opciones del Formulario</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Nombre del invitador obligatorio</Label>
            <Switch checked={currentForm.invitado_obligatorio || false} onCheckedChange={(v) => set("invitado_obligatorio", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Barrio como combo dinámico</Label>
            <Switch checked={currentForm.barrio_como_combo || false} onCheckedChange={(v) => set("barrio_como_combo", v)} />
          </div>
        </div>
      </div>

      <Button className="w-full" onClick={() => mutation.mutate(currentForm)} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar Configuración
      </Button>
    </div>
  );
}

function BrevoApiKeySection() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ok: boolean; message: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_secrets")
        .select("value")
        .eq("key", "BREVO_API_KEY")
        .maybeSingle();
      if (data?.value) { setApiKey(data.value); setHasExisting(true); }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Ingresa la API Key de Brevo");
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

  const handleTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Ingresa un correo de prueba");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data: lastReg } = await supabase
        .from("registrations")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastReg) {
        setTestResult({ ok: false, message: "No hay registros aún. Registra una persona primero." });
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: { registrationId: lastReg.id },
      });

      if (error || data?.error) {
        setTestResult({ ok: false, message: `Error: ${error?.message || data?.error}` });
      } else {
        setTestResult({ ok: true, message: `✅ Correo enviado correctamente. Revisa ${testEmail}` });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: `Error: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Key className="w-5 h-5" /> API Key de Brevo
        {hasExisting && <span className="text-xs text-green-500 font-normal">✓ Configurada</span>}
      </h2>
      <div className="space-y-3">
        <div>
          <Label>Brevo API Key (xkeysib-...)</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={loading ? "Cargando..." : hasExisting ? "••••••••••••••••" : "xkeysib-..."}
                disabled={loading}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Obtén tu API Key en{" "}
            <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="underline text-primary">
              Brevo → Settings → API Keys
            </a>
          </p>
        </div>
        <div>
          <Label>Correo de prueba</Label>
          <Input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="tucorreo@gmail.com"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Correo donde quieres recibir la prueba</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {hasExisting ? "Actualizar API Key" : "Guardar API Key"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !hasExisting || !testEmail.trim()}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "📧"}
            Probar envío
          </Button>
        </div>
        {testResult && (
          <div className={`text-xs p-2 rounded mt-1 ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
