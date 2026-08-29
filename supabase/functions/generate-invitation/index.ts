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

    // ── Datos del Evento (por event_id o fallback a event_config) ──────
    let eventName  = "Evento CMG";
    let eventPlace = "";
    let eventDate  = "";
    let eventTime  = "";
    let logoUrl: string | null = null;
    let emailMessage = "Te invitamos cordialmente a este evento especial.";

    if (reg.event_id) {
      const { data: evt } = await supabase.from("events").select("*").eq("id", reg.event_id).maybeSingle();
      if (evt) {
        eventName    = evt.nombre || "Evento CMG";
        eventPlace   = evt.lugar_evento || "";
        logoUrl      = evt.logo_url || null;
        emailMessage = evt.mensaje_correo || emailMessage;

        if (evt.fecha_evento) {
          const d = new Date(evt.fecha_evento);
          eventDate = d.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          eventTime = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
        }
      }
    }

    if (!reg.event_id || !eventName) {
      const { data: config } = await supabase.from("event_config").select("*").limit(1).maybeSingle();
      if (config) {
        eventName    = config.nombre_evento || "Evento CMG";
        eventPlace   = config.lugar_evento  || "";
        logoUrl      = config.logo_url || null;
        emailMessage = config.mensaje_correo || emailMessage;
        if (config.fecha_evento) {
          const d = new Date(config.fecha_evento);
          eventDate = d.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          eventTime = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
        }
      }
    }

    // ── QR Code ─────────────────────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 500,
      margin: 1,
      color: { dark: "#083E30", light: "#ffffff" },
    });

    // ── PDF — A4 Vertical (Diseño tipo Ticket Premium) ──────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();   // 210
    const H = doc.internal.pageSize.getHeight();  // 297

    // ── Paleta ──────────────────────────────────────────────────────────
    const DARK        = [5,   18,  40];    // #05122A
    const GREEN_DEEP  = [8,   62,  48];    // #083E30
    const GREEN_MID   = [13,  79,  60];    // #0D4F3C
    const GREEN_LIGHT = [24, 110,  82];    // #186E52
    const GOLD        = [207, 170, 55];    // #CFAA37
    const GOLD_LIGHT  = [232, 200, 90];    // #E8C85A
    const WHITE       = [255, 255, 255];
    const CREAM       = [252, 250, 244];   // #FCFAF4
    const GRAY        = [170, 170, 170];

    const CX = W / 2; // Centro horizontal

    // ══════════════════════════════════════════════════════════════════
    // FONDO OSCURO COMPLETO
    // ══════════════════════════════════════════════════════════════════
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.rect(0, 0, W, H, "F");

    // Cuadrícula de puntos decorativos (sutil)
    doc.setFillColor(20, 50, 90);
    for (let x = 8; x < W; x += 10) {
      for (let y = 8; y < H; y += 10) {
        doc.circle(x, y, 0.35, "F");
      }
    }

    // ── CABECERA VERDE ESMERALDA ──────────────────────────────────────
    const headerH = 85;
    doc.setFillColor(GREEN_DEEP[0], GREEN_DEEP[1], GREEN_DEEP[2]);
    rr(doc, 8, 8, W - 16, headerH, 8, "F");

    // Triángulo decorativo en header
    doc.setFillColor(GREEN_LIGHT[0], GREEN_LIGHT[1], GREEN_LIGHT[2]);
    doc.triangle(W - 16, 8, W - 8, 8, W - 8, 38, "F");
    doc.triangle(8, 8, 40, 8, 8, 30, "F");

    // ── LOGO ─────────────────────────────────────────────────────────
    let logoBottomY = 28;
    if (logoUrl) {
      try {
        const logoRes = await fetch(logoUrl);
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const logoBytes  = new Uint8Array(logoBuffer);
          const ct  = logoRes.headers.get("content-type") || "image/png";
          const fmt = ct.includes("png") ? "PNG" : "JPEG";
          const logoW = 50, logoH = 28;
          doc.addImage(logoBytes, fmt, CX - logoW / 2, 16, logoW, logoH);
          logoBottomY = 16 + logoH + 4;
        }
      } catch (_) {}
    }

    // Badge INVITACIÓN OFICIAL
    const badgeY = logoBottomY + 2;
    const badgeW = 70, badgeH = 7;
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    rr(doc, CX - badgeW / 2, badgeY, badgeW, badgeH, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(GREEN_DEEP[0], GREEN_DEEP[1], GREEN_DEEP[2]);
    doc.text("✦   INVITACIÓN OFICIAL   ✦", CX, badgeY + 5, { align: "center" });

    // Nombre del Evento
    const evNameY = badgeY + badgeH + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    const evLines = doc.splitTextToSize(eventName.toUpperCase(), W - 40);
    doc.text(evLines, CX, evNameY, { align: "center" });

    // ── LÍNEA DORADA ──────────────────────────────────────────────────
    const dividerY = headerH + 14;
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(1.5);
    doc.line(16, dividerY, W - 16, dividerY);
    // Diamante central
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    const ds = 3;
    doc.triangle(CX, dividerY - ds, CX + ds, dividerY, CX, dividerY + ds, "F");
    doc.triangle(CX, dividerY - ds, CX - ds, dividerY, CX, dividerY + ds, "F");
    // Puntos dorados en extremos
    doc.circle(18, dividerY, 1.5, "F");
    doc.circle(W - 18, dividerY, 1.5, "F");

    // ── NOMBRE DEL ASISTENTE ──────────────────────────────────────────
    const nameY = dividerY + 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text("SE INVITA CORDIALMENTE A:", CX, nameY, { align: "center" });

    const fullName = `${reg.nombres} ${reg.apellidos}`;
    doc.setFont("helvetica", "bold");
    let fontSize = 28;
    doc.setFontSize(fontSize);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    let nameLines = doc.splitTextToSize(fullName, W - 32);
    while (nameLines.length > 2 && fontSize > 18) {
      fontSize -= 2;
      doc.setFontSize(fontSize);
      nameLines = doc.splitTextToSize(fullName, W - 32);
    }
    const personNameY = nameY + 10;
    doc.text(nameLines, CX, personNameY, { align: "center" });

    // ── CONTENEDOR FECHA/LUGAR ─────────────────────────────────────────
    let infoY = personNameY + (nameLines.length * (fontSize * 0.4)) + 14;

    if (eventDate || eventPlace) {
      const infoBoxH = (eventDate ? 14 : 0) + (eventPlace ? 14 : 0) + 16;
      doc.setFillColor(GREEN_DEEP[0], GREEN_DEEP[1], GREEN_DEEP[2]);
      rr(doc, 14, infoY, W - 28, infoBoxH, 6, "F");
      doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.setLineWidth(0.4);
      rr(doc, 14, infoY, W - 28, infoBoxH, 6, "S");

      // Franja izquierda dorada
      doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.rect(14, infoY, 3, infoBoxH, "F");

      let lineY = infoY + 12;
      if (eventDate) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.text("📅  Fecha:", 24, lineY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
        const dateStr = eventDate.charAt(0).toUpperCase() + eventDate.slice(1);
        doc.text(`${dateStr}${eventTime ? "  ·  " + eventTime : ""}`, 54, lineY);
        lineY += 14;
      }
      if (eventPlace) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.text("📍  Lugar:", 24, lineY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
        doc.text(eventPlace, 54, lineY);
      }

      infoY += infoBoxH + 14;
    }

    // ── PERFORACIÓN HORIZONTAL (Separador Ticket) ─────────────────────
    const perfY = infoY + 4;
    doc.setDrawColor(30, 65, 95);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(24, perfY, W - 24, perfY);
    doc.setLineDashPattern([], 0);
    // Semicírculos a los lados
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.circle(8, perfY, 5, "F");
    doc.circle(W - 8, perfY, 5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(50, 90, 120);
    doc.text("PRESENTAR ESTE DOCUMENTO AL INGRESAR", CX, perfY - 2, { align: "center" });

    // ── SECCIÓN QR ────────────────────────────────────────────────────
    const qrSectionY = perfY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text("CÓDIGO DE ACCESO", CX, qrSectionY + 7, { align: "center" });

    const qrSize = 55;
    const qrX = CX - qrSize / 2;
    const qrY = qrSectionY + 12;

    // Sombra del QR
    doc.setFillColor(2, 10, 22);
    rr(doc, qrX + 2, qrY + 2, qrSize, qrSize, 5, "F");
    // Marco verde
    doc.setFillColor(GREEN_MID[0], GREEN_MID[1], GREEN_MID[2]);
    rr(doc, qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 5, "F");
    // Borde dorado
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.8);
    rr(doc, qrX - 3.5, qrY - 3.5, qrSize + 7, qrSize + 7, 4, "S");
    // Fondo blanco para QR
    doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, "F");
    // QR
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Texto bajo QR
    const qrEndY = qrY + qrSize + 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text("Escanea este código en la entrada del evento", CX, qrEndY + 3, { align: "center" });

    // ID corto
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text(registrationId.slice(0, 8).toUpperCase(), CX, qrEndY + 10, { align: "center" });

    // ── MENSAJE FINAL ─────────────────────────────────────────────────
    const msgY = qrEndY + 18;
    const msgW = W - 40;

    // Fondo contenedor mensaje
    doc.setFillColor(GREEN_DEEP[0], GREEN_DEEP[1], GREEN_DEEP[2]);
    rr(doc, 14, msgY - 6, msgW + 12, 30, 5, "F");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(CREAM[0], CREAM[1], CREAM[2]);
    const msgLines = doc.splitTextToSize(`"${emailMessage}"`, msgW);
    doc.text(msgLines.slice(0, 2), CX, msgY + 4, { align: "center" });

    // ── FOOTER ───────────────────────────────────────────────────────
    const footerY = H - 18;
    doc.setFillColor(GREEN_DEEP[0], GREEN_DEEP[1], GREEN_DEEP[2]);
    rr(doc, 8, footerY - 4, W - 16, 14, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text("Centro Mundial de Gloria  ·  CMG Eventos", CX, footerY + 3, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text("Documento personal e intransferible  ·  Conserva esta invitación", CX, footerY + 8, { align: "center" });

    // ── Subir PDF ─────────────────────────────────────────────────────
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
