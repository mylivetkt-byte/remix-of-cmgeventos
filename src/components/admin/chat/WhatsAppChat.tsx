import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Search,
  MessageCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  User,
  Phone,
  CheckCheck,
} from "lucide-react";

interface Message {
  id: string;
  fromMe: boolean;
  body: string;
  timestamp: number;
}

interface Chat {
  id: string;
  name: string;
  unreadCount?: number;
  lastMessage?: string;
  timestamp?: number;
}

export function WhatsAppChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [waConfig, setWaConfig] = useState({ url: "", token: "" });
  const [status, setStatus] = useState<"connected" | "qr" | "disconnected" | "checking">("checking");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final de la lista de mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar configuración de WhatsApp desde Supabase secrets
  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from("app_secrets")
        .select("key, value")
        .in("key", ["WA_SERVER_URL", "WA_API_TOKEN"]);

      const url = data?.find((d) => d.key === "WA_SERVER_URL")?.value || "";
      const token = data?.find((d) => d.key === "WA_API_TOKEN")?.value || "";
      setWaConfig({ url, token });

      if (url) {
        checkServerStatus(url);
        fetchChats(url, token);
      } else {
        setStatus("disconnected");
      }
    } catch (err) {
      console.error("Error al cargar configuración de WhatsApp:", err);
      setStatus("disconnected");
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const checkServerStatus = async (url = waConfig.url) => {
    if (!url) return;
    setStatus("checking");
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/status`);
      const data = await res.json();
      setStatus(data.status || "disconnected");
    } catch {
      setStatus("disconnected");
    }
  };

  const fetchChats = async (url = waConfig.url, token = waConfig.token) => {
    if (!url) return;
    setLoadingChats(true);
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setChats(data);
        }
      }
    } catch (err) {
      console.error("Error al obtener chats de WhatsApp:", err);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    if (!waConfig.url) return;
    setLoadingMessages(true);
    try {
      const cleanUrl = waConfig.url.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/chats/${encodeURIComponent(chatId)}/messages`, {
        headers: { Authorization: `Bearer ${waConfig.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(data);
        }
      } else {
        toast.error("No se pudieron cargar los mensajes");
      }
    } catch (err) {
      toast.error("Error de conexión al obtener mensajes");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !waConfig.url) return;

    const messageText = newMessage.trim();
    setSending(true);

    try {
      const cleanUrl = waConfig.url.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waConfig.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: activeChat.id,
          message: messageText,
        }),
      });

      if (res.ok) {
        setNewMessage("");
        // Añadir mensaje localmente para feedback inmediato
        const localMsg: Message = {
          id: `temp-${Date.now()}`,
          fromMe: true,
          body: messageText,
          timestamp: Math.floor(Date.now() / 1000),
        };
        setMessages((prev) => [...prev, localMsg]);
        // Refrescar mensajes reales
        setTimeout(() => fetchMessages(activeChat.id), 800);
      } else {
        toast.error("Error al enviar el mensaje de WhatsApp");
      }
    } catch (err) {
      toast.error("Error de conexión al enviar mensaje");
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4 animate-fade-in font-sans text-slate-900">
      {/* Cabecera de estado */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 text-teal-700">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Chat Interactivo de WhatsApp</h2>
            <p className="text-xs text-slate-500 font-medium">
              Gestión de conversaciones 1 a 1 con tus asistentes y registrados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            className={`px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 text-xs border ${
              status === "connected"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : status === "checking"
                ? "bg-slate-100 text-slate-700 border-slate-300"
                : "bg-red-50 text-red-900 border-red-300"
            }`}
          >
            {status === "connected" && <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            {status === "checking" && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />}
            {status === "disconnected" && <WifiOff className="w-3.5 h-3.5 text-red-500" />}
            {status === "connected"
              ? "WhatsApp Conectado"
              : status === "checking"
              ? "Verificando..."
              : "WhatsApp Desconectado"}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadConfig()}
            className="rounded-xl border-slate-300 text-slate-700 font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refrescar
          </Button>
        </div>
      </div>

      {/* Interfaz principal del Chat */}
      <div className="flex flex-col md:flex-row h-[650px] bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Panel lateral de chats */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-200/80 space-y-3 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversación..."
                className="pl-9 h-10 rounded-xl border-slate-200 text-xs font-semibold bg-slate-50"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loadingChats ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                <span className="text-xs font-medium">Cargando conversaciones...</span>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-medium space-y-2">
                <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p>No se encontraron conversaciones activas.</p>
                <p className="text-[11px] text-slate-400">
                  Asegúrate de tener mensajes entrantes o haber enviado campañas desde el CRM.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredChats.map((chat) => {
                  const isSelected = activeChat?.id === chat.id;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat);
                        fetchMessages(chat.id);
                      }}
                      className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 ${
                        isSelected
                          ? "bg-teal-50/80 border-l-4 border-teal-600"
                          : "hover:bg-slate-100/70 bg-white"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center shrink-0 text-sm">
                        {chat.name ? chat.name[0].toUpperCase() : <User className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="font-extrabold text-sm text-slate-900 truncate">
                            {chat.name || chat.id}
                          </p>
                          {chat.timestamp && (
                            <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                              {formatTime(chat.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate font-medium">
                          {chat.lastMessage || "Sin mensajes previos"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Panel principal de conversación */}
        <div className="flex-1 flex flex-col bg-slate-50/30">
          {activeChat ? (
            <>
              {/* Encabezado del chat activo */}
              <div className="px-6 py-4 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-black flex items-center justify-center text-base">
                    {activeChat.name ? activeChat.name[0].toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{activeChat.name}</h3>
                    <p className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-teal-600" /> {activeChat.id}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchMessages(activeChat.id)}
                  disabled={loadingMessages}
                  className="rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingMessages ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
              </div>

              {/* Área de mensajes scrollable */}
              <ScrollArea className="flex-1 p-6">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                    <span className="text-xs font-semibold">Cargando mensajes de la conversación...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                    <MessageCircle className="w-10 h-10 text-slate-300" />
                    <p className="text-xs font-semibold">No hay mensajes cargados en este chat.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl p-3.5 shadow-2xs text-sm font-medium leading-relaxed ${
                            msg.fromMe
                              ? "bg-teal-700 text-white rounded-br-none"
                              : "bg-white border border-slate-200/80 text-slate-900 rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1.5 font-semibold ${
                              msg.fromMe ? "text-teal-200" : "text-slate-400"
                            }`}
                          >
                            <span>{formatTime(msg.timestamp)}</span>
                            {msg.fromMe && <CheckCheck className="w-3 h-3 text-teal-200" />}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Área de envío de mensajes */}
              <div className="p-4 bg-white border-t border-slate-200/80 flex items-center gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Escribe un mensaje de WhatsApp..."
                  disabled={sending || status !== "connected"}
                  className="flex-1 h-12 rounded-2xl border-slate-300 text-sm font-semibold bg-slate-50 focus:bg-white"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim() || status !== "connected"}
                  className="h-12 px-5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold shadow-sm shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Enviar
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3">
              <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h4 className="text-base font-extrabold text-slate-700">Selecciona una conversación</h4>
              <p className="text-xs text-slate-500 max-w-sm font-medium">
                Elige un contacto de la lista izquierda para ver el historial de chat y responder mensajes directamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
