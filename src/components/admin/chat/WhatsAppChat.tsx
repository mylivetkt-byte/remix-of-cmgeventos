import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface Message {
  id: string;
  fromMe: boolean;
  body: string;
  timestamp: number;
}

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
}

export function WhatsAppChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [waConfig, setWaConfig] = useState({ url: "", token: "" });

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from("app_secrets")
        .select("key, value")
        .in("key", ["WA_SERVER_URL", "WA_API_TOKEN"]);
      
      const url = data?.find((d) => d.key === "WA_SERVER_URL")?.value || "";
      const token = data?.find((d) => d.key === "WA_API_TOKEN")?.value || "";
      setWaConfig({ url, token });
      
      if (url && token) {
        fetch(`${url}/chats`, { headers: { "Authorization": `Bearer ${token}` } })
          .then((res) => res.json())
          .then((data) => Array.isArray(data) && setChats(data))
          .catch(console.error);
      }
    };
    loadConfig();
  }, []);

  const fetchMessages = async (chatId: string) => {
    if (!waConfig.url) return;
    try {
      const res = await fetch(`${waConfig.url}/chats/${chatId}/messages`, {
        headers: { "Authorization": `Bearer ${waConfig.token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (err) {
      toast.error("Error al cargar mensajes");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !waConfig.url) return;
    setLoading(true);
    try {
      const res = await fetch(`${waConfig.url}/send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${waConfig.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: activeChat.id, message: newMessage }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages(activeChat.id);
      } else {
        toast.error("Error al enviar");
      }
    } catch (err) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[600px] bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="w-1/3 border-r border-slate-200 overflow-y-auto">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => {
              setActiveChat(chat);
              fetchMessages(chat.id);
            }}
            className="w-full p-4 hover:bg-slate-50 text-left border-b border-slate-100"
          >
            <p className="font-bold">{chat.name}</p>
            <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 mb-2 rounded-lg ${
                msg.fromMe ? "bg-teal-600 text-white ml-auto" : "bg-slate-100"
              } max-w-[80%]`}
            >
              {msg.body}
            </div>
          ))}
        </ScrollArea>
        <div className="p-4 border-t border-slate-200 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe..."
          />
          <Button onClick={handleSendMessage} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </div>
  );
}
