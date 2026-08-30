import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "./whatsapp-crm";

export interface InstantTicketPayload {
  phone: string;
  name: string;
  registrationId: string;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  eventPlace?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Obtener credenciales de WhatsApp desde app_secrets en Supabase
 */
export async function getWhatsAppCredentials() {
  try {
    const { data } = await supabase
      .from("app_secrets")
      .select("key, value")
      .in("key", ["WA_SERVER_URL", "WA_API_TOKEN"]);

    const url = data?.find((d) => d.key === "WA_SERVER_URL")?.value || "";
    const token = data?.find((d) => d.key === "WA_API_TOKEN")?.value || "";
    return { url: url.replace(/\/$/, ""), token };
  } catch {
    return { url: "", token: "" };
  }
}

/**
 * Simular presencia "escribiendo..." en WhatsApp
 */
export async function sendPresenceTyping(phone: string, url: string, token: string) {
  if (!url) return;
  try {
    await fetch(`${url}/presence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone, state: "composing" }),
    }).catch(() => {});
  } catch (_) {}
}

/**
 * 📲 FEATURE 2: Envío Automático del Pase QR Inmediatamente tras el Registro
 */
export async function sendInstantWhatsAppTicket(payload: InstantTicketPayload): Promise<boolean> {
  const { url, token } = await getWhatsAppCredentials();
  if (!url || !token) {
    console.warn("Servidor WhatsApp no configurado en app_secrets.");
    return false;
  }

  const cleanPhone = normalizePhone(payload.phone);
  if (!cleanPhone || cleanPhone.length < 8) return false;

  const downloadUrl = `${window.location.origin}/descargar/${payload.registrationId}`;
  const eventTitle = payload.eventName || "Doxa Eventos";

  const messageText = `¡Hola ${payload.name}! 🎉

Tu registro para *${eventTitle}* ha sido confirmado exitosamente.

🎟️ *Descarga tu pase de entrada y Código QR aquí:*
${downloadUrl}

${payload.eventDate ? `📅 *Fecha:* ${payload.eventDate}\n` : ""}${payload.eventPlace ? `📍 *Lugar:* ${payload.eventPlace}\n` : ""}
¡Te esperamos en Doxa Eventos / Centro Mundial de Gloria!`;

  try {
    // Simulación de tipeo previo por seguridad Anti-Baneo
    await sendPresenceTyping(cleanPhone, url, token);
    await sleep(1500);

    const res = await fetch(`${url}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: messageText,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("Error al enviar pase automático por WhatsApp:", err);
    return false;
  }
}

/**
 * 🤖 FEATURE 1 & 3: Chatbot Inteligente IA 24/7 y Procesador RSVP Interactivo
 */
export async function processWhatsAppMessageIntent(
  incomingText: string,
  senderPhone: string
): Promise<{ replyText: string; rsvpStatus?: "confirmado" | "cancelado" }> {
  const text = incomingText.toLowerCase().trim();
  const cleanPhone = normalizePhone(senderPhone);

  // 1. Detección de RSVP Interactivo (Respuesta "1" o "2")
  if (text === "1" || text.includes("sí") || text.includes("si") || text.includes("confirmar") || text.includes("asistiré")) {
    // Actualizar registro en Supabase como Confirmado
    try {
      await (supabase.from("registrations") as any)
        .update({ asistio: true, estado_rsvp: "confirmado" })
        .or(`telefono.eq.${cleanPhone},telefono.eq.${senderPhone}`);
    } catch (_) {}

    return {
      replyText: `✅ ¡Excelente! Tu asistencia ha sido CONFIRMADA. Muchas gracias por avisarnos. ¡Nos vemos en el evento! 🎟️`,
      rsvpStatus: "confirmado",
    };
  }

  if (text === "2" || text.includes("no") || text.includes("cancelar") || text.includes("no podré") || text.includes("no puedo")) {
    try {
      await (supabase.from("registrations") as any)
        .update({ estado_rsvp: "cancelado" })
        .or(`telefono.eq.${cleanPhone},telefono.eq.${senderPhone}`);
    } catch (_) {}

    return {
      replyText: `❌ Entendido. Hemos registrado que no podrás asistir a esta ocasión. ¡Esperamos contar contigo en el próximo evento!`,
      rsvpStatus: "cancelado",
    };
  }

  // 2. Buscar último evento activo en Supabase para obtener fechas y ubicación reales
  let eventInfo = {
    nombre: "Doxa Eventos",
    fecha: "Consultar catálogo oficial",
    lugar: "Centro Mundial de Gloria",
  };

  try {
    const { data: eventsData } = await supabase
      .from("events" as any)
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (eventsData && eventsData[0]) {
      const evt = eventsData[0];
      eventInfo.nombre = evt.nombre || eventInfo.nombre;
      if (evt.fecha_evento) {
        eventInfo.fecha = new Date(evt.fecha_evento).toLocaleString("es-CO", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      if (evt.lugar_evento) eventInfo.lugar = evt.lugar_evento;
    }
  } catch (_) {}

  // 3. Intenciones de Horarios / Fechas
  if (text.includes("hora") || text.includes("fecha") || text.includes("cuando") || text.includes("cuándo") || text.includes("horario")) {
    return {
      replyText: `📅 *${eventInfo.nombre}*\n\nEl evento está programado para:\n👉 *${eventInfo.fecha}*\n\n¡Te recomendamos llegar 20 minutos antes para tu ingreso!`,
    };
  }

  // 4. Intenciones de Ubicación / Dirección / Cómo llegar
  if (text.includes("donde") || text.includes("dónde") || text.includes("lugar") || text.includes("ubicacion") || text.includes("ubicación") || text.includes("direccion") || text.includes("dirección")) {
    return {
      replyText: `📍 *Ubicación del Evento*\n\nTe esperamos en:\n🏢 *${eventInfo.lugar}*\n\nRecuerda presentar tu código QR en la entrada para un acceso rápido.`,
    };
  }

  // 5. Intenciones de Pase QR / Entradas
  if (text.includes("pase") || text.includes("qr") || text.includes("entrada") || text.includes("invitacion") || text.includes("invitación") || text.includes("mi pase")) {
    // Buscar pase del participante en Supabase por teléfono
    try {
      const { data: reg } = await (supabase.from("registrations") as any)
        .select("id, nombres")
        .or(`telefono.eq.${cleanPhone},telefono.eq.${senderPhone}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reg) {
        const downloadUrl = `${window.location.origin}/descargar/${reg.id}`;
        return {
          replyText: `🎟️ *Hola ${reg.nombres}*\n\nAquí tienes tu enlace personal para descargar tu pase de entrada y Código QR:\n👇\n${downloadUrl}`,
        };
      }
    } catch (_) {}

    return {
      replyText: `🎟️ *Pases de Entrada*\n\nPuedes ver e inscribirte a los eventos en nuestro catálogo oficial:\n${window.location.origin}`,
    };
  }

  // 6. Respuesta predeterminada amigable (Fallback)
  return {
    replyText: `Hola 👋. Gracias por escribirnos a *Doxa Eventos / Centro Mundial de Gloria*.\n\n🤖 Puedo ayudarte con:\n• *1* para confirmar tu asistencia o *2* para declinar\n• Preguntarme por la *fecha* u *horario* del evento\n• Preguntarme por la *ubicación*\n• Pedirme tu *pase QR* de entrada`,
  };
}
