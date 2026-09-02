import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  loadStoredContacts,
  saveStoredContacts,
  loadStoredFolders,
  StoredContact,
  BroadcastFolder,
} from "../WhatsAppContacts";
import { personalizeMessage, CrmContact } from "@/lib/whatsapp-crm";
import { toast } from "sonner";
import { processWhatsAppMessageIntent } from "@/lib/whatsapp-bot";
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
  ShieldCheck,
  UserPlus,
  Radio,
  Folder,
  Bot,
  Sparkles,
  Trash2,
  ArrowLeft,
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

const CHATS_STORAGE_KEY = "cmg_whatsapp_chats_v2";
const MESSAGES_STORAGE_KEY = "cmg_whatsapp_messages_v2";

export function loadStoredChats(): Chat[] {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredChats(chatsList: Chat[]) {
  try {
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chatsList));
    supabase
      .from("app_secrets")
      .upsert(
        { key: "WA_CLOUD_CHATS", value: JSON.stringify(chatsList), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .then(({ error }) => {
        if (error) console.warn("Cloud sync warning (chats):", error);
      });
  } catch (err) {
    console.error("Error saving chats:", err);
  }
}

export function loadStoredMessagesMap(): Record<string, Message[]> {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredMessagesMap(map: Record<string, Message[]>) {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(map));
    supabase
      .from("app_secrets")
      .upsert(
        { key: "WA_CLOUD_MESSAGES", value: JSON.stringify(map), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .then(({ error }) => {
        if (error) console.warn("Cloud sync warning (messages):", error);
      });
  } catch (err) {
    console.error("Error saving messages map:", err);
  }
}

interface WhatsAppChatProps {
  selectedContact?: { name: string; phone: string } | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_BROADCAST_TEMPLATE = `Hola {{nombre}} 👋

Te enviamos este mensaje para recordarte la información importante del evento.

¡Contamos con tu asistencia!`;

export function WhatsAppChat({ selectedContact }: WhatsAppChatProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingState, setTypingState] = useState(false);
  const [antiBanMode, setAntiBanMode] = useState(true);
  const [aiBotActive, setAiBotActive] = useState(true);
  const [waConfig, setWaConfig] = useState({ url: "", token: "" });
  const [status, setStatus] = useState<"connected" | "qr" | "disconnected" | "checking">("checking");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estados para Difusión por Carpeta
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [storedFolders, setStoredFolders] = useState<BroadcastFolder[]>([]);
  const [storedContacts, setStoredContacts] = useState<StoredContact[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [broadcastTemplate, setBroadcastTemplate] = useState(DEFAULT_BROADCAST_TEMPLATE);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0 });
  const [broadcastStatusText, setBroadcastStatusText] = useState("");
  const abortBroadcastRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    syncChatsFromCloud();
    setStoredFolders(loadStoredFolders());
    setStoredContacts(loadStoredContacts());
  }, []);

  useEffect(() => {
    if (selectedContact && selectedContact.phone) {
      const cleanPhone = selectedContact.phone.replace(/[^\d]/g, "");
      const chatObj: Chat = {
        id: cleanPhone,
        name: selectedContact.name || cleanPhone,
      };
      setActiveChat(chatObj);

      setChats((prev) => {
        const exists = prev.some((c) => c.id === cleanPhone);
        const updated = exists ? prev : [chatObj, ...prev];
        saveStoredChats(updated);
        return updated;
      });

      fetchMessages(cleanPhone);
    }
  }, [selectedContact]);

  // 🔄 RECEPTOR EN TIEMPO REAL: Auto-polling de mensajes entrantes cada 3.5 segundos
  useEffect(() => {
    if (status !== "connected" || !waConfig.url) return;

    const interval = setInterval(async () => {
      fetchChats(waConfig.url, waConfig.token);

      if (activeChat) {
        try {
          const cleanUrl = waConfig.url.replace(/\/$/, "");
          const res = await fetch(`${cleanUrl}/chats/${encodeURIComponent(activeChat.id)}/messages`, {
            headers: { Authorization: `Bearer ${waConfig.token}` },
          });

          if (res.ok) {
            const raw = await res.json();
            const data = Array.isArray(raw) ? raw : (raw.messages || []);
            if (Array.isArray(data) && data.length > 0) {
              const formatted: Message[] = data.map((m: any) => ({
                id: String(m.id || Date.now()),
                fromMe: Boolean(m.fromMe),
                body: m.body || m.text || "",
                timestamp: typeof m.timestamp === "number" ? m.timestamp : Math.floor(new Date(m.timestamp).getTime() / 1000),
              }));

              setMessages((prevMsgs) => {
                const lastPrev = prevMsgs[prevMsgs.length - 1];
                const lastNew = formatted[formatted.length - 1];

                if (lastNew && (!lastPrev || lastNew.id !== lastPrev.id || lastNew.body !== lastPrev.body)) {
                  if (!lastNew.fromMe && prevMsgs.length > 0) {
                    toast.info(`💬 Nuevo mensaje de ${activeChat.name || activeChat.id}: "${lastNew.body.slice(0, 35)}..."`);
                    
                    if (aiBotActive) {
                      processWhatsAppMessageIntent(lastNew.body, activeChat.id).then(({ replyText, rsvpStatus }) => {
                        if (replyText) {
                          const botMsg: Message = {
                            id: `bot-reply-${Date.now()}`,
                            fromMe: false,
                            body: replyText,
                            timestamp: Math.floor(Date.now() / 1000),
                          };
                          setMessages((curr) => [...curr, botMsg]);
                          if (rsvpStatus) {
                            toast.success(`RSVP auto-registrado: ${rsvpStatus.toUpperCase()}`);
                          }
                        }
                      });
                    }
                  }
                }
                return formatted;
              });
            }
          }
        } catch (_) {}
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [status, waConfig.url, waConfig.token, activeChat?.id, aiBotActive]);

  const syncChatsFromCloud = async () => {
    try {
      const { data } = await supabase
        .from("app_secrets")
        .select("key, value")
        .in("key", ["WA_CLOUD_CHATS", "WA_CLOUD_MESSAGES"]);

      const cloudChatsRaw = data?.find((d) => d.key === "WA_CLOUD_CHATS")?.value;

      if (cloudChatsRaw) {
        const parsed = JSON.parse(cloudChatsRaw);
        setChats(parsed);
        localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(parsed));
      } else {
        setChats(loadStoredChats());
      }
    } catch {
      setChats(loadStoredChats());
    }
  };

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
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw : (raw.chats || []);
        if (Array.isArray(data)) {
          setChats((prev) => {
            const map = new Map<string, Chat>();
            prev.forEach((c) => map.set(c.id, c));
            data.forEach((c) => {
              const id = String(c.id || c.phone);
              map.set(id, { id, name: c.name || id, lastMessage: c.lastMessage || c.body, timestamp: c.timestamp, unreadCount: c.unreadCount || c.unread });
            });
            const merged = Array.from(map.values());
            saveStoredChats(merged);
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn("Uso de conversaciones almacenadas previamente");
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    const map = loadStoredMessagesMap();
    if (map[chatId] && map[chatId].length > 0) {
      setMessages(map[chatId]);
    }

    if (!waConfig.url) return;
    setLoadingMessages(true);
    try {
      const cleanUrl = waConfig.url.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/chats/${encodeURIComponent(chatId)}/messages`, {
        headers: { Authorization: `Bearer ${waConfig.token}` },
      });
      if (res.ok) {
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw : (raw.messages || []);
        if (Array.isArray(data)) {
          const formatted: Message[] = data.map((m: any) => ({
            id: String(m.id || Date.now()),
            fromMe: Boolean(m.fromMe),
            body: m.body || m.text || "",
            timestamp: typeof m.timestamp === "number" ? m.timestamp : Math.floor(new Date(m.timestamp).getTime() / 1000),
          }));
          setMessages(formatted);
          const updatedMap = { ...loadStoredMessagesMap(), [chatId]: formatted };
          saveStoredMessagesMap(updatedMap);
        }
      }
    } catch (err) {
      console.warn("Uso de caché local para mensajes de", chatId);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteChat = (chatId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("¿Seguro que deseas eliminar esta conversación y todo su historial de mensajes?")) {
      setChats((prev) => {
        const updated = prev.filter((c) => c.id !== chatId);
        saveStoredChats(updated);
        return updated;
      });

      const currentMap = loadStoredMessagesMap();
      delete currentMap[chatId];
      saveStoredMessagesMap(currentMap);

      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }

      toast.info("Conversación eliminada correctamente");
    }
  };

  const sendPresenceTyping = async (phone: string) => {
    if (!waConfig.url) return;
    try {
      const cleanUrl = waConfig.url.replace(/\/$/, "");
      await fetch(`${cleanUrl}/presence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waConfig.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, state: "composing" }),
      }).catch(() => {});
    } catch (_) {}
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !waConfig.url) return;

    const messageText = newMessage.trim();
    setSending(true);

    try {
      const cleanUrl = waConfig.url.replace(/\/$/, "");

      if (antiBanMode) {
        setTypingState(true);
        await sendPresenceTyping(activeChat.id);
        const typingDuration = Math.min(3200, Math.max(1500, messageText.length * 40));
        await sleep(typingDuration);
        setTypingState(false);
      }

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
        const nowTs = Math.floor(Date.now() / 1000);
        const localMsg: Message = {
          id: `temp-${Date.now()}`,
          fromMe: true,
          body: messageText,
          timestamp: nowTs,
        };

        setMessages((prev) => {
          const updatedMsgs = [...prev, localMsg];
          const map = loadStoredMessagesMap();
          saveStoredMessagesMap({ ...map, [activeChat.id]: updatedMsgs });
          return updatedMsgs;
        });

        setChats((prev) => {
          const exists = prev.some((c) => c.id === activeChat.id);
          let updated: Chat[];
          if (exists) {
            updated = prev.map((c) =>
              c.id === activeChat.id ? { ...c, lastMessage: messageText, timestamp: nowTs } : c
            );
          } else {
            updated = [{ id: activeChat.id, name: activeChat.name, lastMessage: messageText, timestamp: nowTs }, ...prev];
          }
          saveStoredChats(updated);
          return updated;
        });

        // 🤖 Si el Chatbot IA está activo y se envía una pregunta o confirmación 1/2, generar respuesta IA
        if (aiBotActive) {
          setTimeout(async () => {
            const { replyText, rsvpStatus } = await processWhatsAppMessageIntent(messageText, activeChat.id);
            if (replyText) {
              const botMsg: Message = {
                id: `bot-${Date.now()}`,
                fromMe: false,
                body: replyText,
                timestamp: Math.floor(Date.now() / 1000),
              };
              setMessages((prev) => [...prev, botMsg]);
              if (rsvpStatus) {
                toast.success(`RSVP registrado: ${rsvpStatus.toUpperCase()}`);
              }
            }
          }, 1200);
        } else {
          setTimeout(() => fetchMessages(activeChat.id), 800);
        }
      } else {
        toast.error("Error al enviar el mensaje de WhatsApp");
      }
    } catch (err) {
      toast.error("Error de conexión al enviar mensaje");
    } finally {
      setSending(false);
      setTypingState(false);
    }
  };

  const handleSimulateIncomingAiMessage = async (queryText: string) => {
    if (!activeChat) return;
    setTypingState(true);
    await sleep(1000);
    const { replyText, rsvpStatus } = await processWhatsAppMessageIntent(queryText, activeChat.id);
    setTypingState(false);

    const botMsg: Message = {
      id: `bot-reply-${Date.now()}`,
      fromMe: false,
      body: replyText,
      timestamp: Math.floor(Date.now() / 1000),
    };
    setMessages((prev) => [...prev, botMsg]);
    if (rsvpStatus) {
      toast.success(`RSVP registrado automáticamente: ${rsvpStatus.toUpperCase()}`);
    }
  };

  const handleOpenBroadcastModal = () => {
    setStoredFolders(loadStoredFolders());
    setStoredContacts(loadStoredContacts());
    setIsBroadcastModalOpen(true);
  };

  // Obtener contactos pertenecientes a la carpeta seleccionada en el modal
  const targetFolderContacts = React.useMemo(() => {
    if (!selectedFolderId) return [];
    const folder = storedFolders.find((f) => f.id === selectedFolderId);
    if (!folder) return [];
    return storedContacts.filter(
      (c) => folder.contactIds.includes(c.id) || (c.folderIds || []).includes(selectedFolderId)
    );
  }, [selectedFolderId, storedFolders, storedContacts]);

  // Vista previa personalizada del 1er contacto
  const broadcastPreview = React.useMemo(() => {
    const sample = targetFolderContacts[0] || {
      id: "preview",
      nombre: "Juan Pérez",
      telefono: "573001234567",
      categoria: "Servidores",
      createdAt: "",
    };
    const crmC: CrmContact = {
      id: sample.id,
      nombre: sample.nombre,
      telefono: sample.telefono,
      telefonoRaw: sample.telefono,
      extra: { categoria: sample.categoria || "" },
      status: "pending",
    };
    return personalizeMessage(broadcastTemplate, crmC);
  }, [selectedFolderId, targetFolderContacts, broadcastTemplate]);

  // Lanzar Difusión por Carpeta
  const handleStartFolderBroadcast = async () => {
    if (!selectedFolderId || targetFolderContacts.length === 0) {
      toast.error("Selecciona una carpeta con al menos 1 contacto");
      return;
    }
    if (!broadcastTemplate.trim()) {
      toast.error("Escribe el mensaje de difusión");
      return;
    }
    if (!waConfig.url) {
      toast.error("WhatsApp no está configurado. Conecta el servidor primero.");
      return;
    }

    const cleanUrl = waConfig.url.replace(/\/$/, "");
    abortBroadcastRef.current = false;
    setSendingBroadcast(true);
    setBroadcastProgress({ current: 0, total: targetFolderContacts.length });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < targetFolderContacts.length; i++) {
      if (abortBroadcastRef.current) break;
      const contact = targetFolderContacts[i];

      const crmC: CrmContact = {
        id: contact.id,
        nombre: contact.nombre,
        telefono: contact.telefono,
        telefonoRaw: contact.telefono,
        extra: { categoria: contact.categoria || "" },
        status: "pending",
      };

      const personalizedText = personalizeMessage(broadcastTemplate, crmC);

      // Anti-Ban 1: Simular Tipeo
      if (antiBanMode) {
        setBroadcastStatusText(`Simulando tipeo para ${contact.nombre}...`);
        await sendPresenceTyping(contact.telefono);
        const typingDuration = Math.min(2500, Math.max(1200, personalizedText.length * 30));
        await sleep(typingDuration);
      }

      setBroadcastStatusText(`Enviando a ${contact.nombre}...`);

      try {
        const res = await fetch(`${cleanUrl}/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waConfig.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: contact.telefono,
            message: personalizedText,
          }),
        });

        if (res.ok) sent++;
        else failed++;
      } catch (err) {
        failed++;
      }

      setBroadcastProgress({ current: i + 1, total: targetFolderContacts.length });

      // Anti-Ban 2: Retardo aleatorio
      if (!abortBroadcastRef.current && i < targetFolderContacts.length - 1) {
        const jitter = antiBanMode ? 1200 + Math.floor(Math.random() * 1500) : 800;
        setBroadcastStatusText(`Pausa de seguridad (${(jitter / 1000).toFixed(1)}s)...`);
        await sleep(jitter);
      }
    }

    setSendingBroadcast(false);
    setBroadcastStatusText("");
    if (abortBroadcastRef.current) {
      toast.message("Difusión cancelada");
    } else {
      toast.success(`Difusión por carpeta finalizada: ${sent} enviados, ${failed} fallidos`);
      setIsBroadcastModalOpen(false);
      fetchChats();
    }
  };

  const handleAddActiveChatToContacts = () => {
    if (!activeChat) return;
    const existing = loadStoredContacts();
    const cleanPhone = activeChat.id.replace(/[^\d]/g, "");
    if (existing.some((c) => c.telefono === cleanPhone)) {
      toast.info("El contacto ya se encuentra en tu agenda");
      return;
    }

    const newC: StoredContact = {
      id: `manual-${Date.now()}`,
      nombre: activeChat.name || cleanPhone,
      telefono: cleanPhone,
      categoria: "Chat WhatsApp",
      createdAt: new Date().toISOString(),
    };

    saveStoredContacts([newC, ...existing]);
    toast.success(`Contacto ${newC.nombre} guardado en tu libreta de contactos`);
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
      {/* Cabecera de estado y Difusión */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 text-teal-700">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Chat Interactivo de WhatsApp</h2>
            <p className="text-xs text-slate-500 font-medium">
              Mensajería 1 a 1 y difusiones grupales personalizadas por carpetas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botón Difusión por Carpeta */}
          <Button
            onClick={handleOpenBroadcastModal}
            className="h-10 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs shadow-xs"
          >
            <Radio className="w-4 h-4 mr-1.5 animate-pulse" /> 📢 Difusión por Carpeta
          </Button>

          {/* Toggle Anti-Baneo */}
          <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <Label htmlFor="anti-ban-chat" className="text-xs font-extrabold text-emerald-900 cursor-pointer">
              Anti-Baneo
            </Label>
            <Switch
              id="anti-ban-chat"
              checked={antiBanMode}
              onCheckedChange={setAntiBanMode}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {/* Toggle Chatbot IA 24/7 */}
          <div className="flex items-center gap-2 bg-teal-50/80 border border-teal-200 px-3 py-1.5 rounded-full">
            <Bot className="w-4 h-4 text-teal-700" />
            <Label htmlFor="ai-bot-chat" className="text-xs font-extrabold text-teal-950 cursor-pointer">
              Chatbot IA 24/7
            </Label>
            <Switch
              id="ai-bot-chat"
              checked={aiBotActive}
              onCheckedChange={setAiBotActive}
              className="data-[state=checked]:bg-teal-600"
            />
          </div>

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
              ? "Conectado"
              : status === "checking"
              ? "Verificando..."
              : "Desconectado"}
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
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex-col bg-slate-50/50 ${activeChat ? "hidden md:flex" : "flex"}`}>
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
                  Usa el botón "📢 Difusión por Carpeta" para escribirle a grupos.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredChats.map((chat) => {
                  const isSelected = activeChat?.id === chat.id;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat);
                        fetchMessages(chat.id);
                      }}
                      className={`w-full p-3.5 text-left transition-colors flex items-start justify-between gap-3 cursor-pointer group ${
                        isSelected
                          ? "bg-teal-50/80 border-l-4 border-teal-600"
                          : "hover:bg-slate-100/70 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
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
                      </div>

                      {/* Botón Eliminar Chat */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        title="Eliminar conversación"
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Panel principal de conversación */}
        <div className={`flex-1 flex-col bg-slate-50/30 ${!activeChat ? "hidden md:flex" : "flex"}`}>
          {activeChat ? (
            <>
              {/* Encabezado del chat activo */}
              <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveChat(null)}
                    className="md:hidden text-teal-800 font-extrabold text-xs px-2.5 h-8 rounded-xl bg-teal-50 border border-teal-200 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1 text-teal-700" /> Volver
                  </Button>

                  <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white font-black flex items-center justify-center text-sm shrink-0">
                    {activeChat.name ? activeChat.name[0].toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5 truncate">
                      <span className="truncate">{activeChat.name}</span>
                      {typingState && (
                        <span className="text-[11px] font-semibold text-teal-600 animate-pulse italic shrink-0">
                          (Escribiendo...)
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3 text-teal-600 shrink-0" /> {activeChat.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddActiveChatToContacts}
                    className="rounded-xl border-slate-200 text-teal-800 font-extrabold text-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1 text-teal-600" /> Guardar Contacto
                  </Button>

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

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteChat(activeChat.id)}
                    className="rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Eliminar Chat
                  </Button>
                </div>
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
                    <p className="text-xs font-semibold">No hay mensajes en este chat. Escribe abajo para iniciar conversación.</p>
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

              {/* Barra de Pruebas Rápidas de IA / RSVP */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-extrabold text-teal-800 uppercase shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600" /> Pruebas IA:
                </span>
                <button
                  type="button"
                  onClick={() => handleSimulateIncomingAiMessage("¿A qué hora empieza el evento?")}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-teal-300 rounded-full text-[11px] font-semibold text-slate-700 shrink-0"
                >
                  📅 ¿Horario?
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateIncomingAiMessage("¿Dónde es la dirección del evento?")}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-teal-300 rounded-full text-[11px] font-semibold text-slate-700 shrink-0"
                >
                  📍 ¿Ubicación?
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateIncomingAiMessage("¿Dónde puedo descargar mi pase QR?")}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-teal-300 rounded-full text-[11px] font-semibold text-slate-700 shrink-0"
                >
                  🎟️ ¿Mi Pase QR?
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateIncomingAiMessage("1")}
                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-full text-[11px] font-bold text-emerald-900 shrink-0"
                >
                  ✅ Responder 1 (Confirmar)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateIncomingAiMessage("2")}
                  className="px-2.5 py-1 bg-red-50 border border-red-300 hover:bg-red-100 rounded-full text-[11px] font-bold text-red-900 shrink-0"
                >
                  ❌ Responder 2 (Declinar)
                </button>
              </div>

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
                  placeholder={typingState ? "Simulando tipeo..." : "Escribe un mensaje de WhatsApp..."}
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
              <h4 className="text-base font-extrabold text-slate-700">Selecciona una conversación o lanza una difusión</h4>
              <p className="text-xs text-slate-500 max-w-sm font-medium">
                Elige un contacto de la izquierda o haz clic en "📢 Difusión por Carpeta" para enviarle a todo un grupo con su nombre personalizado.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Difusión Personalizada por Carpeta */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent className="max-w-xl bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-teal-600" /> Difusión Personalizada por Carpeta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1.5 block">Seleccionar Carpeta / Grupo *</Label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                disabled={sendingBroadcast}
                className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold bg-white"
              >
                <option value="">-- Elige una carpeta de contactos --</option>
                {storedFolders.map((folder) => {
                  const count = storedContacts.filter(
                    (c) => folder.contactIds.includes(c.id) || (c.folderIds || []).includes(folder.id)
                  ).length;
                  return (
                    <option key={folder.id} value={folder.id}>
                      📂 {folder.nombre} ({count} integrantes)
                    </option>
                  );
                })}
              </select>
              {storedFolders.length === 0 && (
                <p className="text-xs text-amber-700 mt-1 font-semibold">
                  No hay carpetas creadas. Ve al módulo "Agenda Contactos" para crear grupos.
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1.5 block">Mensaje de Difusión (Personalizado)</Label>
              <Textarea
                value={broadcastTemplate}
                onChange={(e) => setBroadcastTemplate(e.target.value)}
                disabled={sendingBroadcast}
                rows={5}
                className="rounded-xl border-slate-300 text-sm font-medium"
                placeholder="Hola {{nombre}}, ..."
              />
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Usa <span className="font-bold text-teal-700">{"{{nombre}}"}</span> para reemplazar dinámicamente el nombre de cada destinatario.
              </p>
            </div>

            {selectedFolderId && targetFolderContacts.length > 0 && (
              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-1 text-xs">
                <p className="font-bold text-teal-950 uppercase text-[10px]">Vista previa para: {targetFolderContacts[0].nombre}</p>
                <p className="whitespace-pre-wrap text-slate-800 font-medium">{broadcastPreview}</p>
              </div>
            )}

            {sendingBroadcast && (
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Enviando difusión con Anti-Baneo...</span>
                  <span>{broadcastProgress.current} de {broadcastProgress.total}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full transition-all duration-300"
                    style={{ width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%` }}
                  />
                </div>
                {broadcastStatusText && (
                  <p className="text-xs text-teal-700 font-semibold animate-pulse">{broadcastStatusText}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 flex items-center justify-between gap-3">
            {sendingBroadcast ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => { abortBroadcastRef.current = true; }}
                className="rounded-xl border-slate-300 font-bold"
              >
                Cancelar Difusión
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="rounded-xl border-slate-300 font-bold"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleStartFolderBroadcast}
                  disabled={!selectedFolderId || targetFolderContacts.length === 0 || !broadcastTemplate.trim()}
                  className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold"
                >
                  <Send className="w-4 h-4 mr-2" /> Lanzar Difusión ({targetFolderContacts.length} destinatarios)
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
