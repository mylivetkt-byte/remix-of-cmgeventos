import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "./whatsapp-crm";
import { formatEventDateTime } from "./date-utils";

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
  let eventTitle = payload.eventName || "Evento CMG";
  let eventPlace = payload.eventPlace || "";
  let rawDate = payload.eventDate || "";
  let customMessageTemplate: string | null = null;

  if (payload.eventId) {
    try {
      const { data: evt } = await supabase
        .from("events")
        .select("nombre, fecha_evento, lugar_evento, mensaje_whatsapp")
        .eq("id", payload.eventId)
        .maybeSingle();

      if (evt) {
        if (evt.nombre) eventTitle = evt.nombre;
        if (evt.lugar_evento) eventPlace = evt.lugar_evento;
        if (evt.mensaje_whatsapp) customMessageTemplate = evt.mensaje_whatsapp;
        if (evt.fecha_evento) rawDate = evt.fecha_evento;
      }
    } catch (_) {}
  }

  const dt = formatEventDateTime(rawDate);
  const eventDateText = dt.fullDateText || dt.eventDate || rawDate;

  const attendeeName = payload.name || "Asistente";

  let messageText = "";
  if (customMessageTemplate && customMessageTemplate.trim() !== "") {
    let template = customMessageTemplate
      .replace(/{nombre_completo}/gi, attendeeName)
      .replace(/{nombre_asistente}/gi, attendeeName)
      .replace(/{asistente}/gi, attendeeName)
      .replace(/{nombres}/gi, attendeeName)
      .replace(/{nombre}/gi, attendeeName)
      .replace(/{apellidos}/gi, "")
      .replace(/{apellido}/gi, "")
      .replace(/{evento}/gi, eventTitle)
      .replace(/{nombre_evento}/gi, eventTitle)
      .replace(/{fecha}/gi, eventDateText)
      .replace(/{fecha_evento}/gi, dt.eventDate || eventDateText)
      .replace(/{hora}/gi, dt.eventTime || "")
      .replace(/{hora_evento}/gi, dt.eventTime || "")
      .replace(/{lugar}/gi, eventPlace)
      .replace(/{lugar_evento}/gi, eventPlace)
      .replace(/{codigo}/gi, (payload.registrationId || "").slice(0, 8).toUpperCase())
      .replace(/{codigo_registro}/gi, (payload.registrationId || "").slice(0, 8).toUpperCase())
      .replace(/{id}/gi, payload.registrationId || "");

    if (/{enlace}|{link}|{url}/i.test(template)) {
      messageText = template
        .replace(/{enlace}/gi, downloadUrl)
        .replace(/{link}/gi, downloadUrl)
        .replace(/{url}/gi, downloadUrl);
    } else {
      messageText = `${template.trim()}\n\n📄 *Descarga tu invitación a ${eventTitle} aquí:*\n${downloadUrl}`;
    }
  } else {
    const lines = [
      `🎉 *${eventTitle.toUpperCase()}*`,
      ``,
      `Hola *${attendeeName}*,`,
      `¡Tu registro ha sido confirmado exitosamente! 🎊`,
      ``,
    ];
    if (eventDateText) lines.push(`📅 *Fecha:* ${eventDateText}`);
    if (eventPlace) lines.push(`📍 *Lugar:* ${eventPlace}`);
    lines.push(``, `🎟️ *Descarga tu pase de entrada y Código QR:*`, downloadUrl);
    messageText = lines.join("\n");
  }

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
 * Función para limpiar y normalizar texto en español (elimina tildes, signos y espacios extra)
 */
export function normalizeBotText(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[¿?¡!.,;:_()\-+*#$%/\\|~`"^&<>={}[\]]/g, " ") // reemplaza signos de puntuación por espacio
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Helper para buscar el perfil del asistente por número de teléfono o por nombre (para contactos LID de WhatsApp)
 */
export async function lookupAttendeeProfile(phone: string, senderName?: string) {
  if (!phone && !senderName) return null;
  const digitsOnly = String(phone || "").replace(/[^\d]/g, "");

  // 1. Buscar en tabla principal registrations por número de teléfono
  if (digitsOnly && digitsOnly.length >= 7) {
    const phone10 = digitsOnly.length >= 10 && digitsOnly.startsWith("57") ? digitsOnly.slice(2) : digitsOnly;
    const phone57 = phone10.length === 10 ? `57${phone10}` : digitsOnly;

    const phoneTokens = Array.from(new Set([digitsOnly, phone10, phone57].filter((p) => p && p.length >= 7)));

    try {
      const orCondition = phoneTokens.map((p) => `telefono.eq.${p}`).join(",");
      const { data: regList, error } = await (supabase.from("registrations") as any)
        .select("id, nombres, apellidos, event_id, asistio, estado_pago, monto_pendiente, pdf_url, created_at, telefono")
        .or(orCondition)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && regList && regList[0]) {
        const reg = regList[0];
        const fullName = [reg.nombres, reg.apellidos]
          .map((s) => (s ? String(s).trim() : ""))
          .filter((s) => s.length > 0 && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined")
          .join(" ") || "Asistente";

        return {
          id: reg.id,
          nombres: reg.nombres || fullName,
          apellidos: reg.apellidos || "",
          nombreCompleto: fullName,
          eventId: reg.event_id,
          asistio: reg.asistio,
          estadoPago: reg.estado_pago,
          montoPendiente: reg.monto_pendiente,
          pdfUrl: reg.pdf_url,
          realPhone: reg.telefono,
        };
      }
    } catch (_) {}

    // Buscar en solicitudes de casas de paz
    try {
      const orCondition = phoneTokens.map((p) => `telefono.eq.${p}`).join(",");
      const { data: cdpList } = await (supabase.from("casa_de_paz_solicitudes") as any)
        .select("id, nombre, barrio, direccion, created_at, telefono")
        .or(orCondition)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cdpList && cdpList[0]) {
        const cdp = cdpList[0];
        return {
          id: cdp.id,
          nombres: cdp.nombre || "Hermano(a)",
          apellidos: "",
          nombreCompleto: cdp.nombre || "Hermano(a)",
          eventId: null,
          asistio: null,
          estadoPago: null,
          montoPendiente: null,
          pdfUrl: null,
          realPhone: cdp.telefono,
        };
      }
    } catch (_) {}
  }

  // 2. Si el identificador es un WhatsApp Privacy LID (ej: 152492847413354) o no se encontró por número, buscar por nombre del contacto
  if (senderName && typeof senderName === "string") {
    const cleanName = senderName.trim();
    if (cleanName.length >= 3 && !/^\d+$/.test(cleanName) && !cleanName.includes("@")) {
      const parts = cleanName.split(/\s+/).filter(Boolean);
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

      try {
        let query = (supabase.from("registrations") as any)
          .select("id, nombres, apellidos, event_id, asistio, estado_pago, monto_pendiente, pdf_url, created_at, telefono")
          .ilike("nombres", `%${firstName}%`);

        if (lastName) {
          query = query.or(`apellidos.ilike.%${lastName}%,nombres.ilike.%${lastName}%`);
        }

        const { data: nameList } = await query.order("created_at", { ascending: false }).limit(6);

        if (nameList && nameList.length > 0) {
          const best = nameList.find((reg: any) => {
            const full = `${reg.nombres || ""} ${reg.apellidos || ""}`.toLowerCase();
            return parts.every((p) => full.includes(p.toLowerCase()));
          }) || nameList[0];

          const fullName = [best.nombres, best.apellidos]
            .map((s: any) => (s ? String(s).trim() : ""))
            .filter((s: any) => s.length > 0 && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined")
            .join(" ") || cleanName;

          return {
            id: best.id,
            nombres: best.nombres || fullName,
            apellidos: best.apellidos || "",
            nombreCompleto: fullName,
            eventId: best.event_id,
            asistio: best.asistio,
            estadoPago: best.estado_pago,
            montoPendiente: best.monto_pendiente,
            pdfUrl: best.pdf_url,
            realPhone: best.telefono,
          };
        }
      } catch (_) {}
    }
  }

  return null;
}

export interface OmniRouteConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt?: string;
  enabled: boolean;
}

/**
 * Obtener credenciales de OmniRoute / OpenRouter desde app_secrets en Supabase
 */
export async function getOmniRouteConfig(): Promise<OmniRouteConfig> {
  try {
    const { data } = await supabase
      .from("app_secrets")
      .select("key, value")
      .in("key", [
        "OMNIROUTE_API_KEY",
        "OMNIROUTE_BASE_URL",
        "OMNIROUTE_MODEL",
        "OMNIROUTE_SYSTEM_PROMPT",
        "OMNIROUTE_ENABLED",
      ]);

    const apiKey = data?.find((d) => d.key === "OMNIROUTE_API_KEY")?.value || "";
    const baseUrl = data?.find((d) => d.key === "OMNIROUTE_BASE_URL")?.value || "https://openrouter.ai/api/v1";
    const model = data?.find((d) => d.key === "OMNIROUTE_MODEL")?.value || "google/gemini-2.0-flash-001";
    const systemPrompt = data?.find((d) => d.key === "OMNIROUTE_SYSTEM_PROMPT")?.value || "";
    const enabledVal = data?.find((d) => d.key === "OMNIROUTE_ENABLED")?.value;
    const enabled = enabledVal === undefined || enabledVal === null || enabledVal === "" || enabledVal === "true";

    return {
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim().replace(/\/$/, ""),
      model: model.trim(),
      systemPrompt: systemPrompt.trim(),
      enabled: Boolean(enabled),
    };
  } catch {
    return {
      apiKey: "",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "google/gemini-2.0-flash-001",
      enabled: true,
    };
  }
}

/**
 * Guardar configuración de OmniRoute / OpenRouter en app_secrets
 */
export async function saveOmniRouteConfig(config: Partial<OmniRouteConfig>): Promise<void> {
  const updates: { key: string; value: string; updated_at: string }[] = [];
  const now = new Date().toISOString();

  if (config.apiKey !== undefined) {
    updates.push({ key: "OMNIROUTE_API_KEY", value: config.apiKey, updated_at: now });
  }
  if (config.baseUrl !== undefined) {
    updates.push({ key: "OMNIROUTE_BASE_URL", value: config.baseUrl, updated_at: now });
  }
  if (config.model !== undefined) {
    updates.push({ key: "OMNIROUTE_MODEL", value: config.model, updated_at: now });
  }
  if (config.systemPrompt !== undefined) {
    updates.push({ key: "OMNIROUTE_SYSTEM_PROMPT", value: config.systemPrompt, updated_at: now });
  }
  if (config.enabled !== undefined) {
    updates.push({ key: "OMNIROUTE_ENABLED", value: config.enabled ? "true" : "false", updated_at: now });
  }

  if (updates.length > 0) {
    const { error } = await supabase.from("app_secrets").upsert(updates, { onConflict: "key" });
    if (error) throw error;
  }
}

/**
 * Generador de respuestas con OmniRoute / OpenRouter AI con inyección de contexto
 */
export async function generateOmniRouteReply(
  userMessage: string,
  context: {
    attendee: AttendeeProfile | null;
    currentEvent: any;
    auditorioDireccion: string;
    auditorioTelefono: string;
    downloadUrl: string;
    origin: string;
    upcomingEvents?: any[];
    rsvpDetected?: "confirmado" | "cancelado";
    configOverride?: Partial<OmniRouteConfig>;
  }
): Promise<string | null> {
  const dbConfig = await getOmniRouteConfig();
  const config = {
    apiKey: context.configOverride?.apiKey !== undefined ? context.configOverride.apiKey : dbConfig.apiKey,
    baseUrl: context.configOverride?.baseUrl !== undefined ? context.configOverride.baseUrl : dbConfig.baseUrl,
    model: context.configOverride?.model !== undefined ? context.configOverride.model : dbConfig.model,
    systemPrompt: context.configOverride?.systemPrompt !== undefined ? context.configOverride.systemPrompt : dbConfig.systemPrompt,
    enabled: context.configOverride?.enabled !== undefined ? context.configOverride.enabled : dbConfig.enabled,
  };

  if (!config.enabled || !config.apiKey) {
    return null; // Fallback al motor local si no hay API key o está deshabilitado
  }

  const { attendee, currentEvent, auditorioDireccion, auditorioTelefono, downloadUrl, origin, upcomingEvents, rsvpDetected } = context;

  // Construir información del asistente
  const attendeeInfo = attendee
    ? `- Estado en el Sistema: REGISTRADO OFICIALMENTE ✅
- Nombre del Asistente: ${attendee.nombreCompleto}
- Teléfono: ${attendee.telefono || "Asignado"}
- ID de Registro: ${attendee.id}
- Evento al que está inscrito: ${currentEvent.nombre} (${currentEvent.fechaTexto})
- Lugar del Evento: ${currentEvent.lugar || auditorioDireccion}
- Estado de Asistencia (RSVP): ${rsvpDetected === "confirmado" ? "CONFIRMADO AHORA MISMO ✅" : rsvpDetected === "cancelado" ? "CANCELADO / DECLINADO ❌" : attendee.asistio ? "CONFIRMADO PREVIAMENTE ✅" : "Pendiente de confirmar"}
- Estado de Pago: ${attendee.estadoPago || "N/A"}
- Enlace oficial a su Pase QR / Entrada: ${downloadUrl}
- SI PREGUNTA SI ESTÁ INSCRITO: Confírmale con alegría que SÍ está debidamente inscrito(a) como *${attendee.nombreCompleto}* para *${currentEvent.nombre}* y facilítale su pase QR (${downloadUrl}).`
    : `- Estado en el Sistema: NO REGISTRADO CON ESTE NÚMERO (Nuevo visitante).
- Enlace general para registrarse: ${origin}
- SI PREGUNTA SI ESTÁ INSCRITO: Explícale con amabilidad que con este número de WhatsApp aún no encontramos una inscripción para *${currentEvent.nombre}*, e invítale a registrarse gratis en: ${origin}`;

  const upcomingText = upcomingEvents && upcomingEvents.length > 0
    ? upcomingEvents.map((e) => `• ${e.nombre} - Fecha: ${e.fechaTexto} - Lugar: ${e.lugar}${e.descripcion ? ` - Detalle: ${e.descripcion}` : ""}`).join("\n")
    : "Sin más eventos listados por el momento.";

  const adminRulesSection = config.systemPrompt && config.systemPrompt.trim().length > 0
    ? `\n==================================================
🚨 INSTRUCCIONES Y REGLAS PRIORITARIAS DEL ADMINISTRADOR (CUMPLIR OBLIGATORIAMENTE):
${config.systemPrompt.trim()}
==================================================\n`
    : "";

  const systemInstruction = `Eres el Asistente Virtual Inteligente oficial por WhatsApp de "Centro Mundial de Gloria" / "Doxa Eventos".
Tu misión es atender a los asistentes y visitantes respondiendo con precisión EXACTA según el programa, las instrucciones del administrador y los datos reales del evento.
${adminRulesSection}
==================================================
INFORMACIÓN REAL Y CONTEXTO EN BASE DE DATOS:
==================================================

1. DATOS DEL ASISTENTE QUE ESCRIBE:
${attendeeInfo}

2. EVENTO PRINCIPAL / ASIGNADO:
- Nombre del Evento: ${currentEvent.nombre}
- Fecha y Horario: ${currentEvent.fechaTexto}
- Lugar / Dirección: ${currentEvent.lugar || auditorioDireccion}
- Es de pago: ${currentEvent.esDePago ? `Sí (${currentEvent.precio} ${currentEvent.moneda || "COP"}). Instrucciones de pago: ${currentEvent.instruccionesPago || "Transferencia bancaria / Nequi"}` : "No, es 100% GRATUITO"}
${currentEvent.descripcion ? `- Descripción y Programa: ${currentEvent.descripcion}` : ""}
${currentEvent.mensajePersonalizado ? `- Mensaje personalizado del evento: ${currentEvent.mensajePersonalizado}` : ""}
${currentEvent.mensajeWhatsapp ? `- Guía informativa de WhatsApp: ${currentEvent.mensajeWhatsapp}` : ""}

3. INFORMACIÓN DE LA SEDE / AUDITORIO CMG:
- Dirección principal: ${auditorioDireccion}
- Teléfono de contacto: ${auditorioTelefono || "Por este mismo canal de WhatsApp"}

4. OTROS EVENTOS PROGRAMADOS:
${upcomingText}

==================================================
DIRECTRICES CLAVE DE RESPUESTA:
==================================================
1. PRIORIDAD TOTAL: Respeta fielmente cualquier regla del administrador y los datos oficiales del programa. No inventes horarios ni direcciones.
2. Tono: Cálido, empático, cristiano/pastoral, servicial, claro y directo.
3. Formato: WhatsApp amigable (párrafos cortos, uso de *negritas* para resaltar fechas, lugares o enlaces importantes, y emojis apropiados).
4. Si el usuario confirma asistencia (o envió "1"): Celebra su confirmación para *${currentEvent.nombre}*, recuérdale la fecha (${currentEvent.fechaTexto}), el lugar y su enlace de pase QR (${downloadUrl}).
5. Si el usuario declina o cancela asistencia (o envió "2"): Responde con comprensión y amor cristiano, bendícele y dile que esperamos verle en el próximo evento.
6. Si el usuario envía una petición de oración o motivo de salud/familiar: Responde con empatía espiritual genuina, cita una breve promesa bíblica reconfortante, y confírmale que el equipo pastoral y de intercesores estará orando por su petición.
7. Si preguntan por dirección, ubicación o cómo llegar: Proporciona el lugar exacto (${currentEvent.lugar || auditorioDireccion}) y sugiérele llegar con anticipación.
8. Si piden su pase QR, ticket o entrada: Facilítale el enlace directo (${downloadUrl}) y explícale que puede descargarlo o guardarlo en su celular.
9. Si preguntan por Casas de Paz o células: Explica que son grupos de bendición en hogares y pídeles su barrio y ciudad para contactarlos con un líder de zona.
10. Longitud: Conciso y al grano (máximo 120-150 palabras) para facilitar la lectura móvil.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 segundos timeout

    let cleanEndpoint = config.baseUrl.endsWith("/chat/completions")
      ? config.baseUrl
      : `${config.baseUrl}/chat/completions`;

    // Si el sitio web está sobre HTTPS, convertir http:// a https:// automáticamente para evitar bloqueo Mixed Content
    if (typeof window !== "undefined" && window.location.protocol === "https:" && cleanEndpoint.startsWith("http://")) {
      cleanEndpoint = cleanEndpoint.replace(/^http:\/\//i, "https://");
    }

    // Aseguramos que el contexto llegue al modelo incluso si el proxy o proveedor descarta role: "system"
    const combinedUserContent = `[CONTEXTO OBLIGATORIO Y GUÍA DE RESPUESTA DE CENTRO MUNDIAL DE GLORIA]:\n${systemInstruction}\n\n[MENSAJE DEL ASISTENTE POR WHATSAPP]:\n"${userMessage}"\n\nResponde como el Asistente Oficial de Centro Mundial de Gloria siguiendo estrictamente el contexto anterior:`;

    const res = await fetch(cleanEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://cmgeventos.lovable.app",
        "X-Title": "CMG Eventos WhatsApp Bot",
      },
      body: JSON.stringify({
        model: config.model || "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content: systemInstruction,
          },
          {
            role: "user",
            content: combinedUserContent,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && typeof content === "string" && content.trim().length > 0) {
        return content.trim();
      }
    } else {
      const errBody = await res.text().catch(() => "");
      console.warn("OmniRoute / OpenRouter API respondió con estado:", res.status, errBody);
    }
  } catch (err: any) {
    console.warn("Error al llamar a OmniRoute / OpenRouter API:", err?.message || err);
  }

  return null; // Fallback al motor contextual local
}

/**
 * 🤖 FEATURE 1 & 3: Chatbot Inteligente IA 24/7 Contextual y Procesador de Intenciones
 */
export async function processWhatsAppMessageIntent(
  incomingText: string,
  senderPhone: string,
  configOverride?: Partial<OmniRouteConfig>,
  senderName?: string
): Promise<{ replyText: string; rsvpStatus?: "confirmado" | "cancelado"; isAiGenerated?: boolean; attendee?: any }> {
  const rawText = String(incomingText || "").trim();
  const cleanPhone = String(senderPhone || "").replace(/[^\d]/g, "");
  const norm = normalizeBotText(rawText);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://cmgeventos.lovable.app";

  // 1. Identificar perfil del asistente en base de datos (por teléfono o nombre de contacto WhatsApp)
  const attendee = await lookupAttendeeProfile(cleanPhone || senderPhone, senderName);
  const attendeeName = attendee?.nombreCompleto || attendee?.nombres || senderName || "";
  const greetingName = attendeeName ? `*${attendeeName}*` : "amigo(a)";

  // 2. Obtener datos del evento del asistente O del último evento activo
  let currentEvent: {
    id?: string;
    nombre: string;
    fechaTexto: string;
    lugar: string;
    descripcion?: string;
    esDePago?: boolean;
    precio?: number;
    moneda?: string;
    instruccionesPago?: string;
  } = {
    nombre: "Evento Centro Mundial de Gloria",
    fechaTexto: "Próximamente",
    lugar: "Auditorio CMG",
  };

  let upcomingEventsList: any[] = [];

  try {
    if (attendee?.eventId) {
      const { data: evt } = await supabase
        .from("events")
        .select("id, nombre, fecha_evento, lugar_evento, lugar, descripcion, es_de_pago, precio, moneda, instrucciones_pago")
        .eq("id", attendee.eventId)
        .maybeSingle();

      if (evt) {
        const dt = formatEventDateTime(evt.fecha_evento || "");
        currentEvent = {
          id: evt.id,
          nombre: evt.nombre || currentEvent.nombre,
          fechaTexto: dt.fullDateText || dt.eventDate || "Consultar horario oficial",
          lugar: evt.lugar_evento || evt.lugar || currentEvent.lugar,
          descripcion: evt.descripcion || undefined,
          esDePago: Boolean(evt.es_de_pago),
          precio: evt.precio || undefined,
          moneda: evt.moneda || "COP",
          instruccionesPago: evt.instrucciones_pago || undefined,
        };
      }
    } else {
      // Buscar evento activo más reciente
      const { data: activeEvents } = await supabase
        .from("events")
        .select("id, nombre, fecha_evento, lugar_evento, lugar, descripcion, es_de_pago, precio, moneda, instrucciones_pago")
        .eq("activo", true)
        .order("fecha_evento", { ascending: true })
        .limit(3);

      if (activeEvents && activeEvents.length > 0) {
        const evt = activeEvents[0];
        const dt = formatEventDateTime(evt.fecha_evento || "");
        currentEvent = {
          id: evt.id,
          nombre: evt.nombre || currentEvent.nombre,
          fechaTexto: dt.fullDateText || dt.eventDate || "Consultar horario oficial",
          lugar: evt.lugar_evento || evt.lugar || currentEvent.lugar,
          descripcion: evt.descripcion || undefined,
          esDePago: Boolean(evt.es_de_pago),
          precio: evt.precio || undefined,
          moneda: evt.moneda || "COP",
          instruccionesPago: evt.instrucciones_pago || undefined,
        };

        upcomingEventsList = activeEvents.map((e) => {
          const d = formatEventDateTime(e.fecha_evento || "");
          return {
            nombre: e.nombre,
            fechaTexto: d.fullDateText || d.eventDate || "Próximamente",
            lugar: e.lugar_evento || e.lugar || "Auditorio CMG",
          };
        });
      }
    }
  } catch (_) {}

  // 3. Obtener configuración general del auditorio / sede
  let auditorioDireccion = "Centro Mundial de Gloria";
  let auditorioTelefono = "";
  try {
    const { data: audData } = await supabase
      .from("auditorio_config")
      .select("direccion, telefono_contacto")
      .limit(1)
      .maybeSingle();
    if (audData?.direccion) auditorioDireccion = audData.direccion;
    if (audData?.telefono_contacto) auditorioTelefono = audData.telefono_contacto;
  } catch (_) {}

  const downloadUrl = attendee ? `${origin}/descargar/${attendee.id}` : origin;

  // =========================================================================
  // 4. DETECCIÓN DETERMINÍSTICA DE RSVP (MUTACIONES DE BASE DE DATOS GARANTIZADAS)
  // =========================================================================
  let rsvpStatus: "confirmado" | "cancelado" | undefined = undefined;

  const isRsvpYes =
    norm === "1" ||
    norm === "1." ||
    norm === "1 si" ||
    norm === "1 si confirmo" ||
    /^(si|claro|confirmo|confirmar|confirmado|asistire|cuenta conmigo|alla estare|voy a ir|si voy|estare|me apunto)$/i.test(norm) ||
    norm.includes("si confirmo") ||
    norm.includes("confirmo mi asistencia") ||
    norm.includes("si asistire") ||
    norm.includes("si voy a ir") ||
    norm.includes("alla nos vemos") ||
    norm.includes("cuenta conmigo");

  const isRsvpNo =
    norm === "2" ||
    norm === "2." ||
    norm === "2 no" ||
    /^(no|cancelar|cancelo|no podre|no puedo|no voy|no podre ir|declino)$/i.test(norm) ||
    norm.includes("no podre asistir") ||
    norm.includes("cancelo mi asistencia") ||
    norm.includes("no voy a poder") ||
    norm.includes("no puedo asistir") ||
    norm.includes("no puedo ir");

  if (isRsvpYes) {
    rsvpStatus = "confirmado";
    if (attendee?.id) {
      try {
        await (supabase.from("registrations") as any)
          .update({ asistio: true, estado_rsvp: "confirmado" })
          .eq("id", attendee.id);
      } catch (_) {}
    }
  } else if (isRsvpNo) {
    rsvpStatus = "cancelado";
    if (attendee?.id) {
      try {
        await (supabase.from("registrations") as any)
          .update({ asistio: false, estado_rsvp: "cancelado" })
          .eq("id", attendee.id);
      } catch (_) {}
    }
  }

  // =========================================================================
  // 5. INTENTO DE GENERACIÓN CON OMNIROUTE / OPENROUTER IA
  // =========================================================================
  const aiGeneratedReply = await generateOmniRouteReply(rawText, {
    attendee,
    currentEvent,
    auditorioDireccion,
    auditorioTelefono,
    downloadUrl,
    origin,
    upcomingEvents: upcomingEventsList,
    rsvpDetected: rsvpStatus,
    configOverride,
  });

  if (aiGeneratedReply) {
    return {
      replyText: aiGeneratedReply,
      rsvpStatus,
      isAiGenerated: true,
    };
  }

  // =========================================================================
  // 6. MOTOR LOCAL CONTINGENTE (FALLBACK AUTOMÁTICO 100% DISPONIBLE)
  // =========================================================================
  if (isRsvpYes) {
    if (attendee?.id) {
      return {
        replyText: `✅ ¡Excelente, ${greetingName}! Tu asistencia para *${currentEvent.nombre}* ha sido CONFIRMADA con éxito 🎉.\n\n📅 *Fecha:* ${currentEvent.fechaTexto}\n📍 *Lugar:* ${currentEvent.lugar}\n🎟️ *Tu Pase QR:* ${downloadUrl}\n\n¡Te esperamos con los brazos abiertos! Recuerda llegar 20 minutos antes para tu ingreso.`,
        rsvpStatus: "confirmado",
        isAiGenerated: false,
      };
    }

    return {
      replyText: `✅ ¡Muchas gracias por tu confirmación! 🎉\n\nTe esperamos en *${currentEvent.nombre}*.\n📅 *Fecha:* ${currentEvent.fechaTexto}\n📍 *Lugar:* ${currentEvent.lugar}\n\nSi aún no tienes tu pase QR de entrada, puedes generarlo aquí:\n👉 ${origin}`,
      rsvpStatus: "confirmado",
      isAiGenerated: false,
    };
  }

  // B. INTENCIÓN: Declinar / Cancelar Asistencia RSVP ("2", "no", "no podré", "cancelo", etc.)
  if (isRsvpNo) {
    if (attendee?.id) {
      return {
        replyText: `❌ Entendido, ${greetingName}. Hemos registrado que no podrás asistir a *${currentEvent.nombre}* en esta ocasión.\n\n¡Esperamos contar contigo en nuestros próximos eventos y reuniones! Que Dios te bendiga grandemente. 🙏✨`,
        rsvpStatus: "cancelado",
        isAiGenerated: false,
      };
    }

    return {
      replyText: `❌ Entendido. Hemos tomado nota de que no podrás asistir. ¡Esperamos verte pronto en un próximo evento! Bendiciones.`,
      rsvpStatus: "cancelado",
      isAiGenerated: false,
    };
  }

  // C. INTENCIÓN: Petición de Oración / Ayuda Espiritual / Consejería / Sanidad / Familia
  const isPrayer =
    norm.includes("peticion") ||
    norm.includes("oracion") ||
    norm.includes("oren") ||
    norm.includes("orar") ||
    norm.includes("recen") ||
    norm.includes("rezar") ||
    norm.includes("ayuda espiritual") ||
    norm.includes("consejeria") ||
    norm.includes("pastor") ||
    norm.includes("enfermo") ||
    norm.includes("enfermedad") ||
    norm.includes("sanidad") ||
    norm.includes("clamor") ||
    norm.includes("intercesion") ||
    norm.includes("necesito oracion") ||
    norm.includes("pidan por") ||
    norm.includes("oren por") ||
    norm.includes("por favor oren") ||
    norm.includes("motivo de oracion") ||
    norm.includes("por mi salud") ||
    norm.includes("por mi familia");

  if (isPrayer) {
    return {
      replyText: `🙏 *Petición de Oración y Acompañamiento Espiritual*\n\nHola ${greetingName}, en *Centro Mundial de Gloria / Doxa Eventos* creemos firmemente en el poder de la oración y en que Dios tiene cuidado de cada detalle de tu vida.\n\n✨ Tu motivo de oración ha sido recibido con mucho amor y nuestro equipo pastoral e intercesores estarán orando e intercediendo por ti, tu salud, tu familia y tus necesidades.\n\n📖 *"Y esta es la confianza que tenemos en él, que si pedimos alguna cosa conforme a su voluntad, él nos oye."* (1 Juan 5:14)\n\n🕊️ Si requieres consejería pastoral directa o deseas conectarte con una Casa de Paz en tu sector, háznoslo saber y con gusto te contactaremos. ¡Declaramos bendición y paz sobre tu vida!`,
    };
  }

  // D. INTENCIÓN: Ubicación / Dirección / Cómo llegar / Dónde es
  const isLocation =
    norm.includes("donde") ||
    norm.includes("lugar") ||
    norm.includes("ubicacion") ||
    norm.includes("direccion") ||
    norm.includes("como llego") ||
    norm.includes("donde queda") ||
    norm.includes("en que lugar") ||
    norm.includes("en que direccion") ||
    norm.includes("mapa") ||
    norm.includes("sitio") ||
    norm.includes("auditorio");

  if (isLocation) {
    const eventLocation = currentEvent.lugar || auditorioDireccion;
    if (attendee) {
      return {
        replyText: `📍 *Ubicación del Evento: ${currentEvent.nombre}*\n\n🏢 *Lugar:* ${eventLocation}\n\n🚗 *Recomendaciones:*\n• Te sugerimos llegar 20 minutos antes para un ingreso ágil.\n• Presenta tu código QR descargado en tu teléfono al ingresar.\n\n🎟️ *Descargar tu Pase:* ${downloadUrl}`,
      };
    }

    return {
      replyText: `📍 *Ubicación de Nuestros Eventos*\n\n🏢 *Sede Principal / Auditorio:*\n${eventLocation}\n\n🚗 Te recomendamos llegar con anticipación para facilitar el estacionamiento y acceso.\n\n👉 Consulta detalles de eventos e inscripciones aquí:\n${origin}`,
    };
  }

  // E. INTENCIÓN: Fecha / Horario / Cuándo es / Horas
  const isSchedule =
    norm.includes("hora") ||
    norm.includes("horario") ||
    norm.includes("fecha") ||
    norm.includes("cuando") ||
    norm.includes("que dia") ||
    norm.includes("a que hora") ||
    norm.includes("a que horas") ||
    norm.includes("cuando empieza") ||
    norm.includes("hora de inicio");

  if (isSchedule) {
    if (attendee) {
      return {
        replyText: `📅 *Fecha y Horario: ${currentEvent.nombre}*\n\n⏰ *Programación:* ${currentEvent.fechaTexto}\n📍 *Lugar:* ${currentEvent.lugar}\n\nℹ️ Las puertas se abrirán con anticipación. ¡Te recomendamos tener a mano tu código QR!\n👉 *Pase:* ${downloadUrl}`,
      };
    }

    // Listar próximos eventos activos
    try {
      const { data: allEvts } = await supabase
        .from("events")
        .select("nombre, fecha_evento, lugar_evento")
        .eq("activo", true)
        .order("fecha_evento", { ascending: true })
        .limit(3);

      if (allEvts && allEvts.length > 0) {
        const listText = allEvts
          .map((e) => {
            const dt = formatEventDateTime(e.fecha_evento || "");
            return `• *${e.nombre}*\n  📅 ${dt.fullDateText || dt.eventDate || "Próximamente"}\n  📍 ${e.lugar_evento || "Auditorio CMG"}`;
          })
          .join("\n\n");

        return {
          replyText: `📅 *Próximos Eventos Programados:*\n\n${listText}\n\n👉 Inscríbete y obtén tu pase gratuito en:\n${origin}`,
        };
      }
    } catch (_) {}

    return {
      replyText: `📅 *${currentEvent.nombre}*\n\n⏰ *Fecha:* ${currentEvent.fechaTexto}\n📍 *Lugar:* ${currentEvent.lugar}\n\n👉 Inscríbete y obtén tu pase en:\n${origin}`,
    };
  }

  // F. INTENCIÓN: Pase QR / Ticket / Entrada / Invitación / Descargar
  const isTicket =
    norm.includes("pase") ||
    norm.includes("qr") ||
    norm.includes("entrada") ||
    norm.includes("ticket") ||
    norm.includes("invitacion") ||
    norm.includes("mi pase") ||
    norm.includes("mi codigo") ||
    norm.includes("descargar") ||
    norm.includes("carnet") ||
    norm.includes("escarapela") ||
    norm.includes("mi entrada") ||
    norm.includes("no me llego");

  if (isTicket) {
    if (attendee) {
      const estadoStr = attendee.asistio ? "Confirmado ✅" : "Registrado 🎟️";
      let extraPago = "";
      if (currentEvent.esDePago) {
        extraPago = attendee.estadoPago === "aprobado" || attendee.estadoPago === "pagado"
          ? "\n💳 *Estado de Pago:* Aprobado / Pagado ✅"
          : "\n💳 *Estado de Pago:* Pendiente de verificación ⏳";
      }

      return {
        replyText: `🎟️ *Tu Pase de Entrada QR*\n\nHola ${greetingName}, aquí tienes tu pase personal para *${currentEvent.nombre}*:\n\n👉 *Descargar Invitación y Código QR:*\n${downloadUrl}\n\n📌 *Estado:* ${estadoStr}${extraPago}\n\n💡 *Tip:* Guarda la imagen del código QR en tu galería o toma una captura de pantalla para un acceso rápido.`,
      };
    }

    return {
      replyText: `🎟️ *Pases de Entrada y Códigos QR*\n\nNo encontramos un registro asociado a este número. Puedes inscribirte gratuitamente y generar tu pase QR oficial en:\n👉 ${origin}`,
    };
  }

  // G. INTENCIÓN: Precios / Pagos / Métodos de Pago / Bancos / Nequi / Comprobantes
  const isPayment =
    norm.includes("precio") ||
    norm.includes("costo") ||
    norm.includes("cuanto vale") ||
    norm.includes("valor") ||
    norm.includes("pago") ||
    norm.includes("pagar") ||
    norm.includes("cuenta") ||
    norm.includes("nequi") ||
    norm.includes("daviplata") ||
    norm.includes("bancolombia") ||
    norm.includes("transferencia") ||
    norm.includes("comprobante") ||
    norm.includes("gratis") ||
    norm.includes("gratuito");

  if (isPayment) {
    if (currentEvent.esDePago) {
      const priceStr = currentEvent.precio
        ? new Intl.NumberFormat("es-CO", { style: "currency", currency: currentEvent.moneda || "COP", maximumFractionDigits: 0 }).format(currentEvent.precio)
        : "Consultar tarifa";

      const instructions = currentEvent.instruccionesPago
        ? `\n\n📌 *Instrucciones de Pago:*\n${currentEvent.instruccionesPago}`
        : "";

      return {
        replyText: `💳 *Información de Pago: ${currentEvent.nombre}*\n\n💰 *Valor de la Entrada:* ${priceStr}${instructions}\n\nUna vez realizado tu pago, puedes subir tu comprobante desde el formulario de registro o responder a este chat adjuntando la captura.`,
      };
    }

    return {
      replyText: `🎉 *Evento Gratuito*\n\nLa entrada a *${currentEvent.nombre}* es *100% GRATUITA*. Solo necesitas registrarte previamente para obtener tu pase con Código QR.\n\n👉 Regístrate aquí:\n${origin}`,
    };
  }

  // H. INTENCIÓN: Casas de Paz / Grupos en Casa / Redes
  const isCdp =
    norm.includes("casa de paz") ||
    norm.includes("casas de paz") ||
    norm.includes("cdp") ||
    norm.includes("grupo en casa") ||
    norm.includes("celula") ||
    norm.includes("red de") ||
    norm.includes("barrio");

  if (isCdp) {
    return {
      replyText: `🏡 *Casas de Paz - Centro Mundial de Gloria*\n\nLas Casas de Paz son grupos de bendición y comunión en los hogares donde oramos, compartimos la palabra y nos apoyamos mutuamente.\n\n✨ ¿Deseas unirte a una Casa de Paz cercana a tu barrio o abrir una en tu casa?\nEscríbenos tu barrio y ciudad, y un líder de tu sector se pondrá en contacto contigo. ¡Eres muy bienvenido!`,
    };
  }

  // I. INTENCIÓN: Alquiler de Auditorio / Eventos Externos
  const isAuditorio =
    norm.includes("alquiler") ||
    norm.includes("alquilar") ||
    norm.includes("rentar auditorio") ||
    norm.includes("arrendar") ||
    norm.includes("cotizacion") ||
    norm.includes("espacio");

  if (isAuditorio) {
    return {
      replyText: `🏢 *Alquiler y Solicitud del Auditorio CMG*\n\nContamos con un auditorio moderno, climatizado, con excelente acústica, pantallas LED y sonido profesional para eventos corporativos, congresos y seminarios.\n\n📍 *Ubicación:* ${auditorioDireccion}\n📞 *Contacto Directo:* ${auditorioTelefono || "Contáctanos por este medio"}\n\n👉 Puedes solicitar una cotización o fecha en nuestro portal de auditorio.`,
    };
  }

  // J. INTENCIÓN: Saludos / Agradecimientos / Despedidas / Bendiciones
  const isGreeting =
    /^(hola|buenos dias|buenas tardes|buenas noches|saludos|hey|alo)$/i.test(norm) ||
    norm.startsWith("hola ") ||
    norm === "hola";

  const isThanksOrBlessing =
    norm.includes("gracias") ||
    norm.includes("muchas gracias") ||
    norm.includes("dios te bendiga") ||
    norm.includes("dios le pague") ||
    norm.includes("bendiciones") ||
    norm.includes("amen") ||
    norm.includes("hasta luego") ||
    norm.includes("chao") ||
    norm.includes("adios");

  if (isThanksOrBlessing) {
    return {
      replyText: `🙏 ¡Con muchísimo gusto, ${greetingName}! Que Dios derrame abundantes bendiciones sobre tu vida y tu hogar. ✨\n\nSi necesitas algo más respecto a tus eventos, pases QR o peticiones de oración, aquí estaremos 24/7 para servirte.`,
    };
  }

  if (isGreeting) {
    if (attendee) {
      return {
        replyText: `¡Hola ${greetingName}! 👋 Gracias por escribirnos a *Centro Mundial de Gloria / Doxa Eventos*.\n\n📌 *Estás inscrito(a) en:* ${currentEvent.nombre}\n📅 *Fecha:* ${currentEvent.fechaTexto}\n\n🤖 *¿En qué te puedo ayudar hoy?*\n• *1* para confirmar tu asistencia o *2* para declinar\n• Preguntarme por la *ubicación o cómo llegar*\n• Pedir tu *pase QR* de entrada\n• Compartirme una *petición de oración*`,
      };
    }

    return {
      replyText: `¡Hola! 👋 Bienvenido(a) al Asistente Virtual de *Centro Mundial de Gloria / Doxa Eventos*.\n\n🤖 *Puedo ayudarte con:*\n• Información y horarios del próximo evento: *${currentEvent.nombre}*\n• Ubicación y dirección de nuestra sede\n• Obtener tu pase de entrada QR\n• Peticiones de oración y acompañamiento pastoral\n\n¿En qué te podemos apoyar hoy?`,
    };
  }

  // =========================================================================
  // 5. RESPUESTA INTELIGENTE DE FALLBACK PERSONALIZADA
  // =========================================================================
  if (attendee) {
    return {
      replyText: `Hola ${greetingName} 👋. Hemos recibido tu mensaje.\n\n📌 Para tu evento *${currentEvent.nombre}* (${currentEvent.fechaTexto}):\n\n• Responde *1* para confirmar tu asistencia o *2* para cancelar\n• Escribe *Ubicación* para ver la dirección exacta\n• Escribe *Pase* para recibir tu código QR\n• Escribe *Oración* si tienes una petición o necesidad espiritual\n\nSi necesitas atención personalizada, un asesor te responderá pronto.`,
    };
  }

  return {
    replyText: `Hola 👋. Gracias por comunicarte con *Centro Mundial de Gloria / Doxa Eventos*.\n\n🤖 *Puedo responderte al instante sobre:*\n• *Fecha y Horario* de próximos eventos\n• *Ubicación y Dirección* de nuestro auditorio\n• *Pase QR* o cómo inscribirte\n• *Peticiones de Oración* y ayuda pastoral\n• Información sobre *Casas de Paz*\n\n¿Qué información necesitas?`,
  };
}

export interface CheckInWhatsAppPayload {
  phone: string;
  nombres: string;
  apellidos?: string;
  eventId: string;
  eventName: string;
  eventDate?: string;
  eventPlace?: string;
}

/**
 * 📲 FEATURE: Envío automático de WhatsApp al hacer Check-in en Puerta (con PDF adjunto opcional)
 */
export async function sendCheckInWhatsAppNotification(payload: CheckInWhatsAppPayload): Promise<boolean> {
  const cleanPhone = normalizePhone(payload.phone);
  if (!cleanPhone || cleanPhone.length < 8) return false;

  try {
    // 1. Consultar configuración de Checkin WhatsApp del evento
    const { data: eventData } = await supabase
      .from("events")
      .select("enviar_whatsapp_checkin, mensaje_whatsapp_checkin, pdf_whatsapp_checkin_url")
      .eq("id", payload.eventId)
      .maybeSingle();

    if (!eventData || !eventData.enviar_whatsapp_checkin) {
      return false; // Desactivado para este evento
    }

    const { url, token } = await getWhatsAppCredentials();
    if (!url || !token) {
      console.warn("Servidor de WhatsApp no configurado en app_secrets.");
      return false;
    }

    // 2. Construir mensaje personalizado reemplazando plantillas
    let messageText = eventData.mensaje_whatsapp_checkin || "¡Hola {nombres}! 👋 Te damos la bienvenida oficial a {evento}. Tu ingreso ha sido registrado exitosamente.";
    messageText = messageText
      .replace(/\{nombres\}/gi, payload.nombres || "")
      .replace(/\{apellidos\}/gi, payload.apellidos || "")
      .replace(/\{evento\}/gi, payload.eventName || "el evento");

    if (eventData.pdf_whatsapp_checkin_url) {
      messageText += `\n\n📄 *Material / Guía del Evento (PDF):*\n${eventData.pdf_whatsapp_checkin_url}`;
    }

    // 3. Enviar presencia tipeando y mensaje con adjunto
    await sendPresenceTyping(cleanPhone, url, token);
    await sleep(1000);

    const res = await fetch(`${url}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: messageText,
        mediaUrl: eventData.pdf_whatsapp_checkin_url || undefined,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("Error al enviar WhatsApp de Checkin:", err);
    return false;
  }
}
