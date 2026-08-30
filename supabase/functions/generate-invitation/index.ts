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

    // ── Datos del Evento ─────────────────────────────────────────────
    let eventName    = "Evento CMG";
    let eventPlace   = "";
    let eventDate    = "";
    let eventTime    = "";
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

    // ── QR Code ──────────────────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 500,
      margin: 1,
      color: { dark: "#083E30", light: "#ffffff" },
    });

    // ── PDF A4 Vertical — Blanco elegante ──────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();   // 210
    const H = doc.internal.pageSize.getHeight();  // 297

    // ── Paleta clara ────────────────────────────────────────────────
    const WHITE       = [255, 255, 255] as [number,number,number];
    const CREAM       = [252, 250, 244] as [number,number,number];
    const GRAY_LIGHT  = [245, 247, 245] as [number,number,number];
    const GRAY_MID    = [220, 225, 222] as [number,number,number];
    const GRAY_TEXT   = [110, 120, 115] as [number,number,number];
    const GREEN_DEEP  = [8,   62,  48]  as [number,number,number];
    const GREEN_MID   = [13,  94,  69]  as [number,number,number];
    const GREEN_LIGHT = [230, 246, 239] as [number,number,number];
    const GOLD        = [180, 140, 30]  as [number,number,number];  // dorado sobre blanco (oscurecido)
    const GOLD_FILL   = [207, 170, 55]  as [number,number,number];  // dorado para fondos verdes
    const GOLD_BG     = [255, 247, 215] as [number,number,number];  // crema dorada

    const CX = W / 2;

    // ── FONDO CREMA ─────────────────────────────────────────────────
    doc.setFillColor(...CREAM);
    doc.rect(0, 0, W, H, "F");

    // Patrón de líneas diagonales muy suaves
    doc.setDrawColor(235, 235, 230);
    doc.setLineWidth(0.15);
    for (let i = -H; i < W + H; i += 8) {
      doc.line(i, 0, i + H, H);
    }

    // ══════════════════════════════════════════════════════════════
    // CABECERA VERDE CON BORDES REDONDEADOS
    // ══════════════════════════════════════════════════════════════
    const headerH = 88;
    doc.setFillColor(...GREEN_DEEP);
    rr(doc, 10, 10, W - 20, headerH, 10, "F");

    // Ornamento esquinas (círculos blancos semitransparentes)
    doc.setFillColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
    doc.circle(22, 22, 18, "F");
    doc.circle(W - 22, 22, 18, "F");
    doc.circle(22, 10 + headerH - 12, 14, "F");
    doc.circle(W - 22, 10 + headerH - 12, 14, "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // Badge "INVITACIÓN OFICIAL"
    const badgeW = 68, badgeH = 7;
    const badgeY = 20;
    doc.setFillColor(...GOLD_FILL);
    rr(doc, CX - badgeW / 2, badgeY, badgeW, badgeH, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...GREEN_DEEP);
    doc.text("✦   INVITACIÓN OFICIAL   ✦", CX, badgeY + 5, { align: "center" });

    // Logo
    let logoBottomY = badgeY + badgeH + 4;
    if (logoUrl) {
      try {
        const logoRes = await fetch(logoUrl);
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const logoBytes  = new Uint8Array(logoBuffer);
          const ct  = logoRes.headers.get("content-type") || "image/png";
          const fmt = ct.includes("png") ? "PNG" : "JPEG";
          const lW = 48, lH = 26;
          doc.addImage(logoBytes, fmt, CX - lW / 2, logoBottomY, lW, lH);
          logoBottomY += lH + 4;
        }
      } catch (_) {}
    }

    // Nombre del Evento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...WHITE);
    const evLines = doc.splitTextToSize(eventName.toUpperCase(), W - 44);
    doc.text(evLines, CX, logoBottomY + 6, { align: "center" });

    // Línea blanca decorativa bajo nombre
    const lineAfterNameY = logoBottomY + 6 + evLines.length * 9 + 3;
    doc.setDrawColor(...GOLD_FILL);
    doc.setLineWidth(0.8);
    doc.line(CX - 30, lineAfterNameY, CX + 30, lineAfterNameY);

    // Texto CMG
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.65 }));
    doc.text("Centro Mundial de Gloria", CX, lineAfterNameY + 6, { align: "center" });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // ══════════════════════════════════════════════════════════════
    // TARJETA BLANCA CENTRAL (contenedor principal)
    // ══════════════════════════════════════════════════════════════
    const cardY = 10 + headerH + 6;
    const cardH = H - cardY - 22;
    doc.setFillColor(...WHITE);
    rr(doc, 10, cardY, W - 20, cardH, 8, "F");
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.3);
    rr(doc, 10, cardY, W - 20, cardH, 8, "S");

    // ── INVITADO ─────────────────────────────────────────────────
    let curY = cardY + 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    doc.text("SE INVITA CORDIALMENTE A:", CX, curY, { align: "center" });

    curY += 8;
    const fullName = `${reg.nombres} ${reg.apellidos}`;
    doc.setFont("helvetica", "bold");
    let fs = 26;
    doc.setFontSize(fs);
    doc.setTextColor(...GREEN_DEEP);
    let nameLines = doc.splitTextToSize(fullName, W - 44);
    while (nameLines.length > 2 && fs > 17) {
      fs -= 2;
      doc.setFontSize(fs);
      nameLines = doc.splitTextToSize(fullName, W - 44);
    }
    doc.text(nameLines, CX, curY, { align: "center" });
    curY += nameLines.length * (fs * 0.38) + 6;

    // Línea dorada bajo el nombre
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(CX - 35, curY, CX + 35, curY);
    // Pequeño diamante
    doc.setFillColor(...GOLD);
    doc.circle(CX, curY, 1.5, "F");
    curY += 8;

    // ── BLOQUE FECHA / LUGAR ─────────────────────────────────────
    if (eventDate || eventPlace) {
      const infoH = (eventDate ? 12 : 0) + (eventPlace ? 12 : 0) + 14;
      doc.setFillColor(...GREEN_LIGHT);
      rr(doc, 18, curY, W - 36, infoH, 6, "F");
      doc.setFillColor(...GREEN_DEEP);
      doc.rect(18, curY, 3.5, infoH, "F");

      let iy = curY + 10;
      if (eventDate) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...GREEN_DEEP);
        doc.text("📅  Fecha:", 27, iy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        const ds = eventDate.charAt(0).toUpperCase() + eventDate.slice(1);
        doc.text(`${ds}${eventTime ? "  ·  " + eventTime : ""}`, 58, iy);
        iy += 12;
      }
      if (eventPlace) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...GREEN_DEEP);
        doc.text("📍  Lugar:", 27, iy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(eventPlace, 58, iy);
      }
      curY += infoH + 8;
    }

    // ── SEPARADOR TIPO TICKET (perforado) ────────────────────────
    doc.setDrawColor(...GRAY_MID);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(24, curY + 4, W - 24, curY + 4);
    doc.setLineDashPattern([], 0);
    // Muescas en lados
    doc.setFillColor(...CREAM);
    doc.circle(10, curY + 4, 5, "F");
    doc.circle(W - 10, curY + 4, 5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY_TEXT);
    doc.text("CÓDIGO DE ACCESO AL EVENTO", CX, curY + 2.5, { align: "center" });
    curY += 12;

    // ── QR ───────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GREEN_DEEP);
    doc.text("Presenta este código en la entrada", CX, curY + 5, { align: "center" });

    const qrSize = 52;
    const qrX = CX - qrSize / 2;
    const qrY2 = curY + 10;

    // Sombra suave
    doc.setFillColor(200, 210, 205);
    rr(doc, qrX + 2, qrY2 + 2, qrSize, qrSize, 5, "F");
    // Marco verde
    doc.setFillColor(...GREEN_MID);
    rr(doc, qrX - 5, qrY2 - 5, qrSize + 10, qrSize + 10, 6, "F");
    // Borde dorado
    doc.setDrawColor(...GOLD_FILL);
    doc.setLineWidth(0.8);
    rr(doc, qrX - 3, qrY2 - 3, qrSize + 6, qrSize + 6, 5, "S");
    // Fondo blanco para QR
    doc.setFillColor(...WHITE);
    doc.rect(qrX - 1, qrY2 - 1, qrSize + 2, qrSize + 2, "F");
    doc.addImage(qrDataUrl, "PNG", qrX, qrY2, qrSize, qrSize);
    curY = qrY2 + qrSize + 6;

    // ID en crema dorada
    doc.setFillColor(...GOLD_BG);
    rr(doc, CX - 28, curY, 56, 8, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text(registrationId.slice(0, 8).toUpperCase(), CX, curY + 5.8, { align: "center" });
    curY += 12;

    // ── MENSAJE DEL EVENTO ───────────────────────────────────────
    if (emailMessage && curY + 20 < cardY + cardH - 8) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_TEXT);
      const msgLines = doc.splitTextToSize(`"${emailMessage}"`, W - 52);
      doc.text(msgLines.slice(0, 2), CX, curY + 6, { align: "center" });
    }

    // ══════════════════════════════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════════════════════════════
    const footerY = H - 18;
    doc.setFillColor(...GREEN_DEEP);
    rr(doc, 10, footerY - 4, W - 20, 14, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GOLD_FILL);
    doc.text("Centro Mundial de Gloria  ·  Doxa Eventos", CX, footerY + 3, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
    doc.text("Documento personal e intransferible", CX, footerY + 8, { align: "center" });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // ── Subir PDF ─────────────────────────────────────────────────
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
