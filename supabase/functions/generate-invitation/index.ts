import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function roundedRect(doc: any, x: number, y: number, w: number, h: number, r: number, style: string) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

function drawDiamondPattern(doc: any, cx: number, cy: number, size: number, color: number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
  const half = size / 2;
  // Simple diamond shape using a small rotated square
  doc.circle(cx, cy, size * 0.4, "F");
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

    const { data: config } = await supabase
      .from("event_config")
      .select("*")
      .limit(1)
      .single();

    const eventName  = config?.nombre_evento || "Evento";
    const eventPlace = config?.lugar_evento  || "";
    const eventDate  = config?.fecha_evento
      ? new Date(config.fecha_evento).toLocaleDateString("es-CO", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })
      : "";
    const eventTime = config?.fecha_evento
      ? new Date(config.fecha_evento).toLocaleTimeString("es-CO", {
          hour: "2-digit", minute: "2-digit",
        })
      : "";

    // ── QR ─────────────────────────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 400,
      margin: 1,
      color: { dark: "#0D4F3C", light: "#ffffff" },
    });

    // ── PDF A4 horizontal ─────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();   // 297
    const H = doc.internal.pageSize.getHeight();  // 210

    // ── Paleta refinada ───────────────────────────────────────────────
    const EMERALD_DEEP  = [8,  62,  48];    // #083E30
    const EMERALD       = [13, 79,  60];    // #0D4F3C
    const EMERALD_MID   = [18, 105, 78];    // #12694E
    const EMERALD_LIGHT = [34, 150, 110];   // #22966E
    const GOLD          = [207, 170, 55];   // #CFAA37
    const GOLD_SOFT     = [220, 190, 90];   // #DCBE5A
    const CREAM         = [252, 250, 244];  // #FCFAF4
    const WHITE         = [255, 255, 255];
    const CHARCOAL      = [45,  45,  45];

    const splitX = W * 0.44;

    // ── PANEL IZQUIERDO — fondo con gradiente simulado ────────────────
    // Capa base oscura
    doc.setFillColor(...EMERALD_DEEP as [number,number,number]);
    doc.rect(0, 0, splitX, H, "F");

    // Triángulo sutil decorativo inferior
    doc.setFillColor(EMERALD_MID[0], EMERALD_MID[1], EMERALD_MID[2]);
    doc.triangle(0, H * 0.6, splitX * 0.65, H, 0, H, "F");

    // Triángulo superior sutil
    doc.setFillColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.triangle(splitX, 0, splitX, H * 0.35, splitX * 0.4, 0, "F");

    // ── Patrón de puntos decorativos (esquina inferior derecha) ───────
    doc.setFillColor(EMERALD_LIGHT[0], EMERALD_LIGHT[1], EMERALD_LIGHT[2]);
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        const px = splitX - 35 + col * 5.5;
        const py = H - 35 + row * 5.5;
        if (px < splitX - 4) {
          doc.circle(px, py, 0.7, "F");
        }
      }
    }

    // Patrón de puntos superior izquierdo (simetría)
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 3; row++) {
        doc.circle(8 + col * 5.5, 8 + row * 5.5, 0.7, "F");
      }
    }

    // ── PANEL DERECHO — crema elegante ────────────────────────────────
    doc.setFillColor(...CREAM as [number,number,number]);
    doc.rect(splitX, 0, W - splitX, H, "F");

    // ── Franja dorada separadora con efecto ───────────────────────────
    doc.setFillColor(...GOLD as [number,number,number]);
    doc.rect(splitX - 1.5, 0, 3, H, "F");
    // Líneas finas doradas decorativas
    doc.setDrawColor(GOLD_SOFT[0], GOLD_SOFT[1], GOLD_SOFT[2]);
    doc.setLineWidth(0.3);
    doc.line(splitX - 3.5, 0, splitX - 3.5, H);
    doc.line(splitX + 3.5, 0, splitX + 3.5, H);

    // ── LOGO ──────────────────────────────────────────────────────────
    const leftCX = splitX / 2;
    let logoBottomY = 16;

    if (config?.logo_url) {
      try {
        const logoRes = await fetch(config.logo_url);
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const logoBytes  = new Uint8Array(logoBuffer);
          const ct  = logoRes.headers.get("content-type") || "image/png";
          const fmt = ct.includes("png") ? "PNG" : "JPEG";

          const maxLogoW = splitX - 28;
          const maxLogoH = 72;
          const logoW = Math.min(maxLogoW, 95);
          const logoH = Math.min(maxLogoH, logoW * 0.75);
          const logoX = leftCX - logoW / 2;
          const logoY = 14;

          doc.addImage(logoBytes, fmt, logoX, logoY, logoW, logoH);
          logoBottomY = logoY + logoH + 4;
        }
      } catch (_) {}
    }

    // ── Línea dorada decorativa bajo el logo ──────────────────────────
    doc.setDrawColor(...GOLD as [number,number,number]);
    doc.setLineWidth(0.8);
    const lineMargin = 20;
    doc.line(lineMargin, logoBottomY, splitX - lineMargin, logoBottomY);
    // Diamante central en la línea
    const diamondCX = leftCX;
    const diamondCY = logoBottomY;
    doc.setFillColor(...GOLD as [number,number,number]);
    const dSize = 2.5;
    doc.triangle(diamondCX, diamondCY - dSize, diamondCX + dSize, diamondCY, diamondCX, diamondCY + dSize, "F");
    doc.triangle(diamondCX, diamondCY - dSize, diamondCX - dSize, diamondCY, diamondCX, diamondCY + dSize, "F");

    // ── NOMBRE DEL EVENTO ─────────────────────────────────────────────
    const nameY = logoBottomY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...WHITE as [number,number,number]);
    const eventLines = doc.splitTextToSize(eventName.toUpperCase(), splitX - 28);
    doc.text(eventLines, leftCX, nameY, { align: "center" });

    // ── Badge INVITACION OFICIAL ──────────────────────────────────────
    const badgeY = nameY + (eventLines.length * 8) + 5;
    const badgeW = 56, badgeH = 7.5;
    doc.setFillColor(...GOLD as [number,number,number]);
    roundedRect(doc, leftCX - badgeW / 2, badgeY, badgeW, badgeH, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...EMERALD_DEEP as [number,number,number]);
    doc.text("INVITACION OFICIAL", leftCX, badgeY + 5.2, { align: "center" });

    // ── FECHA Y HORA ──────────────────────────────────────────────────
    let infoY = badgeY + badgeH + 12;
    if (eventDate) {
      // Contenedor con borde redondeado
      const dateBoxW = splitX - 32;
      const dateStr = eventDate.charAt(0).toUpperCase() + eventDate.slice(1);
      const dateText = eventTime ? `${dateStr}  |  ${eventTime}` : dateStr;
      const dateLines = doc.splitTextToSize(dateText, dateBoxW - 8);
      const dateBoxH = dateLines.length * 5 + 6;

      doc.setFillColor(EMERALD_MID[0], EMERALD_MID[1], EMERALD_MID[2]);
      roundedRect(doc, leftCX - dateBoxW / 2, infoY - 4, dateBoxW, dateBoxH, 3, "F");

      // Ícono de calendario: pequeño cuadrado
      doc.setFillColor(...GOLD as [number,number,number]);
      const calX = leftCX - dateBoxW / 2 + 5;
      const calY = infoY - 1;
      roundedRect(doc, calX, calY, 4, 4, 1, "F");
      doc.setFillColor(EMERALD_DEEP[0], EMERALD_DEEP[1], EMERALD_DEEP[2]);
      doc.rect(calX + 0.8, calY + 1.2, 2.4, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...WHITE as [number,number,number]);
      doc.text(dateLines, leftCX + 2, infoY + 1, { align: "center" });
      infoY += dateBoxH + 4;
    }

    // ── LUGAR ─────────────────────────────────────────────────────────
    if (eventPlace) {
      const placeBoxW = splitX - 32;
      const placeText = "Lugar: " + eventPlace;
      const placeLines = doc.splitTextToSize(placeText, placeBoxW - 8);
      const placeBoxH = placeLines.length * 5 + 6;

      doc.setFillColor(EMERALD_MID[0], EMERALD_MID[1], EMERALD_MID[2]);
      roundedRect(doc, leftCX - placeBoxW / 2, infoY - 4, placeBoxW, placeBoxH, 3, "F");

      // Ícono de ubicación: círculo + triángulo
      doc.setFillColor(...GOLD as [number,number,number]);
      const pinX = leftCX - placeBoxW / 2 + 7;
      const pinY = infoY;
      doc.circle(pinX, pinY, 2, "F");
      doc.triangle(pinX - 1.2, pinY + 1, pinX + 1.2, pinY + 1, pinX, pinY + 3.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...WHITE as [number,number,number]);
      doc.text(placeLines, leftCX + 2, infoY + 1, { align: "center" });
    }

    // ── Footer panel izquierdo ────────────────────────────────────────
    doc.setDrawColor(...GOLD as [number,number,number]);
    doc.setLineWidth(0.4);
    doc.line(lineMargin, H - 14, splitX - lineMargin, H - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(EMERALD_LIGHT[0], EMERALD_LIGHT[1], EMERALD_LIGHT[2]);
    doc.text("cmgeventos0@gmail.com", leftCX, H - 8, { align: "center" });

    // ══════════════════════════════════════════════════════════════════
    // ── PANEL DERECHO ─────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════

    const rightCX = splitX + (W - splitX) / 2;
    const rightW  = W - splitX;

    // ── Header verde oscuro ───────────────────────────────────────────
    doc.setFillColor(...EMERALD_DEEP as [number,number,number]);
    doc.rect(splitX + 1.5, 0, rightW - 1.5, 16, "F");

    // Línea dorada bajo el header
    doc.setFillColor(...GOLD as [number,number,number]);
    doc.rect(splitX + 1.5, 16, rightW - 1.5, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...GOLD as [number,number,number]);
    doc.text("CONFIRMACION DE ASISTENCIA", rightCX, 10, { align: "center" });

    // ── "Se invita cordialmente a:" ───────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.text("Se invita cordialmente a:", rightCX, 30, { align: "center" });

    // ── NOMBRE DE LA PERSONA ──────────────────────────────────────────
    const fullName = `${reg.nombres} ${reg.apellidos}`;
    doc.setFont("helvetica", "bold");
    let nameFontSize = 26;
    doc.setFontSize(nameFontSize);
    doc.setTextColor(...EMERALD as [number,number,number]);
    let namePersonLines = doc.splitTextToSize(fullName, rightW - 24);
    while (namePersonLines.length > 2 && nameFontSize > 16) {
      nameFontSize -= 2;
      doc.setFontSize(nameFontSize);
      namePersonLines = doc.splitTextToSize(fullName, rightW - 24);
    }
    const personNameY = 46;
    doc.text(namePersonLines, rightCX, personNameY, { align: "center" });

    // Línea dorada decorativa bajo el nombre
    const nameEndY = personNameY + (namePersonLines.length - 1) * (nameFontSize * 0.4) + 5;
    doc.setDrawColor(...GOLD as [number,number,number]);
    doc.setLineWidth(1);
    const lineStart = splitX + 22;
    const lineEnd = W - 22;
    doc.line(lineStart, nameEndY, lineEnd, nameEndY);
    // Diamantes en los extremos de la línea
    doc.setFillColor(...GOLD as [number,number,number]);
    const ds = 1.5;
    // Izquierda
    doc.triangle(lineStart, nameEndY - ds, lineStart + ds, nameEndY, lineStart, nameEndY + ds, "F");
    doc.triangle(lineStart, nameEndY - ds, lineStart - ds, nameEndY, lineStart, nameEndY + ds, "F");
    // Derecha
    doc.triangle(lineEnd, nameEndY - ds, lineEnd + ds, nameEndY, lineEnd, nameEndY + ds, "F");
    doc.triangle(lineEnd, nameEndY - ds, lineEnd - ds, nameEndY, lineEnd, nameEndY + ds, "F");

    // ── QR CENTRADO ───────────────────────────────────────────────────
    const footerH = 14;
    const textBelowQR = 10;
    const spaceTop = nameEndY + 6;
    const spaceBottom = H - footerH - textBelowQR;
    const available = spaceBottom - spaceTop;
    const qrSize = Math.min(58, Math.max(38, available - 8));
    const qrY = spaceTop + (available - qrSize) / 2;
    const qrX = rightCX - qrSize / 2;

    // Marco exterior verde con sombra
    doc.setFillColor(220, 220, 215);
    roundedRect(doc, qrX - 5 + 1.5, qrY - 5 + 1.5, qrSize + 10, qrSize + 10, 4, "F");
    doc.setFillColor(...EMERALD as [number,number,number]);
    roundedRect(doc, qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 4, "F");

    // Marco dorado interior
    doc.setDrawColor(...GOLD as [number,number,number]);
    doc.setLineWidth(0.6);
    roundedRect(doc, qrX - 2.5, qrY - 2.5, qrSize + 5, qrSize + 5, 2.5, "D");

    // Fondo blanco para el QR
    doc.setFillColor(...WHITE as [number,number,number]);
    doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, "F");

    // QR
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Texto bajo QR
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text("Presenta este codigo en la entrada", rightCX, qrY + qrSize + 8, { align: "center" });

    // ── FOOTER PANEL DERECHO ──────────────────────────────────────────
    doc.setFillColor(...EMERALD_DEEP as [number,number,number]);
    doc.rect(splitX + 1.5, H - footerH, rightW - 1.5, footerH, "F");
    // Línea dorada sobre el footer
    doc.setFillColor(...GOLD as [number,number,number]);
    doc.rect(splitX + 1.5, H - footerH, rightW - 1.5, 1, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...GOLD as [number,number,number]);
    doc.text(
      `ID: ${registrationId.slice(0, 8).toUpperCase()}  |  Documento personal e intransferible`,
      rightCX, H - 5, { align: "center" }
    );

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

  } catch (err) {
    console.error("Error generating invitation:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
