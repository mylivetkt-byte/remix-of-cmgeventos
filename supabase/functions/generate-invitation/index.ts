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

// Icono de iglesia vectorial (dorado) — techo triangular, cuerpo y cruz
function drawChurchIcon(doc: any, cx: number, cy: number, s: number, rgb: [number, number, number]) {
  doc.setFillColor(...rgb);
  // Cuerpo
  doc.rect(cx - s * 0.28, cy - s * 0.05, s * 0.56, s * 0.45, "F");
  // Techo (triángulo)
  doc.triangle(cx - s * 0.34, cy - s * 0.05, cx, cy - s * 0.38, cx + s * 0.34, cy - s * 0.05, "F");
  // Cruz en el campanario
  doc.rect(cx - s * 0.035, cy - s * 0.62, s * 0.07, s * 0.24, "F");
  doc.rect(cx - s * 0.10, cy - s * 0.55, s * 0.20, s * 0.06, "F");
  // Puerta (hueco con color de fondo se simula con semicírculo blanco del header → usar color primario)
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
    let primaryHex   = "#0B4A34";
    let secondaryHex = "#D4AF37";
    let emailMessage = "Te invitamos cordialmente a este evento especial.";

    if (reg.event_id) {
      const { data: evt } = await supabase.from("events").select("*").eq("id", reg.event_id).maybeSingle();
      if (evt) {
        eventName    = evt.nombre || "Evento CMG";
        eventPlace   = evt.lugar_evento || "";
        eventImage   = evt.banner_url || evt.logo_url || null;
        primaryHex   = evt.color_primario || primaryHex;
        secondaryHex = evt.color_secundario || secondaryHex;
        emailMessage = evt.mensaje_correo || emailMessage;
        if (evt.fecha_evento) {
          const d = new Date(evt.fecha_evento);
          eventDate = d.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          eventTime = d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
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
          eventTime = d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
        }
      }
    }

    // ── Colores Dinámicos ───────────────────────────────────────────
    const GREEN  = hexToRgb(primaryHex, [11, 74, 52]);
    const GOLD   = hexToRgb(secondaryHex, [212, 175, 55]);
    const WHITE  = [255, 255, 255] as [number, number, number];
    const INK    = [38, 38, 38] as [number, number, number];
    const GRAY   = [110, 110, 110] as [number, number, number];
    const LINE   = [210, 210, 210] as [number, number, number];

    // ── QR Code ──────────────────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 500,
      margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });

    // ── Cargar imagen del evento (si existe) ────────────────────────
    let eventImgBytes: Uint8Array | null = null;
    let eventImgFmt = "PNG";
    if (eventImage) {
      try {
        const imgRes = await fetch(eventImage);
        if (imgRes.ok) {
          eventImgBytes = new Uint8Array(await imgRes.arrayBuffer());
          const ct = imgRes.headers.get("content-type") || "image/png";
          eventImgFmt = ct.includes("png") ? "PNG" : "JPEG";
        }
      } catch (_) {}
    }

    // ══════════════════════════════════════════════════════════════
    // TICKET VERTICAL ESTILO PASE VIP (A5)
    // ══════════════════════════════════════════════════════════════
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
    const W = doc.internal.pageSize.getWidth();   // 148
    const H = doc.internal.pageSize.getHeight();  // 210
    const CX = W / 2;

    // Fondo gris muy claro de la página
    doc.setFillColor(244, 245, 244);
    doc.rect(0, 0, W, H, "F");

    // ── Tarjeta del ticket ─────────────────────────────────────────
    const TX = 14, TY = 12, TW = W - 28, TH = H - 24; // 120 x 186
    doc.setFillColor(...WHITE);
    rr(doc, TX, TY, TW, TH, 8, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    rr(doc, TX, TY, TW, TH, 8, "S");

    // ── Cabecera verde (esquinas superiores redondeadas) ─────────
    const headerH = eventImgBytes ? 78 : 62;
    doc.setFillColor(...GREEN);
    rr(doc, TX, TY, TW, headerH, 8, "F");
    doc.rect(TX, TY + headerH / 2, TW, headerH / 2, "F"); // cuadrar esquinas inferiores

    // Brillo decorativo sutil
    doc.setFillColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
    doc.circle(TX + 18, TY + 8, 16, "F");
    doc.circle(TX + TW - 18, TY + headerH - 6, 20, "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // Badge dorado más grande: ENTRADA OFICIAL • PASE VIP
    const badgeW = 74, badgeH = 9;
    doc.setFillColor(...GOLD);
    rr(doc, CX - badgeW / 2, TY + 6, badgeW, badgeH, 4.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text("ENTRADA OFICIAL  •  PASE VIP", CX, TY + 12.3, { align: "center" });

    // Nombre del evento en dorado (más arriba, centrado, ancho completo)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...GOLD);
    const titleLines = doc.splitTextToSize(eventName.toUpperCase(), TW - 16);
    const titleY = TY + 24;
    doc.text(titleLines, CX, titleY, { align: "center" });
    let headerCurY = titleY + (titleLines.length - 1) * 5.5 + 5;

    // Imagen del evento centrada debajo del título, en marco dorado
    if (eventImgBytes) {
      const imgSize = 24;
      const imgX = CX - imgSize / 2;
      const imgY = headerCurY;
      doc.setFillColor(...GOLD);
      rr(doc, imgX - 1.5, imgY - 1.5, imgSize + 3, imgSize + 3, 4, "F");
      doc.setFillColor(...WHITE);
      rr(doc, imgX - 0.5, imgY - 0.5, imgSize + 1, imgSize + 1, 3.5, "F");
      doc.addImage(eventImgBytes, eventImgFmt, imgX, imgY, imgSize, imgSize);
      headerCurY += imgSize + 6;
    } else {
      drawChurchIcon(doc, CX, headerCurY + 12, 16, GOLD);
      headerCurY += 22;
    }

    // Fecha del evento en la cabecera (blanco)
    if (eventDate) {
      const dateStr = eventDate.charAt(0).toUpperCase() + eventDate.slice(1);
      const full = eventTime ? `${dateStr} • ${eventTime}` : dateStr;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...WHITE);
      doc.text(doc.splitTextToSize(full, TW - 20), CX, Math.min(headerCurY + 1, TY + headerH - 6.5), { align: "center" });
    }

    // Línea dorada al final de la cabecera
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.7);
    doc.line(TX + 30, TY + headerH - 3.5, TX + TW - 30, TY + headerH - 3.5);

    // ── Nombre del asistente (serif, verde, protagonista) ─────────
    let curY = TY + headerH + 16;
    const fullName = `${reg.nombres} ${reg.apellidos}`.toUpperCase();
    doc.setFont("times", "bold");
    doc.setTextColor(...GREEN);
    let fontSize = 24;
    doc.setFontSize(fontSize);
    let nameLines = doc.splitTextToSize(fullName, TW - 18);
    while (nameLines.length > 2 && fontSize > 14) {
      fontSize -= 2;
      doc.setFontSize(fontSize);
      nameLines = doc.splitTextToSize(fullName, TW - 18);
    }
    doc.text(nameLines, CX, curY, { align: "center" });
    curY += nameLines.length * (fontSize * 0.4) + 7;

    // ── Lugar del evento (la fecha ya va en la cabecera) ─────────
    if (eventPlace) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      const pLines = doc.splitTextToSize(eventPlace, TW - 16);
      doc.text(pLines, CX, curY, { align: "center" });
      curY += pLines.length * 4.4 + 2;
    }

    // ── Estado de pago (badge pequeño) ────────────────────────────
    const payState = reg.estado_pago || "Pendiente";
    let payText: string | null = null;
    let payBg: [number, number, number] = [254, 242, 242];
    let payFg: [number, number, number] = [220, 38, 38];
    if (payState === "Pagado Completo") {
      payText = "PAGO COMPLETO"; payBg = [236, 253, 245]; payFg = [5, 150, 105];
    } else if (payState === "Abonado") {
      payText = "ABONO PARCIAL"; payBg = [254, 243, 199]; payFg = [180, 100, 6];
    } else if (payState === "Becado") {
      payText = "ENTRADA BECADA"; payBg = [243, 232, 255]; payFg = [147, 51, 234];
    } else {
      payText = "PAGO PENDIENTE";
    }
    curY += 2;
    doc.setFillColor(...payBg);
    rr(doc, CX - 24, curY, 48, 6, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...payFg);
    doc.text(payText, CX, curY + 4.2, { align: "center" });
    curY += 10;

    // ── Línea perforada con muescas laterales ─────────────────────
    const stubY = curY + 4;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([2.5, 2.5], 0);
    doc.line(TX + 8, stubY, TX + TW - 8, stubY);
    doc.setLineDashPattern([], 0);
    // Muescas del ticket (círculos del color del fondo de página)
    doc.setFillColor(244, 245, 244);
    doc.circle(TX, stubY, 4.5, "F");
    doc.circle(TX + TW, stubY, 4.5, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.circle(TX, stubY, 4.5, "S");
    doc.circle(TX + TW, stubY, 4.5, "S");

    // ── QR con marco dorado + Badge ID (centrados en el stub) ─────
    const footerH = 14;
    const footerY = TY + TH - footerH;
    const qrSize = 40;
    const badgeBoxW = 34, badgeBoxH = 16;
    const gap = 6;
    const groupW = qrSize + gap + badgeBoxW;
    const qrX = CX - groupW / 2;
    const stubSpaceTop = stubY + 6;
    const stubSpaceBottom = footerY - 6;
    const qrY = stubSpaceTop + Math.max(0, (stubSpaceBottom - stubSpaceTop - qrSize) / 2);

    // Marco dorado del QR
    doc.setFillColor(...GOLD);
    rr(doc, qrX - 2.5, qrY - 2.5, qrSize + 5, qrSize + 5, 4, "F");
    doc.setFillColor(...WHITE);
    rr(doc, qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 3, "F");
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Badge ID a la derecha del QR
    const badgeX = qrX + qrSize + gap;
    const badgeY = qrY + qrSize / 2 - badgeBoxH / 2;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.setFillColor(...WHITE);
    rr(doc, badgeX, badgeY, badgeBoxW, badgeBoxH, 3, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.text("Ticket badge ID:", badgeX + badgeBoxW / 2, badgeY + 5.5, { align: "center" });
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`#${registrationId.slice(0, 8).toUpperCase()}`, badgeX + badgeBoxW / 2, badgeY + 11.5, { align: "center" });

    // Texto guía bajo el QR
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text("Presenta este código QR al ingresar al evento", CX, qrY + qrSize + 6, { align: "center" });

    // ── Pie verde (esquinas inferiores redondeadas) ───────────────
    doc.setFillColor(...GREEN);
    rr(doc, TX, footerY, TW, footerH, 8, "F");
    doc.rect(TX, footerY, TW, footerH / 2, "F"); // cuadrar esquinas superiores
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("Centro Mundial de Gloria  •  Doxa Eventos", CX, footerY + footerH / 2 + 2.5, { align: "center" });

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
