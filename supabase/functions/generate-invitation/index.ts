import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // QR code — blanco sobre verde oscuro
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 300,
      margin: 2,
      color: { dark: "#004030", light: "#ffffff" },
    });

    // ── PDF horizontal (297 x 210 mm) ─────────────────────────────────
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W   = doc.internal.pageSize.getWidth();  // 297
    const H   = doc.internal.pageSize.getHeight(); // 210

    // ── FONDO VERDE OSCURO ────────────────────────────────────────────
    doc.setFillColor(0, 80, 55);
    doc.rect(0, 0, W, H, "F");

    // ── PANEL DERECHO BLANCO (60% del ancho) ──────────────────────────
    const panelX = W * 0.40;
    const panelW = W - panelX;
    doc.setFillColor(255, 255, 255);
    doc.rect(panelX, 0, panelW, H, "F");

    // ── FRANJA AMARILLA VERTICAL entre panel y fondo ──────────────────
    doc.setFillColor(255, 210, 0);
    doc.rect(panelX - 3, 0, 6, H, "F");

    // ── LADO IZQUIERDO: logo + nombre evento + lugar ──────────────────

    // Logo centrado en panel izquierdo
    let logoBottomY = 20;
    if (config?.logo_url) {
      try {
        const logoRes = await fetch(config.logo_url);
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const logoBytes  = new Uint8Array(logoBuffer);
          const ct  = logoRes.headers.get("content-type") || "image/png";
          const fmt = ct.includes("png") ? "PNG" : "JPEG";
          const logoW = 70, logoH = 55;
          const logoX = (panelX - logoW) / 2;
          doc.addImage(logoBytes, fmt, logoX, 15, logoW, logoH);
          logoBottomY = 15 + logoH + 8;
        }
      } catch (_) {}
    }

    // Línea decorativa amarilla bajo el logo
    doc.setDrawColor(255, 210, 0);
    doc.setLineWidth(1.5);
    doc.line(15, logoBottomY, panelX - 15, logoBottomY);

    // Nombre del evento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    const eventLines = doc.splitTextToSize(eventName.toUpperCase(), panelX - 30);
    doc.text(eventLines, panelX / 2, logoBottomY + 14, { align: "center" });

    // Fecha
    if (eventDate) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(255, 235, 100);
      const dateText = eventDate + (eventTime ? "  ·  " + eventTime : "");
      doc.text(dateText, panelX / 2, logoBottomY + 28, { align: "center" });
    }

    // Lugar
    if (eventPlace) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(200, 255, 220);
      doc.text("📍 " + eventPlace, panelX / 2, logoBottomY + 38, { align: "center" });
    }

    // ── LADO DERECHO: "INVITACIÓN", nombre persona, QR ────────────────
    const rightCenterX = panelX + panelW / 2;

    // Encabezado "INVITACIÓN" con fondo amarillo
    doc.setFillColor(255, 210, 0);
    doc.rect(panelX + 3, 0, panelW - 3, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 60, 40);
    doc.text("I N V I T A C I Ó N", rightCenterX, 14, { align: "center" });

    // Subtítulo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("PERSONAL  ·  INTRANSFERIBLE", rightCenterX, 30, { align: "center" });

    // Línea decorativa
    doc.setDrawColor(0, 80, 55);
    doc.setLineWidth(0.5);
    doc.line(panelX + 20, 34, W - 20, 34);

    // Texto "Se invita cordialmente a"
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Se invita cordialmente a:", rightCenterX, 44, { align: "center" });

    // Nombre de la persona — grande y destacado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 60, 40);
    const fullName = `${reg.nombres} ${reg.apellidos}`;
    const nameLines = doc.splitTextToSize(fullName, panelW - 30);
    doc.text(nameLines, rightCenterX, 58, { align: "center" });

    // Línea decorativa verde bajo el nombre
    doc.setDrawColor(0, 168, 120);
    doc.setLineWidth(1);
    doc.line(panelX + 30, 68, W - 30, 68);

    // QR centrado
    const qrSize = 65;
    const qrX    = rightCenterX - qrSize / 2;
    const qrY    = 74;

    // Sombra suave del QR
    doc.setFillColor(230, 230, 230);
    doc.rect(qrX + 2, qrY + 2, qrSize, qrSize, "F");

    // QR
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Marco verde del QR
    doc.setDrawColor(0, 80, 55);
    doc.setLineWidth(1.5);
    doc.rect(qrX, qrY, qrSize, qrSize);

    // Texto bajo QR
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text("Presenta este código en la entrada", rightCenterX, qrY + qrSize + 7, { align: "center" });

    // ── FOOTER en panel derecho ───────────────────────────────────────
    doc.setFillColor(0, 80, 55);
    doc.rect(panelX + 3, H - 14, panelW - 3, 14, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(200, 255, 220);
    doc.text(
      `ID: ${registrationId.slice(0, 8).toUpperCase()}`,
      rightCenterX, H - 5, { align: "center" }
    );

    // ── Subir PDF ──────────────────────────────────────────────────────
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
