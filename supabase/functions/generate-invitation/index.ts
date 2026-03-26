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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .select("*, catalog_tipo_documento(nombre), catalog_cdp(nombre), catalog_red(nombre)")
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

    // QR code
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 300,
      margin: 1,
      color: { dark: "#1a3a2a", light: "#ffffff" },
    });

    // ── PDF (A4 portrait) ──────────────────────────────────────────────
    const doc      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W        = doc.internal.pageSize.getWidth();   // 210
    const H        = doc.internal.pageSize.getHeight();  // 297

    // ── 1. Fondo blanco total ─────────────────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");

    // ── 2. Franja verde superior ──────────────────────────────────────
    const headerH = 70;
    doc.setFillColor(0, 168, 120);   // verde CMG
    doc.rect(0, 0, W, headerH, "F");

    // ── 3. Logo centrado en franja verde ─────────────────────────────
    let logoBottomY = 10;
    if (config?.logo_url) {
      try {
        const logoRes = await fetch(config.logo_url);
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const logoBytes  = new Uint8Array(logoBuffer);
          const ct         = logoRes.headers.get("content-type") || "image/png";
          const fmt        = ct.includes("png") ? "PNG" : "JPEG";
          const logoW = 55, logoH = 45;
          doc.addImage(logoBytes, fmt, W / 2 - logoW / 2, 8, logoW, logoH);
          logoBottomY = 8 + logoH;
        }
      } catch (_) { /* sin logo */ }
    }

    // ── 4. Nombre del evento debajo del logo ──────────────────────────
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(eventName.toUpperCase(), W / 2, logoBottomY + 8, { align: "center" });

    // ── 5. Franja decorativa amarilla delgada ─────────────────────────
    doc.setFillColor(255, 220, 0);
    doc.rect(0, headerH, W, 4, "F");

    // ── 6. Etiqueta "INVITACIÓN PERSONAL" ────────────────────────────
    doc.setFillColor(245, 245, 245);
    doc.rect(0, headerH + 4, W, 14, "F");
    doc.setTextColor(0, 140, 100);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("✦  INVITACIÓN PERSONAL  ✦", W / 2, headerH + 14, { align: "center" });

    // ── 7. Nombre del asistente ───────────────────────────────────────
    const nameY = headerH + 36;
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(`${reg.nombres} ${reg.apellidos}`, W / 2, nameY, { align: "center" });

    // línea decorativa bajo el nombre
    doc.setDrawColor(0, 168, 120);
    doc.setLineWidth(0.8);
    doc.line(30, nameY + 4, W - 30, nameY + 4);

    // ── 8. Datos del evento ───────────────────────────────────────────
    let infoY = nameY + 18;

    const drawInfoRow = (icon: string, label: string, value: string, y: number) => {
      // ícono/label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 140, 100);
      doc.text(`${icon} ${label}`, 25, y);
      // valor
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(value, 25, y + 6);
    };

    if (eventDate) {
      drawInfoRow("📅", "FECHA", eventDate + (eventTime ? `  ·  ${eventTime}` : ""), infoY);
      infoY += 18;
    }

    if (eventPlace) {
      drawInfoRow("📍", "LUGAR", eventPlace, infoY);
      infoY += 18;
    }

    // separador
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(25, infoY, W - 25, infoY);
    infoY += 8;

    // ── 9. QR grande centrado ─────────────────────────────────────────
    const qrSize = 70;
    const qrX    = W / 2 - qrSize / 2;
    doc.addImage(qrDataUrl, "PNG", qrX, infoY, qrSize, qrSize);

    // marco verde alrededor del QR
    doc.setDrawColor(0, 168, 120);
    doc.setLineWidth(1);
    doc.rect(qrX - 2, infoY - 2, qrSize + 4, qrSize + 4);

    const qrBottomY = infoY + qrSize + 6;

    // texto bajo el QR
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("Escanea este código en la entrada del evento", W / 2, qrBottomY, { align: "center" });

    // ── 10. Footer verde ──────────────────────────────────────────────
    const footerY = H - 20;
    doc.setFillColor(0, 168, 120);
    doc.rect(0, footerY, W, 20, "F");

    doc.setFillColor(255, 220, 0);
    doc.rect(0, footerY, W, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Registro: ${new Date(reg.created_at).toLocaleDateString("es-CO")}   ·   ID: ${registrationId.slice(0, 8).toUpperCase()}`,
      W / 2, footerY + 12, { align: "center" }
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

    // Enviar email
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
