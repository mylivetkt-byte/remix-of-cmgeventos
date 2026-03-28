import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Dibuja un rectángulo con esquinas redondeadas
function roundedRect(doc: any, x: number, y: number, w: number, h: number, r: number, style: string) {
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

    // ── QR oscuro sobre blanco ────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 400,
      margin: 1,
      color: { dark: "#0D4F3C", light: "#ffffff" },
    });

    // ── PDF A4 horizontal ─────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();  // 297
    const H = doc.internal.pageSize.getHeight(); // 210

    // Colores verde elegante
    const GREEN_DARK  = [13,  79,  60];   // #0D4F3C
    const GREEN_MID   = [22, 120,  90];   // #16785A
    const GREEN_LIGHT = [39, 174, 128];   // #27AE80
    const GOLD        = [212, 175,  55];  // #D4AF37
    const WHITE       = [255, 255, 255];

    // ── FONDO IZQUIERDO verde oscuro (45% del ancho) ──────────────────
    const splitX = W * 0.46;
    doc.setFillColor(...GREEN_DARK as [number,number,number]);
    doc.rect(0, 0, splitX, H, "F");

    // Decoración: franja diagonal sutil en el verde
    doc.setFillColor(GREEN_MID[0], GREEN_MID[1], GREEN_MID[2]);
    doc.triangle(0, H * 0.55, splitX * 0.7, H, 0, H, "F");

    // Patrón de puntos decorativos (esquina inferior derecha del panel verde)
    doc.setFillColor(GREEN_LIGHT[0], GREEN_LIGHT[1], GREEN_LIGHT[2]);
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 4; row++) {
        const px = splitX - 28 + col * 6;
        const py = H - 30 + row * 7;
        if (px < splitX - 2) {
          doc.circle(px, py, 0.8, "F");
        }
      }
    }

    // ── PANEL DERECHO BLANCO ──────────────────────────────────────────
    doc.setFillColor(...WHITE as [number,number,number]);
    doc.rect(splitX, 0, W - splitX, H, "F");

    // Franja dorada vertical separadora
    doc.setFillColor(...GOLD as [number,number,number]);
    doc.rect(splitX - 2.5, 0, 5, H, "F");

    // ── LOGO (grande, centrado en panel izquierdo) ────────────────────
    const leftCX = splitX / 2;
    let logoBottomY = 18;

    if (config?.logo_url) {
      try {
        const logoRes = await fetch(config.logo_url);
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const logoBytes  = new Uint8Array(logoBuffer);
          const ct  = logoRes.headers.get("content-type") || "image/png";
          const fmt = ct.includes("png") ? "PNG" : "JPEG";

          // Logo más grande: hasta 100mm de ancho, mantener proporción
          const maxLogoW = splitX - 24;
          const maxLogoH = 80;
          const logoW = Math.min(maxLogoW, 100);
          const logoH = Math.min(maxLogoH, logoW * 0.75);
          const logoX = leftCX - logoW / 2;
          const logoY = 12;

          // Sombra suave detrás del logo
          doc.setFillColor(0, 60, 44);
          doc.rect(logoX + 2, logoY + 2, logoW, logoH, "F");

          doc.addImage(logoBytes, fmt, logoX, logoY, logoW, logoH);
          logoBottomY = logoY + logoH + 6;
        }
      } catch (_) {}
    }

    // ── LÍNEA DORADA bajo el logo ─────────────────────────────────────
    doc.setDrawColor(...GOLD as [number,number,number]);
    doc.setLineWidth(1.2);
    doc.line(16, logoBottomY, splitX - 16, logoBottomY);

    // ── NOMBRE DEL EVENTO ─────────────────────────────────────────────
    const nameY = logoBottomY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...WHITE as [number,number,number]);
    const eventLines = doc.splitTextToSize(eventName.toUpperCase(), splitX - 24);
    doc.text(eventLines, leftCX, nameY, { align: "center" });

    // ── ETIQUETA "INVITACIÓN OFICIAL" ─────────────────────────────────
    const badgeY = nameY + (eventLines.length * 9) + 4;
    const badgeW = 52, badgeH = 7;
    roundedRect(doc, leftCX - badgeW / 2, badgeY, badgeW, badgeH, 3, "F");
    // relleno dorado
    doc.setFillColor(...GOLD as [number,number,number]);
    roundedRect(doc, leftCX - badgeW / 2, badgeY, badgeW, badgeH, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GREEN_DARK as [number,number,number]);
    doc.text("✦  INVITACIÓN OFICIAL  ✦", leftCX, badgeY + 5, { align: "center" });

    // ── FECHA ─────────────────────────────────────────────────────────
    let infoY = badgeY + badgeH + 10;
    if (eventDate) {
      // Ícono de calendario (rectángulo decorativo)
      doc.setFillColor(GREEN_LIGHT[0], GREEN_LIGHT[1], GREEN_LIGHT[2]);
      roundedRect(doc, leftCX - 46, infoY - 4.5, 92, 8, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...WHITE as [number,number,number]);
      const dateStr = eventDate.charAt(0).toUpperCase() + eventDate.slice(1);
      const dateText = eventTime ? `${dateStr}  ·  ${eventTime}` : dateStr;
      const dateLines = doc.splitTextToSize(dateText, splitX - 28);
      doc.text(dateLines, leftCX, infoY, { align: "center" });
      infoY += dateLines.length * 6 + 5;
    }

    // ── LUGAR ─────────────────────────────────────────────────────────
    if (eventPlace) {
      doc.setFillColor(GREEN_LIGHT[0], GREEN_LIGHT[1], GREEN_LIGHT[2]);
      roundedRect(doc, leftCX - 46, infoY - 4.5, 92, 8, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...WHITE as [number,number,number]);
      const placeLines = doc.splitTextToSize("📍 " + eventPlace, splitX - 28);
      doc.text(placeLines, leftCX, infoY, { align: "center" });
    }

    // ── PANEL DERECHO: Solo nombre + QR ──────────────────────────────
    const rightCX = splitX + (W - splitX) / 2;
    const rightW  = W - splitX;

    // Encabezado verde en panel blanco
    doc.setFillColor(...GREEN_DARK as [number,number,number]);
    doc.rect(splitX + 2.5, 0, rightW - 2.5, 18, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...GOLD as [number,number,number]);
    doc.text("C O N F I R M A C I Ó N   D E   A S I S T E N C I A", rightCX, 11, { align: "center" });

    // Texto "Se invita a:" pequeño y gris
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 140);
    doc.text("Se invita cordialmente a:", rightCX, 28, { align: "center" });

    // ── NOMBRE DE LA PERSONA (grande, protagonista) ───────────────────
    const fullName = `${reg.nombres} ${reg.apellidos}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...GREEN_DARK as [number,number,number]);
    const namePersonLines = doc.splitTextToSize(fullName, rightW - 20);
    // Ajustar tamaño si el nombre es muy largo
    let nameFontSize = 24;
    while (namePersonLines.length > 2 && nameFontSize > 14) {
      nameFontSize -= 2;
      doc.setFontSize(nameFontSize);
    }
    doc.text(namePersonLines, rightCX, 44, { align: "center" });

    // Línea dorada bajo el nombre
    const nameEndY = 44 + (namePersonLines.length - 1) * (nameFontSize * 0.4) + 6;
    doc.setDrawColor(...GOLD as [number,number,number]);
    doc.setLineWidth(1.5);
    doc.line(splitX + 18, nameEndY, W - 18, nameEndY);

    // ── QR CENTRADO verticalmente entre nombre y footer ──────────────
    const footerH   = 12;
    const textBelowH = 8;
    const spaceTop = nameEndY + 4;
    const spaceBottom = H - footerH - textBelowH;
    const available = spaceBottom - spaceTop;
    const qrSize    = Math.min(60, Math.max(40, available - 10));
    const qrY       = spaceTop + (available - qrSize) / 2;
    const qrX       = rightCX - qrSize / 2;

    // Marco verde elegante alrededor del QR
    doc.setFillColor(...GREEN_DARK as [number,number,number]);
    roundedRect(doc, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 4, "F");

    // Marco dorado fino interior
    doc.setDrawColor(...GOLD as [number,number,number]);
    doc.setLineWidth(0.8);
    roundedRect(doc, qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 3, "D");

    // QR
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Texto bajo QR
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text("Presenta este código en la entrada", rightCX, qrY + qrSize + 6, { align: "center" });

    // ── FOOTER PANEL DERECHO ──────────────────────────────────────────
    doc.setFillColor(...GREEN_DARK as [number,number,number]);
    doc.rect(splitX + 2.5, H - 12, rightW - 2.5, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GOLD as [number,number,number]);
    doc.text(
      `ID: ${registrationId.slice(0, 8).toUpperCase()}  ·  Documento personal e intransferible`,
      rightCX, H - 4.5, { align: "center" }
    );

    // ── FOOTER PANEL IZQUIERDO ────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(GREEN_LIGHT[0], GREEN_LIGHT[1], GREEN_LIGHT[2]);
    doc.text("cmgeventos0@gmail.com", leftCX, H - 4.5, { align: "center" });

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

    // WhatsApp se envía desde el frontend para evitar restricciones de red

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
