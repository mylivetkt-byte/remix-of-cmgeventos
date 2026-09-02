import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bot, MessageSquare, Send, Sparkles, CheckCircle2, QrCode, MapPin, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { processWhatsAppMessageIntent } from "@/lib/whatsapp-bot";

export function ChatbotManager() {
  const [botActive, setBotActive] = useState(true);
  const [testInput, setTestInput] = useState("");
  const [testPhone, setTestPhone] = useState("573001234567");
  const [messages, setMessages] = useState<
    { sender: "user" | "bot"; text: string; time: string; rsvpStatus?: string }[]
  >([
    {
      sender: "bot",
      text: "👋 ¡Hola! Soy el Asistente Virtual Inteligente IA de Doxa Eventos / Centro Mundial de Gloria.\n\nPuedes probar cómo respondo preguntándome por horarios, lugar del evento, pases QR o respondiendo '1' para confirmar asistencia.",
      time: "Ahora",
    },
  ]);
  const [simulating, setSimulating] = useState(false);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testInput.trim()) return;

    const userText = testInput.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Agregar mensaje del usuario
    setMessages((prev) => [...prev, { sender: "user", text: userText, time: nowTime }]);
    setTestInput("");
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

      // Procesar intención con el motor IA
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
      }, 600);
    } catch (err: any) {
      setSimulating(false);
      toast.error("Error en simulación: " + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in text-slate-900 pb-12">
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
            Responde automáticamente mensajes entrantes de WhatsApp, informa sobre fechas, ubicaciones, envía enlaces de pases QR y procesa confirmaciones RSVP ("1" o "2").
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

      {/* GRID CON ESTADÍSTICAS Y SIMULADOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TARJETAS DE CARACTERÍSTICAS Y REGLAS */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" /> Intenciones Detectadas
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">💬 Confirmación RSVP (1 / 2)</span>
                <span className="text-slate-600">Actualiza automáticamente el campo asistio en Supabase.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">📅 Fecha y Horario</span>
                <span className="text-slate-600">Consulta en tiempo real la fecha real del evento activo.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">📍 Ubicación del Auditorio</span>
                <span className="text-slate-600">Proporciona la dirección y recomendaciones de ingreso.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-teal-950 block">🎟️ Pase QR Personal</span>
                <span className="text-slate-600">Busca por número de teléfono y envía el enlace de descarga.</span>
              </div>
            </div>
          </div>

          <div className="bg-teal-50/90 p-5 rounded-2xl border border-teal-200 text-xs space-y-2">
            <p className="font-extrabold text-teal-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-700" /> Respuesta Anti-Baneo
            </p>
            <p className="text-teal-900">
              El motor simula el estado <i>"escribiendo..."</i> durante 1.5 segundos antes de enviar cada mensaje para garantizar máxima naturalidad.
            </p>
          </div>
        </div>

        {/* SIMULADOR EN TIEMPO REAL */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col h-[520px] overflow-hidden">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-sm text-white">
                🤖
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-white">Simulador Interactivo del Chatbot IA</h3>
                <p className="text-[10px] text-teal-400">Prueba cómo responderá el bot a los usuarios</p>
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
                    text: "👋 ¡Hola! Soy el Asistente Virtual Inteligente IA de Doxa Eventos. ¿En qué te puedo ayudar hoy?",
                    time: "Ahora",
                  },
                ])
              }
              className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs h-8 px-2 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Limpiar Chat
            </Button>
          </div>

          {/* ÁREA DE MENSAJES */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
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
                <Bot className="w-4 h-4 text-teal-600 animate-spin" /> Chatbot escribiendo respuesta...
              </div>
            )}
          </div>

          {/* FORMULARIO DE PRUEBA */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <Input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Escribe un mensaje de prueba (ej: 1, ¿dónde es?, ¿cuándo es?, mi qr)..."
              className="bg-slate-50 border-slate-300 text-xs text-slate-900 h-10 rounded-xl flex-1"
            />
            <Button type="submit" disabled={simulating || !testInput.trim()} className="bg-teal-700 hover:bg-teal-800 text-white font-bold h-10 px-4 rounded-xl shadow-xs shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
