import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  QrCode,
  MapPin,
  Calendar,
  RefreshCw,
  HeartHandshake,
  CreditCard,
  Home,
  User,
  Phone,
  Key,
  Globe,
  Cpu,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  processWhatsAppMessageIntent,
  lookupAttendeeProfile,
  getOmniRouteConfig,
  saveOmniRouteConfig,
  OmniRouteConfig,
} from "@/lib/whatsapp-bot";
import { supabase } from "@/integrations/supabase/client";

export function ChatbotManager() {
  const [botActive, setBotActive] = useState(true);
  const [testInput, setTestInput] = useState("");
  const [testPhone, setTestPhone] = useState("573001234567");
  const [recentAttendees, setRecentAttendees] = useState<any[]>([]);
  const [currentAttendeeProfile, setCurrentAttendeeProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"ai_config" | "attendee" | "rules">("ai_config");

  // Estados de Configuración OmniRoute / IA
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [aiModel, setAiModel] = useState("google/gemini-2.0-flash-001");
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  const [messages, setMessages] = useState<
    { sender: "user" | "bot"; text: string; time: string; rsvpStatus?: string; isAiGenerated?: boolean }[]
  >([
    {
      sender: "bot",
      text: "👋 ¡Hola! Soy el Asistente Virtual Inteligente IA de Centro Mundial de Gloria / Doxa Eventos.\n\nPuedes probar cómo respondo inteligentemente según el asistente, el evento al que fue invitado, peticiones de oración, horarios, direcciones y confirmaciones RSVP.",
      time: "Ahora",
      isAiGenerated: true,
    },
  ]);
  const [simulating, setSimulating] = useState(false);

  // Cargar configuración de OmniRoute desde Supabase app_secrets
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getOmniRouteConfig();
        setAiApiKey(config.apiKey);
        setAiBaseUrl(config.baseUrl || "https://openrouter.ai/api/v1");
        setAiModel(config.model || "google/gemini-2.0-flash-001");
        setAiSystemPrompt(config.systemPrompt || "");
        setAiEnabled(config.enabled);
      } catch (_) {}
    }
    loadConfig();
  }, []);

  // Cargar últimos registros para pruebas fáciles
  useEffect(() => {
    async function loadRecent() {
      try {
        const { data } = await supabase
          .from("registrations" as any)
          .select("id, nombres, apellidos, telefono, event_id, created_at")
          .order("created_at", { ascending: false })
          .limit(6);
        if (data) {
          setRecentAttendees(data);
          if (data.length > 0 && data[0].telefono) {
            setTestPhone(data[0].telefono);
          }
        }
      } catch (_) {}
    }
    loadRecent();
  }, []);

  // Actualizar perfil de asistente cuando cambie el teléfono
  useEffect(() => {
    async function updateProfile() {
      if (testPhone && testPhone.length >= 7) {
        const profile = await lookupAttendeeProfile(testPhone);
        setCurrentAttendeeProfile(profile);
      } else {
        setCurrentAttendeeProfile(null);
      }
    }
    updateProfile();
  }, [testPhone]);

  // Guardar configuración de OmniRoute en Supabase
  const handleSaveAiConfig = async () => {
    setSavingAi(true);
    try {
      let finalBaseUrl = aiBaseUrl.trim();
      if (window.location.protocol === "https:" && finalBaseUrl.startsWith("http://")) {
        finalBaseUrl = finalBaseUrl.replace(/^http:\/\//i, "https://");
        setAiBaseUrl(finalBaseUrl);
      }

      await saveOmniRouteConfig({
        apiKey: aiApiKey.trim(),
        baseUrl: finalBaseUrl,
        model: aiModel.trim(),
        systemPrompt: aiSystemPrompt,
        enabled: aiEnabled,
      });
      toast.success("¡Configuración de OmniRoute / IA guardada con éxito!");
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSavingAi(false);
    }
  };

  // Probar conexión directa con el endpoint de IA
  const handleTestAiConnection = async () => {
    if (!aiApiKey.trim()) {
      toast.error("Por favor ingresa primero una API Key.");
      return;
    }

    setTestingAi(true);
    setAiTestResult(null);
    const startTime = performance.now();

    try {
      let finalBaseUrl = aiBaseUrl.trim();
      if (window.location.protocol === "https:" && finalBaseUrl.startsWith("http://")) {
        finalBaseUrl = finalBaseUrl.replace(/^http:\/\//i, "https://");
        setAiBaseUrl(finalBaseUrl);
      }

      const cleanEndpoint = finalBaseUrl.endsWith("/chat/completions")
        ? finalBaseUrl
        : `${finalBaseUrl.replace(/\/$/, "")}/chat/completions`;

      const res = await fetch(cleanEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey.trim()}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "CMG Eventos Test",
        },
        body: JSON.stringify({
          model: aiModel.trim() || "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: "Responde únicamente la palabra: CONECTADO" },
            { role: "user", content: "ping" },
          ],
          max_tokens: 10,
        }),
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || "OK";
        setAiTestResult({
          success: true,
          message: `Conexión exitosa con ${aiModel}. Respuesta: "${reply.trim()}"`,
          latency: elapsed,
        });
        toast.success(`¡Conexión IA exitosa! (${elapsed}ms)`);
      } else {
        const errText = await res.text().catch(() => "");
        setAiTestResult({
          success: false,
          message: `Error HTTP ${res.status}: ${errText.slice(0, 100)}`,
          latency: elapsed,
        });
        toast.error(`Fallo en conexión IA (HTTP ${res.status})`);
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      const isMixedContent = window.location.protocol === "https:" && aiBaseUrl.startsWith("http://");
      setAiTestResult({
        success: false,
        message: isMixedContent
          ? "Bloqueado por el navegador: No se puede conectar a 'http://' desde una página HTTPS. Usa 'https://' en el Endpoint."
          : `Error de red: ${err.message}`,
        latency: elapsed,
      });
      toast.error(isMixedContent ? "Endpoint debe usar https://" : "Error al conectar con el servidor IA.");
    } finally {
      setTestingAi(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const userText = (textToSend || testInput).trim();
    if (!userText) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Agregar mensaje del usuario
    setMessages((prev) => [...prev, { sender: "user", text: userText, time: nowTime }]);
    if (!textToSend) setTestInput("");
    setSimulating(true);

    try {
      if (!botActive) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "⚠️ El Chatbot IA está pausado actualmente en la configuración.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isAiGenerated: false,
          },
        ]);
        setSimulating(false);
        return;
      }

      // Procesar intención con el motor IA contextual (usando la configuración activa en pantalla)
      const res = await processWhatsAppMessageIntent(userText, testPhone, {
        apiKey: aiApiKey.trim(),
        baseUrl: aiBaseUrl.trim(),
        model: aiModel.trim(),
        systemPrompt: aiSystemPrompt,
        enabled: aiEnabled,
      });

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: res.replyText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            rsvpStatus: res.rsvpStatus,
            isAiGenerated: res.isAiGenerated,
          },
        ]);
        setSimulating(false);

        if (res.rsvpStatus === "confirmado") {
          toast.success("¡RSVP Confirmado automáticamente por el Chatbot!");
        } else if (res.rsvpStatus === "cancelado") {
          toast.info("RSVP registrado como declinado.");
        }
      }, 300);
    } catch (err: any) {
      setSimulating(false);
      toast.error("Error en simulación: " + err.message);
    }
  };

  const quickPrompts = [
    { label: "1 (Confirmar Asistencia)", text: "1", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
    { label: "2 (Declinar Asistencia)", text: "2", icon: <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> },
    { label: "📍 ¿Dónde es el evento?", text: "¿Dónde es el evento y cuál es la dirección?", icon: <MapPin className="w-3.5 h-3.5 text-blue-600" /> },
    { label: "📅 ¿Cuándo y a qué hora?", text: "¿Cuándo es y a qué hora empieza?", icon: <Calendar className="w-3.5 h-3.5 text-amber-600" /> },
    { label: "🎟️ Mi Pase QR", text: "¿Me puedes enviar mi pase QR de entrada?", icon: <QrCode className="w-3.5 h-3.5 text-purple-600" /> },
    { label: "🙏 Petición de Oración", text: "Tengo una petición de oración por sanidad y mi familia", icon: <HeartHandshake className="w-3.5 h-3.5 text-rose-500" /> },
    { label: "💳 ¿Cuánto cuesta?", text: "¿Cuánto cuesta la entrada y cómo puedo pagar?", icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> },
    { label: "🏡 Casas de Paz", text: "¿Dónde queda una Casa de Paz cerca a mi sector?", icon: <Home className="w-3.5 h-3.5 text-teal-600" /> },
    { label: "👋 Saludo cordial", text: "Hola, buenos días", icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
  ];

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in text-slate-900 pb-12">
      {/* CABECERA */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black font-heading tracking-tight">Chatbot Inteligente con IA 24/7</h2>
          </div>
          <p className="text-sm text-teal-100/90 max-w-xl">
            Impulsado por OmniRoute / OpenRouter AI para generar respuestas humanas y contextuales según el asistente, su evento, peticiones de oración, pases QR, ubicación y confirmaciones RSVP.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-3.5 rounded-2xl border border-white/20 backdrop-blur-md">
          <Label className="text-xs font-extrabold text-white">Estado del Bot:</Label>
          <Switch checked={botActive} onCheckedChange={setBotActive} />
          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${botActive ? "bg-emerald-500 text-slate-950" : "bg-slate-700 text-slate-300"}`}>
            {botActive ? "ACTIVO 24/7" : "PAUSADO"}
          </span>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL IZQUIERDO: TABS Y CONFIGURACIÓN */}
        <div className="space-y-4 lg:col-span-5">
          
          {/* NAVEGACIÓN DE TABS */}
          <div className="flex bg-slate-200/80 p-1 rounded-2xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("ai_config")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "ai_config" ? "bg-white text-teal-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-teal-600" />
              API OmniRoute / IA
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("attendee")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "attendee" ? "bg-white text-teal-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5 text-teal-600" />
              Asistente & Tel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "rules" ? "bg-white text-teal-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Reglas & Contexto
            </button>
          </div>

          {/* TAB 1: CONFIGURACIÓN OMNIROUTE / OPENROUTER IA */}
          {activeTab === "ai_config" && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Key className="w-4 h-4 text-teal-600" /> Credenciales de IA
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">IA Activa:</span>
                  <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                </div>
              </div>

              {/* API KEY */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>API Key (OmniRoute / OpenRouter / Groq / OpenAI)</span>
                  <span className="text-[10px] text-teal-600 font-semibold">Guardado seguro</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-or-v1-... o sk-..."
                    className="bg-slate-50 border-slate-300 font-mono text-xs pr-9 rounded-xl h-9.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* BASE URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-teal-600" /> Endpoint Base URL
                </Label>
                <Input
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder="https://openrouter.ai/api/v1 o https://api.omniroute.io/v1"
                  className="bg-slate-50 border-slate-300 font-mono text-xs rounded-xl h-9"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAiBaseUrl("https://openrouter.ai/api/v1");
                      setAiModel("google/gemini-2.0-flash-001");
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-900 border border-slate-200"
                  >
                    Preset OpenRouter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiBaseUrl("https://api.omniroute.io/v1");
                      setAiModel("google/gemini-2.0-flash-001");
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-900 border border-slate-200"
                  >
                    Preset OmniRoute
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiBaseUrl("https://api.groq.com/openai/v1");
                      setAiModel("llama-3.3-70b-versatile");
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-900 border border-slate-200"
                  >
                    Preset Groq
                  </button>
                </div>
              </div>

              {/* MODELO */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-teal-600" /> Modelo LLM
                </Label>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="google/gemini-2.0-flash-001 o openai/gpt-4o-mini"
                  className="bg-slate-50 border-slate-300 font-mono text-xs rounded-xl h-9"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setAiModel("google/gemini-2.0-flash-001")}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                  >
                    ⚡ Gemini 2.0 Flash (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiModel("openai/gpt-4o-mini")}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    GPT-4o Mini
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiModel("meta-llama/llama-3.3-70b-instruct")}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    Llama 3.3 70B
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiModel("deepseek/deepseek-chat")}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    DeepSeek Chat
                  </button>
                </div>
              </div>

              {/* INSTRUCCIONES PERSONALIZADAS EXTRA */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Instrucciones Adicionales del Administrador (Opcional)
                </Label>
                <Textarea
                  value={aiSystemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  placeholder="Ej: Recuerda invitar siempre al servicio de los domingos a las 10:00 AM..."
                  rows={2}
                  className="bg-slate-50 border-slate-300 text-xs rounded-xl"
                />
              </div>

              {/* RESULTADO DE PRUEBA */}
              {aiTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    aiTestResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  {aiTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-bold">{aiTestResult.message}</p>
                    {aiTestResult.latency && (
                      <p className="text-[11px] opacity-80">Latencia de respuesta: {aiTestResult.latency} ms</p>
                    )}
                  </div>
                </div>
              )}

              {/* BOTONES DE ACCIÓN */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={handleSaveAiConfig}
                  disabled={savingAi}
                  className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-bold h-9.5 rounded-xl shadow-xs text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {savingAi ? "Guardando..." : "Guardar Configuración IA"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestAiConnection}
                  disabled={testingAi || !aiApiKey.trim()}
                  className="border-slate-300 hover:bg-slate-100 text-slate-800 font-bold h-9.5 rounded-xl text-xs"
                >
                  <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  {testingAi ? "Probando..." : "Probar Conexión"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: SELECCIÓN Y PERFIL DEL ASISTENTE */}
          {activeTab === "attendee" && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <User className="w-4 h-4 text-teal-600" /> Simular con Asistente Real
                </h3>
                <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded-md border border-teal-200">
                  Pruebas Contextuales
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-600" /> Teléfono de WhatsApp para Prueba
                </Label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Ej: 573001234567 o 3001234567"
                  className="bg-slate-50 border-slate-300 font-mono text-xs rounded-xl h-9"
                />
                <p className="text-[11px] text-slate-500">
                  El bot buscará el nombre, evento, estado de pago y pase QR asignado a este número en la base de datos.
                </p>
              </div>

              {/* LISTA RÁPIDA DE ASISTENTES RECIENTES */}
              {recentAttendees.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] font-bold text-slate-600">Últimos registrados en el sistema:</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {recentAttendees.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => setTestPhone(att.telefono || "")}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all text-left flex items-center gap-1 ${
                          testPhone === att.telefono
                            ? "bg-teal-700 text-white border-teal-800 font-bold shadow-xs"
                            : "bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <User className="w-3 h-3 opacity-70" />
                        <span className="font-semibold">{att.nombres} {att.apellidos || ""}</span>
                        <span className="font-mono text-[9px] opacity-75">({att.telefono})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TARJETA DE PERFIL IDENTIFICADO */}
              {currentAttendeeProfile ? (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Asistente Identificado en BD</span>
                  </div>
                  <p className="text-slate-800">
                    <strong className="text-slate-900">Nombre:</strong> {currentAttendeeProfile.nombreCompleto}
                  </p>
                  <p className="text-slate-800">
                    <strong className="text-slate-900">Asistencia (RSVP):</strong>{" "}
                    {currentAttendeeProfile.asistio ? "Confirmado ✅" : "Pendiente de confirmar"}
                  </p>
                  {currentAttendeeProfile.pdfUrl && (
                    <p className="text-slate-800 truncate">
                      <strong className="text-slate-900">Pase QR:</strong>{" "}
                      <a
                        href={currentAttendeeProfile.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 underline text-[11px]"
                      >
                        Ver Documento PDF
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Sin registro previo con este número. La IA responderá como a un nuevo visitante.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REGLAS Y CONTEXTO DEL PROGRAMA */}
          {activeTab === "rules" && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-teal-600" /> Reglas e Instrucciones IA
                </h3>
                <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                  Máxima Prioridad
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">
                  Instrucciones y Programa Oficial para la IA:
                </Label>
                <Textarea
                  value={aiSystemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  placeholder="Escribe aquí las normas, horarios de los cultos, detalles del programa o reglas que la IA debe cumplir obligatoriamente..."
                  rows={6}
                  className="bg-slate-50 border-slate-300 text-xs rounded-xl font-sans leading-relaxed"
                />
                <p className="text-[11px] text-slate-500">
                  La IA leerá este texto antes de responder cada mensaje y cumplirá estas normas al 100%.
                </p>
              </div>

              {/* PLANTILLAS RÁPIDAS DE EJEMPLO */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-[11px] font-bold text-slate-600">Insertar plantilla rápida:</Label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setAiSystemPrompt(
                        (prev) =>
                          (prev ? prev + "\n\n" : "") +
                          "HORARIOS DE SERVICIOS:\n- Domingos: Culto General de Celebración 10:00 AM\n- Martes: Noche de Oración y Milagros 7:00 PM\n- Sábados: Reunión de Jóvenes 6:00 PM\nInvita siempre con amor a estas reuniones."
                      )
                    }
                    className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200"
                  >
                    + Horarios de Cultos
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAiSystemPrompt(
                        (prev) =>
                          (prev ? prev + "\n\n" : "") +
                          "PROGRAMA DEL EVENTO:\n- Ingreso y registro: 20 minutos antes con código QR\n- Vestimenta: Cómoda y formal\n- Refrigerio incluido en la jornada\nRecuérdales llegar temprano para tener un buen lugar."
                      )
                    }
                    className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200"
                  >
                    + Programa y Logística
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAiSystemPrompt(
                        (prev) =>
                          (prev ? prev + "\n\n" : "") +
                          "PETICIONES DE ORACIÓN:\nSi alguien pide oración, responde con extrema ternura y fe, cita una promesa de Dios (Salmo 91 o Jeremías 33:3) y recuérdale que los pastores oran diariamente por ellos."
                      )
                    }
                    className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200"
                  >
                    + Enfoque Pastoral y Oración
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleSaveAiConfig}
                  disabled={savingAi}
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold h-9.5 rounded-xl shadow-xs text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {savingAi ? "Guardando..." : "Guardar Reglas e Instrucciones"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO: SIMULADOR INTERACTIVO */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col h-[640px] overflow-hidden">
          {/* CABECERA SIMULADOR */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-sm text-white">
                🤖
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-white">Simulador en Vivo del Chatbot WhatsApp</h3>
                <p className="text-[10px] text-teal-400">
                  {aiApiKey ? `✨ Motor Activo: ${aiModel}` : "⚡ Motor Local de Contingencia"}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setMessages([
                  {
                    sender: "bot",
                    text: `👋 ¡Hola! Soy el Asistente Virtual Inteligente de Centro Mundial de Gloria.\n\n${
                      currentAttendeeProfile
                        ? `¡Hola *${currentAttendeeProfile.nombres}*! Te reconozco en nuestro sistema. ¿En qué te puedo colaborar hoy?`
                        : "Bienvenido(a). ¿En qué te puedo ayudar hoy con respecto a nuestros eventos, cultos o iglesia?"
                    }`,
                    time: "Ahora",
                    isAiGenerated: true,
                  },
                ])
              }
              className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs h-8 px-2 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Limpiar
            </Button>
          </div>

          {/* BARRA DE ASISTENTE ACTIVO EN SIMULADOR */}
          <div className="bg-teal-900/90 text-white px-3.5 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2 border-b border-teal-800 shrink-0">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-teal-300" />
              <span>Simulando a:</span>
              <strong className="text-teal-200">
                {currentAttendeeProfile
                  ? `${currentAttendeeProfile.nombreCompleto} (${testPhone})`
                  : `Nuevo Visitante (${testPhone})`}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("attendee")}
              className="text-[10px] text-teal-200 hover:text-white underline font-semibold"
            >
              Cambiar Asistente →
            </button>
          </div>

          {/* BOTONES DE PREGUNTAS RÁPIDAS */}
          <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap pl-1">Pruebas rápidas:</span>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp.text)}
                disabled={simulating}
                className="text-[11px] bg-white hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5 transition-all shadow-2xs"
              >
                {qp.icon}
                {qp.label}
              </button>
            ))}
          </div>

          {/* ÁREA DE MENSAJES */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs whitespace-pre-line leading-relaxed shadow-2xs ${
                    m.sender === "user"
                      ? "bg-teal-700 text-white font-medium rounded-br-none"
                      : "bg-white text-slate-900 border border-slate-200 rounded-bl-none font-sans"
                  }`}
                >
                  {m.text}
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span className="text-[10px] text-slate-400">{m.time}</span>
                  {m.sender === "bot" && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                        m.isAiGenerated
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {m.isAiGenerated ? "✨ OmniRoute IA" : "⚡ Regla Local"}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {simulating && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium animate-pulse pt-1">
                <Bot className="w-4 h-4 text-teal-600 animate-spin" /> Chatbot procesando con IA...
              </div>
            )}
          </div>

          {/* FORMULARIO DE ENVÍO */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <Input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Escribe un mensaje de prueba (ej: 1, ¿dónde es?, petición de oración, mi pase)..."
              className="bg-slate-50 border-slate-300 text-xs text-slate-900 h-10 rounded-xl flex-1"
            />
            <Button
              type="submit"
              disabled={simulating || !testInput.trim()}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold h-10 px-4 rounded-xl shadow-xs shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
