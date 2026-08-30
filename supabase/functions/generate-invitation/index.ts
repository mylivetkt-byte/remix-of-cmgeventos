import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function rr(doc: any, x: number, y: number, w: number, h: number, r: number, style: string) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

function hexToRgb(hex: string | null | undefined, defaultRgb: [number, number, number]): [number, number, number] {
  if (!hex) return defaultRgb;
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) return defaultRgb;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return defaultRgb;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registrationId } = await req.json();
    if (!registrationId) {
      return new Response(JSON.stringify({ error: "registrationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (regErr || !reg) {
      return new Response(JSON.stringify({ error: "Registration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Datos del Evento ─────────────────────────────────────────────
    let eventName    = "Evento CMG";
    let eventPlace   = "";
    let eventDate    = "";
    let eventTime    = "";
    let eventImage: string | null = null;
    let primaryHex   = "#083E30";
    let secondaryHex = "#CFAA37";
    let emailMessage = "Te invitamos cordialmente a este evento especial.";

    if (reg.event_id) {
      const { data: evt } = await supabase.from("events").select("*").eq("id", reg.event_id).maybeSingle();
      if (evt) {
        eventName    = evt.nombre || "Evento CMG";
        eventPlace   = evt.lugar_evento || "";
        eventImage   = evt.logo_url || evt.banner_url || null;
        primaryHex   = evt.color_primario || primaryHex;
        secondaryHex = evt.color_secundario || secondaryHex;
        emailMessage = evt.mensaje_correo || emailMessage;
        if (evt.fecha_evento) {
          const d = new Date(evt.fecha_evento);
          eventDate = d.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          eventTime = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
        }
      }
    }

    if (!reg.event_id || !eventName || eventName === "Evento CMG") {
      const { data: config } = await supabase.from("event_config").select("*").limit(1).maybeSingle();
      if (config) {
        eventName    = config.nombre_evento || eventName;
        eventPlace   = config.lugar_evento  || eventPlace;
        eventImage   = config.logo_url || eventImage;
        emailMessage = config.mensaje_correo || emailMessage;
        if (config.fecha_evento) {
          const d = new Date(config.fecha_evento);
          eventDate = d.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          eventTime = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
        }
      }
    }

    // ── Colores Dinámicos ───────────────────────────────────────────
    const COLOR_PRIMARY   = hexToRgb(primaryHex, [8, 62, 48]);
    const COLOR_SECONDARY = hexToRgb(secondaryHex, [207, 170, 55]);

    const WHITE       = [255, 255, 255] as [number, number, number];
    const CREAM_BG    = [250, 250, 246] as [number, number, number];
    const GRAY_LIGHT  = [243, 245, 244] as [number, number, number];
    const GRAY_MID    = [218, 224, 221] as [number, number, number];
    const GRAY_TEXT   = [100, 112, 108] as [number, number, number];

    // ── QR Code ──────────────────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 500,
      margin: 1,
      color: { dark: primaryHex, light: "#ffffff" },
    });

    // ── PDF A4 Vertical (VIP Luxury Design) ─────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();   // 210
    const H = doc.internal.pageSize.getHeight();  // 297
    const CX = W / 2;

    // ── Fondo Crema Alabastro ───────────────────────────────────────
    doc.setFillColor(...CREAM_BG);
    doc.rect(0, 0, W, H, "F");

    // Patrón de marcas de agua diagonales muy tenues
    doc.setDrawColor(238, 238, 233);
    doc.setLineWidth(0.15);
    for (let i = -H; i < W + H; i += 10) {
      doc.line(i, 0, i + H, H);
    }

    // ══════════════════════════════════════════════════════════════
    // CABECERA VIP DEL EVENTO (Color Primario Dinámico)
    // ══════════════════════════════════════════════════════════════
    const headerH = 92;
    doc.setFillColor(...COLOR_PRIMARY);
    rr(doc, 10, 10, W - 20, headerH, 10, "F");

    // Adorno geométrico de esquina
    doc.setFillColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
    doc.circle(22, 22, 20, "F");
    doc.circle(W - 22, 22, 20, "F");
    doc.circle(22, 10 + headerH - 12, 15, "F");
    doc.circle(W - 22, 10 + headerH - 12, 15, "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // Badge Superior: INVITACIÓN OFICIAL VIP
    const badgeW = 74, badgeH = 7.5;
    const badgeY = 18;
    doc.setFillColor(...COLOR_SECONDARY);
    rr(doc, CX - badgeW / 2, badgeY, badgeW, badgeH, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text("✦   ENTRADA OFICIAL • PASE VIP   ✦", CX, badgeY + 5.2, { align: "center" });

    // Imagen del Evento (Logo / Banner)
    let currentY = badgeY + badgeH + 5;
    if (eventImage) {
      try {
        const imgRes = await fetch(eventImage);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const imgBytes  = new Uint8Array(imgBuffer);
          const ct  = imgRes.headers.get("content-type") || "image/png";
          const fmt = ct.includes("png") ? "PNG" : "JPEG";
          const maxW = 54, maxH = 26;
          doc.addImage(imgBytes, fmt, CX - maxW / 2, currentY, maxW, maxH);
          currentY += maxH + 4;
        }
      } catch (_) {}
    }

    // Nombre del Evento (Título Principal)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...WHITE);
    const evLines = doc.splitTextToSize(eventName.toUpperCase(), W - 44);
    doc.text(evLines, CX, currentY + 6, { align: "center" });

    // Línea de separación secundaria
    const lineY = currentY + 6 + evLines.length * 8.5 + 2;
    doc.setDrawColor(...COLOR_SECONDARY);
    doc.setLineWidth(0.9);
    doc.line(CX - 32, lineY, CX + 32, lineY);

    // Subtítulo Institucional
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
    doc.text("Centro Mundial de Gloria  •  Doxa Eventos", CX, lineY + 6, { align: "center" });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // ══════════════════════════════════════════════════════════════
    // TARJETA DE ASISTENTE (Cuerpo Principal Blanco Elegante)
    // ══════════════════════════════════════════════════════════════
    const cardY = 10 + headerH + 6;
    const cardH = H - cardY - 22;
    doc.setFillColor(...WHITE);
    rr(doc, 10, cardY, W - 20, cardH, 8, "F");
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.35);
    rr(doc, 10, cardY, W - 20, cardH, 8, "S");

    // Etiqueta de Invitado
    let curY = cardY + 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    doc.text("SE INVITA CORDIALMENTE A:", CX, curY, { align: "center" });

    // Nombre Completo del Asistente
    curY += 8;
    const fullName = `${reg.nombres} ${reg.apellidos}`;
    doc.setFont("helvetica", "bold");
    let fontSize = 26;
    doc.setFontSize(fontSize);
    doc.setTextColor(...COLOR_PRIMARY);
    let nameLines = doc.splitTextToSize(fullName, W - 44);
    while (nameLines.length > 2 && fontSize > 16) {
      fontSize -= 2;
      doc.setFontSize(fontSize);
      nameLines = doc.splitTextToSize(fullName, W - 44);
    }
    doc.text(nameLines, CX, curY, { align: "center" });
    curY += nameLines.length * (fontSize * 0.38) + 6;

    // Adorno central dorado bajo el nombre
    doc.setDrawColor(...COLOR_SECONDARY);
    doc.setLineWidth(1);
    doc.line(CX - 38, curY, CX + 38, curY);
    doc.setFillColor(...COLOR_SECONDARY);
    doc.circle(CX, curY, 1.6, "F");
    curY += 8;

    // ── BLOQUE FECHA & LUGAR ──────────────────────────────────────
    if (eventDate || eventPlace) {
      const infoH = (eventDate ? 13 : 0) + (eventPlace ? 13 : 0) + 10;
      doc.setFillColor(...GRAY_LIGHT);
      rr(doc, 18, curY, W - 36, infoH, 6, "F");
      
      // Barra lateral de acento de color primario
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(18, curY, 4, infoH, "F");

      let iy = curY + 10;
      if (eventDate) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLOR_PRIMARY);
        doc.text("📅  FECHA:", 27, iy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        const formattedDate = eventDate.charAt(0).toUpperCase() + eventDate.slice(1);
        doc.text(`${formattedDate}${eventTime ? "  ·  " + eventTime : ""}`, 56, iy);
        iy += 13;
      }
      if (eventPlace) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...COLOR_PRIMARY);
        doc.text("📍  LUGAR:", 27, iy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(eventPlace, 56, iy);
      }
      curY += infoH + 8;
    }

    // ── PERFORACIÓN DE TICKET / STUB ─────────────────────────────
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(24, curY + 4, W - 24, curY + 4);
    doc.setLineDashPattern([], 0);

    // Muescas de ticket en los bordes
    doc.setFillColor(...CREAM_BG);
    doc.circle(10, curY + 4, 5, "F");
    doc.circle(W - 10, curY + 4, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text("CÓDIGO DE CONTROL Y ACCESO AL EVENTO", CX, curY + 2.8, { align: "center" });
    curY += 12;

    // ── CÓDIGO QR Y VALIDACIÓN ──────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text("Presenta este código QR desde tu celular al ingresar", CX, curY + 4, { align: "center" });

    const qrSize = 52;
    const qrX = CX - qrSize / 2;
    const qrY = curY + 8;

    // Sombra del QR
    doc.setFillColor(210, 215, 212);
    rr(doc, qrX + 2, qrY + 2, qrSize, qrSize, 5, "F");
    // Marco exterior con color primario
    doc.setFillColor(...COLOR_PRIMARY);
    rr(doc, qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 6, "F");
    // Borde interior secundario (dorado)
    doc.setDrawColor(...COLOR_SECONDARY);
    doc.setLineWidth(0.8);
    rr(doc, qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 5, "S");
    // Fondo blanco para legibilidad óptima del QR
    doc.setFillColor(...WHITE);
    doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, "F");
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    curY = qrY + qrSize + 7;

    // Badge del ID de Registro
    doc.setFillColor(...COLOR_PRIMARY);
    rr(doc, CX - 30, curY, 60, 8.5, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(`ID: #${registrationId.slice(0, 8).toUpperCase()}`, CX, curY + 6, { align: "center" });
    curY += 13;

    // Mensaje opcional del evento
    if (emailMessage && curY + 14 < cardY + cardH - 6) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY_TEXT);
      const msgLines = doc.splitTextToSize(`"${emailMessage}"`, W - 52);
      doc.text(msgLines.slice(0, 2), CX, curY + 4, { align: "center" });
    }

    // ══════════════════════════════════════════════════════════════
    // PIE DE PÁGINA INSTITUCIONAL
    // ══════════════════════════════════════════════════════════════
    const footerY = H - 18;
    doc.setFillColor(...COLOR_PRIMARY);
    rr(doc, 10, footerY - 4, W - 20, 14, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text("Centro Mundial de Gloria  •  Doxa Eventos", CX, footerY + 3, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.7 }));
    doc.text("Documento personal e intransferible — Validez oficial para 1 persona", CX, footerY + 8, { align: "center" });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // ── Guardar y Subir PDF ──────────────────────────────────────
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    const fileName = `invitation_${registrationId}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("invitations")
      .upload(fileName, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("invitations").getPublicUrl(fileName);
    const pdfUrl = urlData.publicUrl;

    await supabase
      .from("registrations")
      .update({ pdf_url: pdfUrl, qr_code: registrationId })
      .eq("id", registrationId);

    try {
      await supabase.functions.invoke("send-brevo-email", { body: { registrationId } });
    } catch (_) {}

    try {
      await supabase.functions.invoke("send-whatsapp", { body: { registrationId } });
    } catch (_) {}

    return new Response(
      JSON.stringify({ success: true, pdfUrl, qrCode: registrationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error generating invitation:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
