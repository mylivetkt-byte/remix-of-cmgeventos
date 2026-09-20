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
 * Helper para buscar el perfil del asistente por número de teléfono
 */
export async function lookupAttendeeProfile(phone: string) {
  if (!phone) return null;
  const digitsOnly = String(phone).replace(/[^\d]/g, "");
  if (!digitsOnly || digitsOnly.length < 7) return null;

  const phone10 = digitsOnly.length >= 10 && digitsOnly.startsWith("57") ? digitsOnly.slice(2) : digitsOnly;
  const phone57 = phone10.length === 10 ? `57${phone10}` : digitsOnly;

  // Lista segura de tokens numéricos puros (sin @, +, espacios ni caracteres especiales)
  const phoneTokens = Array.from(new Set([digitsOnly, phone10, phone57].filter((p) => p && p.length >= 7)));

  let attendee: {
    id: string;
    nombres: string;
    apellidos?: string;
    nombreCompleto: string;
    eventId?: string | null;
    asistio?: boolean | null;
    estadoPago?: string | null;
    montoPendiente?: number | null;
    pdfUrl?: string | null;
  } | null = null;

  // 1. Buscar en tabla principal registrations
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
      };
    }
  } catch (_) {}

  // 2. Buscar en tablas específicas de eventos
  const specificTables = [
    "retiro_sanidad_2026_registrations",
    "retiro_sanidad_registrations",
    "evento_default_registrations",
    "evento_libres_para_amar_registrations",
    "evento_mega_casa_de_paz_registrations",
    "evento_entrenamiento_intensivo_para_lideres_cdp_registrations",
    "evento_fiesta_de_bienvenida_registrations",
    "evento_retiro_de_lideres_de_casa_de_paz_registrations",
    "evento_retiro_de_sanidad_interior_y_liberacion_registrations",
    "evento_seminario_biblico_registrations",
  ];

  for (const table of specificTables) {
    try {
      const orCondition = phoneTokens.map((p) => `telefono.eq.${p}`).join(",");
      const { data: specList } = await (supabase.from(table) as any)
        .select("id, nombres, apellidos, primer_apellido, segundo_apellido, event_id, asistio, pdf_url, created_at")
        .or(orCondition)
        .order("created_at", { ascending: false })
        .limit(1);

      if (specList && specList[0]) {
        const item = specList[0];
        const lastNames = item.apellidos || [item.primer_apellido, item.segundo_apellido].filter(Boolean).join(" ");
        const fullName = [item.nombres, lastNames]
          .map((s) => (s ? String(s).trim() : ""))
          .filter((s) => s.length > 0 && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined")
          .join(" ") || "Asistente";

        return {
          id: item.id,
          nombres: item.nombres || fullName,
          apellidos: lastNames || "",
          nombreCompleto: fullName,
          eventId: item.event_id,
          asistio: item.asistio,
          estadoPago: null,
          montoPendiente: null,
          pdfUrl: item.pdf_url,
        };
      }
    } catch (_) {}
  }

  // 3. Buscar en solicitudes de casas de paz o auditorio
  try {
    const orCondition = phoneTokens.map((p) => `telefono.eq.${p}`).join(",");
    const { data: cdpList } = await (supabase.from("casa_de_paz_solicitudes") as any)
      .select("id, nombre, barrio, direccion, created_at")
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
      };
    }
  } catch (_) {}

  return null;
}

/**
 * 🤖 FEATURE 1 & 3: Chatbot Inteligente IA 24/7 Contextual y Procesador de Intenciones
 */
export async function processWhatsAppMessageIntent(
  incomingText: string,
  senderPhone: string
): Promise<{ replyText: string; rsvpStatus?: "confirmado" | "cancelado" }> {
  const rawText = String(incomingText || "").trim();
  const cleanPhone = String(senderPhone || "").replace(/[^\d]/g, "");
  const norm = normalizeBotText(rawText);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://cmgeventos.lovable.app";

  // 1. Identificar perfil del asistente en base de datos
  const attendee = await lookupAttendeeProfile(cleanPhone || senderPhone);
  const attendeeName = attendee?.nombreCompleto || attendee?.nombres || "";
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
        .order("created_at", { ascending: false })
        .limit(1);

      if (activeEvents && activeEvents[0]) {
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
  // 4. DETECCIÓN DE INTENCIONES (CON NORMALIZACIÓN ROBUSTA)
  // =========================================================================

  // A. INTENCIÓN: Confirmar Asistencia RSVP ("1", "sí", "confirmo", "asistiré", "voy a ir", etc.)
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

  if (isRsvpYes) {
    if (attendee?.id) {
      try {
        await (supabase.from("registrations") as any)
          .update({ asistio: true, estado_rsvp: "confirmado" })
          .eq("id", attendee.id);
      } catch (_) {}

      return {
        replyText: `✅ ¡Excelente, ${greetingName}! Tu asistencia para *${currentEvent.nombre}* ha sido CONFIRMADA con éxito 🎉.\n\n📅 *Fecha:* ${currentEvent.fechaTexto}\n📍 *Lugar:* ${currentEvent.lugar}\n🎟️ *Tu Pase QR:* ${downloadUrl}\n\n¡Te esperamos con los brazos abiertos! Recuerda llegar 20 minutos antes para tu ingreso.`,
        rsvpStatus: "confirmado",
      };
    }

    return {
      replyText: `✅ ¡Muchas gracias por tu confirmación! 🎉\n\nTe esperamos en *${currentEvent.nombre}*.\n📅 *Fecha:* ${currentEvent.fechaTexto}\n📍 *Lugar:* ${currentEvent.lugar}\n\nSi aún no tienes tu pase QR de entrada, puedes generarlo aquí:\n👉 ${origin}`,
      rsvpStatus: "confirmado",
    };
  }

  // B. INTENCIÓN: Declinar / Cancelar Asistencia RSVP ("2", "no", "no podré", "cancelo", etc.)
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

  if (isRsvpNo) {
    if (attendee?.id) {
      try {
        await (supabase.from("registrations") as any)
          .update({ asistio: false, estado_rsvp: "cancelado" })
          .eq("id", attendee.id);
      } catch (_) {}

      return {
        replyText: `❌ Entendido, ${greetingName}. Hemos registrado que no podrás asistir a *${currentEvent.nombre}* en esta ocasión.\n\n¡Esperamos contar contigo en nuestros próximos eventos y reuniones! Que Dios te bendiga grandemente. 🙏✨`,
        rsvpStatus: "cancelado",
      };
    }

    return {
      replyText: `❌ Entendido. Hemos tomado nota de que no podrás asistir. ¡Esperamos verte pronto en un próximo evento! Bendiciones.`,
      rsvpStatus: "cancelado",
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
