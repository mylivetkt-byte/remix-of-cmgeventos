import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { toast } from "sonner";
import { processWhatsAppMessageIntent, lookupAttendeeProfile } from "@/lib/whatsapp-bot";
import { supabase } from "@/integrations/supabase/client";

export function ChatbotManager() {
  const [botActive, setBotActive] = useState(true);
  const [testInput, setTestInput] = useState("");
  const [testPhone, setTestPhone] = useState("573001234567");
  const [recentAttendees, setRecentAttendees] = useState<any[]>([]);
  const [currentAttendeeProfile, setCurrentAttendeeProfile] = useState<any>(null);
  const [messages, setMessages] = useState<
    { sender: "user" | "bot"; text: string; time: string; rsvpStatus?: string }[]
  >([
    {
      sender: "bot",
      text: "👋 ¡Hola! Soy el Asistente Virtual Inteligente IA de Centro Mundial de Gloria / Doxa Eventos.\n\nPuedes probar cómo respondo inteligentemente según el asistente, el evento al que fue invitado, peticiones de oración, horarios, direcciones y confirmaciones RSVP.",
      time: "Ahora",
    },
  ]);
  const [simulating, setSimulating] = useState(false);

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
          },
        ]);
        setSimulating(false);
        return;
      }

      // Procesar intención con el motor IA contextual
      const res = await processWhatsAppMessageIntent(userText, testPhone);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: res.replyText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            rsvpStatus: res.rsvpStatus,
          },
        ]);
        setSimulating(false);

        if (res.rsvpStatus === "confirmado") {
          toast.success("¡RSVP Confirmado automáticamente por el Chatbot!");
        } else if (res.rsvpStatus === "cancelado") {
          toast.info("RSVP registrado como declinado.");
        }
      }, 500);
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
            Responde automáticamente mensajes entrantes de WhatsApp de forma coherente según la persona, el evento en el que está registrada, peticiones de oración, direcciones exactas, horarios, pases QR y confirmaciones RSVP.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-3.5 rounded-2xl border border-white/20 backdrop-blur-md">
          <Label className="text-xs font-extrabold text-white">Estado del Bot IA:</Label>
          <Switch checked={botActive} onCheckedChange={setBotActive} />
          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${botActive ? "bg-emerald-500 text-slate-950" : "bg-slate-700 text-slate-300"}`}>
            {botActive ? "ACTIVO 24/7" : "PAUSADO"}
          </span>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL IZQUIERDO: CONFIGURACIÓN DE PRUEBA Y REGLAS */}
        <div className="space-y-4 lg:col-span-5">
          
          {/* IDENTIFICACIÓN DEL ASISTENTE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Phone className="w-4 h-4 text-teal-600" /> Teléfono de Prueba
            </h3>
            <div className="space-y-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Número de WhatsApp (ej: 573001234567)"
                className="bg-slate-50 border-slate-300 text-xs font-mono h-9 rounded-xl"
              />
              
              {currentAttendeeProfile ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    Asistente Reconocido: {currentAttendeeProfile.nombreCompleto}
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    ID Registro: <span className="font-mono">{currentAttendeeProfile.id.slice(0, 8)}</span> • Asistió: {currentAttendeeProfile.asistio ? "Sí ✅" : "Pendiente ⏳"}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
                  ℹ️ Modo visitante no registrado (el bot brindará información general y enlaces de inscripción).
                </div>
              )}
            </div>

            {recentAttendees.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase">Seleccionar Asistente Real:</span>
                <div className="flex flex-wrap gap-1.5">
                  {recentAttendees.map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => setTestPhone(att.telefono || "")}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition-all ${
                        testPhone === att.telefono
                          ? "bg-teal-700 text-white border-teal-700"
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {att.nombres} ({att.telefono || "Sin tel"})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* INTENCIONES DETECTADAS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-teal-600" /> Coherencia Inteligente 24/7
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">🙏 Peticiones de Oración y Consejería</span>
                <span className="text-slate-600">Reconoce motivos de oración, brinda palabra de aliento y confirma intercesión.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">📍 Dirección y Ubicación Exacta</span>
                <span className="text-slate-600">Proporciona el lugar exacto del evento del asistente con indicaciones.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">📅 Fecha y Horarios Personalizados</span>
                <span className="text-slate-600">Informa la fecha real del evento en el que la persona está inscrita.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">🎟️ Pase QR y Comprobantes</span>
                <span className="text-slate-600">Entrega el link personal de descarga con nombre y estado.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">💬 Confirmación RSVP (1 / 2)</span>
                <span className="text-slate-600">Actualiza automáticamente el estado de asistencia en Supabase.</span>
              </div>
            </div>
          </div>
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
                <p className="text-[10px] text-teal-400">Prueba cómo responderá a los asistentes reales</p>
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
                    text: "👋 ¡Hola! Soy el Asistente Virtual Inteligente IA de Centro Mundial de Gloria. ¿En qué te puedo ayudar hoy?",
                    time: "Ahora",
                  },
                ])
              }
              className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs h-8 px-2 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Limpiar
            </Button>
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
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            ))}
            {simulating && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium animate-pulse pt-1">
                <Bot className="w-4 h-4 text-teal-600 animate-spin" /> Chatbot procesando y respondiendo...
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
