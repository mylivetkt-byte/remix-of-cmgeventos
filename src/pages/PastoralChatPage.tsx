import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Heart,
  Calendar,
  ShieldCheck,
  Brain,
  ArrowLeft,
  Trash2,
  Flame,
  Radio,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmojiPickerPopover } from "@/components/chat/EmojiPickerPopover";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  PastoralChatService,
  PastoralMessage,
  SpiritualMemory,
  PastoralSession,
} from "@/services/pastoralChatService";
import { toast } from "sonner";

export const PastoralChatPage: React.FC = () => {
  const [session, setSession] = useState<PastoralSession | null>(null);
  const [messages, setMessages] = useState<PastoralMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showBrainModal, setShowBrainModal] = useState(false);
  const [memories, setMemories] = useState<SpiritualMemory[]>([]);
  const [userName, setUserName] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
    isRecording,
    recordingTime,
    transcript,
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime,
  } = useVoiceRecorder();

  // 1. Inicializar sesión y cargar mensajes
  useEffect(() => {
    const init = async () => {
      const sess = await PastoralChatService.getOrCreateSession();
      setSession(sess);
      setUserName(sess.user_name);

      const msgs = await PastoralChatService.loadMessages(sess.id);
      if (msgs.length === 0) {
        // Mensaje de bienvenida inicial
        const welcome = await PastoralChatService.generatePastorResponse(
          sess.id,
          "hola",
          [],
          sess.user_name
        );
        const saved = await PastoralChatService.saveMessage(
          sess.id,
          "assistant",
          welcome.text,
          welcome.intent
        );
        setMessages([saved]);
      } else {
        setMessages(msgs);
      }

      // Cargar memorias
      const mems = await PastoralChatService.loadSpiritualMemories(sess.id);
      setMemories(mems);
    };

    init();
  }, []);

  // 2. Si hay transcripción en tiempo real de voz, sincronizarla con el input
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // 3. Auto-scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isRecording]);

  // 4. Detener voz si se desmonta
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Enviar mensaje
  const handleSendMessage = async (textToSend?: string, audioBlobUrl?: string | null) => {
    const text = (textToSend ?? inputText).trim();
    if (!text && !audioBlobUrl) return;

    if (!session) return;

    setInputText("");
    setIsLoading(true);

    // Guardar mensaje de usuario
    const userMsg = await PastoralChatService.saveMessage(
      session.id,
      "user",
      text || "🎤 Mensaje de voz",
      "user_message",
      audioBlobUrl
    );
    setMessages((prev) => [...prev, userMsg]);

    // Extraer y actualizar nombre si aplica
    const detectedName = PastoralChatService.extractUserName(text);
    if (detectedName) {
      setUserName(detectedName);
      await PastoralChatService.updateUserName(session.id, detectedName);
    }

    // Generar respuesta pastoral
    try {
      const response = await PastoralChatService.generatePastorResponse(
        session.id,
        text,
        messages,
        userName || detectedName
      );

      const pastorMsg = await PastoralChatService.saveMessage(
        session.id,
        "assistant",
        response.text,
        response.intent
      );

      setMessages((prev) => [...prev, pastorMsg]);

      // Refrescar memorias
      const updatedMemories = await PastoralChatService.loadSpiritualMemories(session.id);
      setMemories(updatedMemories);
    } catch (err) {
      console.error("Error al generar respuesta:", err);
      toast.error("Ocurrió un inconveniente al recibir el mensaje pastoral.");
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de grabación de audio
  const handleToggleVoiceRecording = async () => {
    if (isRecording) {
      const { transcript: voiceText, audioBlob } = await stopRecording();
      const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;
      if (voiceText || audioUrl) {
        await handleSendMessage(voiceText || "Nota de voz grabada", audioUrl);
      }
    } else {
      await startRecording();
    }
  };

  // Reproducir voz del pastor (Text-to-Speech)
  const handleSpeakMessage = (msgId: string, text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Tu navegador no soporta lectura por voz.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Limpiar markdown básico para lectura fluida
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/[#*_>~`]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "es-ES";
    utterance.rate = 0.95; // Un poco más pausado y pastoral
    utterance.pitch = 0.98;

    // Buscar voz en español cálida si está disponible
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(
      (v) => v.lang.startsWith("es") && (v.name.includes("Natural") || v.name.includes("Pablo") || v.name.includes("Jorge") || v.name.includes("Google"))
    ) || voices.find((v) => v.lang.startsWith("es"));

    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Copiar mensaje
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Mensaje copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reiniciar conversación
  const handleResetChat = async () => {
    if (!session) return;
    if (confirm("¿Deseas iniciar una nueva conversación? Se limpiará la pantalla de este chat.")) {
      localStorage.removeItem(`pastoral_msgs_${session.id}`);
      setMessages([]);
      const welcome = await PastoralChatService.generatePastorResponse(
        session.id,
        "hola",
        [],
        userName
      );
      const saved = await PastoralChatService.saveMessage(
        session.id,
        "assistant",
        welcome.text,
        welcome.intent
      );
      setMessages([saved]);
      toast.success("Nueva conversación iniciada.");
    }
  };

  // Insertar emoji en el input
  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // Píldoras de acción rápida
  const quickPills = [
    { label: "Pedir una oración 🙏", text: "Pastor, necesito pedir una oración por mi vida y mi familia" },
    { label: "Necesito un consejo 🕊️", text: "Pastor, estoy pasando por un momento difícil y necesito un consejo bíblico" },
    { label: "¿Próximos eventos? 📅", text: "¿Qué eventos, retiros o actividades tienen en la iglesia próximamente?" },
    { label: "Conocer a Jesús ❤️", text: "Pastor, siento un vacío en mi corazón y quiero conocer a Jesús y salvar mi alma" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 font-sans">
      {/* 1. Header Pastoral */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-emerald-900/40 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Volver a los eventos"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Avatar Pastoral con Halo Dorado */}
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 via-teal-700 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-amber-400">
                  <Flame className="w-6 h-6 animate-pulse text-amber-400" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-white tracking-tight flex items-center gap-1.5">
                  Pastor Bernabé
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] py-0 px-1.5 font-medium">
                    CONSEJERO ESPIRITUAL
                  </Badge>
                </h1>
              </div>
              <p className="text-xs text-emerald-400/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                En línea • Oración, Consejería & Rescate de Almas
              </p>
            </div>
          </div>

          {/* Acciones del Encabezado */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBrainModal(true)}
              className="text-slate-300 hover:text-amber-300 hover:bg-slate-800 text-xs gap-1.5 rounded-xl border border-slate-700/60"
              title="Ver peticiones y memoria espiritual de la sesión"
            >
              <Brain className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Cerebro Espiritual</span>
              {memories.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                  {memories.length}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetChat}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              title="Iniciar nueva conversación"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Banner de Privacidad y Píldoras de Inicio Rápido */}
      <div className="bg-slate-950/60 border-b border-slate-800/60 px-4 py-2">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Sesión íntima y privada. Nadie más puede ver tus conversaciones ni oraciones.
            </span>
          </div>

          {userName && (
            <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-700/50 text-xs">
              Hermano/a: {userName}
            </Badge>
          )}
        </div>
      </div>

      {/* 3. Área de Mensajes del Chat */}
      <main className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Píldoras de sugerencias si hay pocos mensajes */}
          {messages.length <= 2 && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950/40 border border-emerald-800/30">
              <p className="text-xs font-semibold text-amber-300/90 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> ¿En qué podemos acompañarte hoy?
              </p>
              <div className="flex flex-wrap gap-2">
                {quickPills.map((pill) => (
                  <button
                    key={pill.label}
                    onClick={() => handleSendMessage(pill.text)}
                    className="text-xs font-medium bg-slate-800/90 hover:bg-emerald-900/50 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-600/50 px-3 py-1.5 rounded-full transition-all shadow-xs active:scale-95"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Listado de mensajes */}
          {messages.map((msg) => {
            const isPastor = msg.role === "assistant";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isPastor ? "justify-start" : "justify-end"} group`}
              >
                {/* Avatar Pastor */}
                {isPastor && (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-800 to-amber-600 p-0.5 shrink-0 shadow-sm mt-1">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
                      <Flame className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                )}

                {/* Burbuja de Mensaje */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-md relative ${
                    isPastor
                      ? "bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-xs"
                      : "bg-gradient-to-br from-teal-700 to-emerald-800 text-white rounded-tr-xs shadow-teal-900/20"
                  }`}
                >
                  {/* Encabezado de la burbuja */}
                  <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] opacity-80">
                    <span className="font-semibold flex items-center gap-1">
                      {isPastor ? "Pastor Bernabé" : userName || "Tú"}
                      {isPastor && msg.intent && (
                        <span className="capitalize px-1.5 py-0.2 bg-emerald-950/70 border border-emerald-700/40 text-[9px] rounded-md text-emerald-300 ml-1">
                          {msg.intent === "salvacion" ? "🕊️ Salvación" : msg.intent === "oracion" ? "🙏 Oración" : msg.intent === "evento" ? "📅 Evento" : "Consejería"}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px]">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Contenido con formato y saltos de línea */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-normal selection:bg-amber-500/30">
                    {msg.content}
                  </div>

                  {/* Reproductor de Audio si el mensaje incluye nota de voz */}
                  {msg.audio_url && (
                    <div className="mt-3 pt-2 border-t border-white/20">
                      <audio controls src={msg.audio_url} className="w-full h-8 rounded-lg" />
                    </div>
                  )}

                  {/* Acciones de la burbuja (Copiar, Escuchar con voz) */}
                  {isPastor && (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-700/60 text-slate-400">
                      {/* Botón de Escuchar Audio */}
                      <button
                        type="button"
                        onClick={() => handleSpeakMessage(msg.id, msg.content)}
                        className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors ${
                          speakingMessageId === msg.id
                            ? "bg-amber-500/20 text-amber-300 font-semibold animate-pulse"
                            : "hover:text-amber-300 hover:bg-slate-700/60"
                        }`}
                        title="Escuchar al Pastor orar / hablar"
                      >
                        {speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" /> Detener voz
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" /> Escuchar voz
                          </>
                        )}
                      </button>

                      {/* Botón Copiar */}
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="hover:text-white p-1 rounded-md transition-colors"
                        title="Copiar texto"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Indicador de "Escribiendo y orando..." */}
          {isLoading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs italic">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Flame className="w-4 h-4 text-amber-400 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700/60">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 text-slate-300 font-medium">El Pastor Bernabé está respondiendo con oración...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 4. Barra de Grabación en Vivo si el Micrófono está activo */}
      {isRecording && (
        <div className="bg-red-950/80 border-t border-red-800/60 px-4 py-2 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="font-semibold text-sm">Grabando audio: {formatTime(recordingTime)}</span>
              <span className="hidden sm:inline text-red-300 italic">
                (Habla libremente tu petición de oración o desahogo)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelRecording}
                className="text-red-300 hover:text-white hover:bg-red-900/60 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleToggleVoiceRecording}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 shadow-md"
              >
                <Check className="w-3.5 h-3.5" /> Enviar Audio
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Área de Entrada de Texto, Emojis y Audio */}
      <footer className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-3 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 focus-within:border-emerald-500/80 rounded-2xl px-3 py-1.5 transition-all shadow-inner"
          >
            {/* Selector de Emojis Popover */}
            <EmojiPickerPopover onSelectEmoji={handleInsertEmoji} disabled={isLoading || isRecording} />

            {/* Input de Texto */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? "Escuchando tu voz..." : "Escribe tu petición de oración, pregunta o consejería..."}
              disabled={isLoading || isRecording}
              className="flex-1 bg-transparent border-none text-sm text-slate-100 placeholder:text-slate-500 focus:outline-hidden px-2 py-2"
            />

            {/* Botón de Grabación de Audio */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleToggleVoiceRecording}
              disabled={isLoading}
              className={`rounded-xl transition-all ${
                isRecording
                  ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                  : "text-slate-400 hover:text-amber-400 hover:bg-slate-800"
              }`}
              title={isRecording ? "Detener y enviar audio" : "Grabar nota de voz con el micrófono"}
            >
              {isRecording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5" />}
            </Button>

            {/* Botón Enviar */}
            <Button
              type="submit"
              disabled={!inputText.trim() || isLoading || isRecording}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed h-10 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-[11px] text-center text-slate-500 mt-2">
            Este chat es un apoyo pastoral y espiritual fundamentado en la Biblia. En emergencias de salud o peligro, acude de inmediato a los servicios de auxilio.
          </p>
        </div>
      </footer>

      {/* 6. Modal del Cerebro Espiritual (Memoria en BD) */}
      <Dialog open={showBrainModal} onOpenChange={setShowBrainModal}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Brain className="w-5 h-5 text-amber-400" />
              Cerebro Espiritual & Memoria de la Sesión
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Aquí se guardan de forma confidencial tus motivos de oración y temas tratados para que el Pastor te recuerde en futuras visitas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-1 font-semibold">Identificador de Sesión Privada:</span>
              <code className="text-emerald-400 font-mono text-[11px] break-all">{session?.session_token}</code>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-1 font-semibold">Nombre reconocido:</span>
              <span className="text-white font-medium text-sm">
                {userName ? `Hermano/a ${userName}` : "No especificado aún (puedes decirle tu nombre al Pastor)"}
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-red-400" /> Motivos de Oración y Memorias Activas ({memories.length})
              </h4>

              {memories.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-950/40 rounded-xl">
                  Aún no se han registrado motivos en esta sesión. Cuando le pidas una oración al Pastor, se guardará aquí.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs flex items-start gap-2"
                    >
                      <span className="text-base">
                        {m.memory_type === "prayer_request"
                          ? "🙏"
                          : m.memory_type === "decision_christ"
                          ? "✨"
                          : m.memory_type === "family_need"
                          ? "🤍"
                          : "🕊️"}
                      </span>
                      <div className="flex-1">
                        <div className="text-slate-200 font-medium">{m.detail}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(m.created_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PastoralChatPage;
