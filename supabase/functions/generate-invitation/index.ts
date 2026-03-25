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

    // Fetch registration with catalog names
    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .select(`
        *,
        catalog_tipo_documento(nombre),
        catalog_estado_civil(nombre),
        catalog_sexo(nombre),
        catalog_cdp(nombre),
        catalog_red(nombre)
      `)
      .eq("id", registrationId)
      .single();

    if (regErr || !reg) {
      return new Response(JSON.stringify({ error: "Registration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch event config
    const { data: config } = await supabase
      .from("event_config")
      .select("*")
      .limit(1)
      .single();

    const eventName = config?.nombre_evento || "Evento";
    const eventDate = config?.fecha_evento
      ? new Date(config.fecha_evento).toLocaleDateString("es-CO", {
          year: "numeric", month: "long", day: "numeric",
        })
      : "";
    const eventPlace = config?.lugar_evento || "";

    // Generate QR code as data URL
    const qrValue = registrationId;
    const qrDataUrl = await QRCode.toDataURL(qrValue, {
      width: 200,
      margin: 1,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });

    // Generate PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header background
    const logoUrl = config?.logo_url || null;
    let headerHeight = 55;
    let contentStartY = 60;

    if (logoUrl) {
      try {
        const logoRes = await fetch(logoUrl);
        if (logoRes.ok) {
          const logoBuffer = await logoRes.arrayBuffer();
          const logoBytes = new Uint8Array(logoBuffer);
          const contentType = logoRes.headers.get("content-type") || "image/png";
          const logoFormat = contentType.includes("png") ? "PNG" : "JPEG";
          
          // Add logo at the top
          const logoH = 25;
          const logoW = 50;
          doc.addImage(logoBytes, logoFormat, pageWidth / 2 - logoW / 2, 5, logoW, logoH);
          headerHeight = 75;
          contentStartY = 80;
          
          doc.setFillColor(26, 26, 46);
          doc.rect(0, 32, pageWidth, headerHeight - 32, "F");
          
          // Event title below logo
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(22);
          doc.setFont("helvetica", "bold");
          doc.text(eventName.toUpperCase(), pageWidth / 2, 47, { align: "center" });

          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          doc.text("INVITACIÓN PERSONAL", pageWidth / 2, 57, { align: "center" });

          if (eventDate || eventPlace) {
            doc.setFontSize(9);
            const subline = [eventDate, eventPlace].filter(Boolean).join(" · ");
            doc.text(subline, pageWidth / 2, 66, { align: "center" });
          }
        } else {
          throw new Error("Logo fetch failed");
        }
      } catch (logoErr) {
        console.error("Could not load logo, using text-only header:", logoErr);
        // Fallback: text-only header
        doc.setFillColor(26, 26, 46);
        doc.rect(0, 0, pageWidth, 55, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(eventName.toUpperCase(), pageWidth / 2, 25, { align: "center" });
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("INVITACIÓN PERSONAL", pageWidth / 2, 35, { align: "center" });
        if (eventDate || eventPlace) {
          doc.setFontSize(9);
          const subline = [eventDate, eventPlace].filter(Boolean).join(" · ");
          doc.text(subline, pageWidth / 2, 45, { align: "center" });
        }
      }
    } else {
      doc.setFillColor(26, 26, 46);
      doc.rect(0, 0, pageWidth, 55, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(eventName.toUpperCase(), pageWidth / 2, 25, { align: "center" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("INVITACIÓN PERSONAL", pageWidth / 2, 35, { align: "center" });
      if (eventDate || eventPlace) {
        doc.setFontSize(9);
        const subline = [eventDate, eventPlace].filter(Boolean).join(" · ");
        doc.text(subline, pageWidth / 2, 45, { align: "center" });
      }
    }

    // Divider line
    doc.setDrawColor(79, 70, 229); // indigo accent
    doc.setLineWidth(0.8);
    doc.line(20, contentStartY, pageWidth - 20, contentStartY);

    // Attendee name
    doc.setTextColor(26, 26, 46);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${reg.nombres} ${reg.apellidos}`, pageWidth / 2, contentStartY + 15, { align: "center" });

    // Details section
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);

    const leftX = 25;
    const rightX = pageWidth / 2 + 10;
    let y = contentStartY + 30;
    const lineH = 8;

    const addField = (label: string, value: string, x: number, yPos: number) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 26, 46);
      doc.text(label, x, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(value || "—", x, yPos + 5);
    };

    // Two-column layout
    addField("Tipo Documento", reg.catalog_tipo_documento?.nombre || "—", leftX, y);
    addField("Nro. Documento", reg.numero_documento, rightX, y);
    y += lineH * 2;

    addField("Teléfono", reg.telefono, leftX, y);
    addField("Correo", reg.correo, rightX, y);
    y += lineH * 2;

    addField("Barrio", reg.barrio, leftX, y);
    addField("Estado Civil", reg.catalog_estado_civil?.nombre || "—", rightX, y);
    y += lineH * 2;

    addField("Sexo", reg.catalog_sexo?.nombre || "—", leftX, y);
    addField("Edad", `${reg.edad} años`, rightX, y);
    y += lineH * 2;

    addField("CDP", reg.catalog_cdp?.nombre || "—", leftX, y);
    addField("RED", reg.catalog_red?.nombre || "—", rightX, y);
    y += lineH * 2;

    if (reg.nombre_invitador) {
      addField("Invitado por", reg.nombre_invitador, leftX, y);
      y += lineH * 2;
    }

    // QR Code section
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Add QR image
    const qrSize = 40;
    doc.addImage(qrDataUrl, "PNG", pageWidth / 2 - qrSize / 2, y, qrSize, qrSize);
    y += qrSize + 5;

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Escanea el código QR para validar tu invitación", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(`ID: ${registrationId}`, pageWidth / 2, y, { align: "center" });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFillColor(26, 26, 46);
    doc.rect(0, footerY - 5, pageWidth, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(
      `Fecha de registro: ${new Date(reg.created_at).toLocaleDateString("es-CO")}`,
      pageWidth / 2, footerY + 3, { align: "center" }
    );

    // Convert to Uint8Array
    const pdfOutput = doc.output("arraybuffer");
    const pdfBytes = new Uint8Array(pdfOutput);

    // Upload to storage
    const fileName = `invitation_${registrationId}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("invitations")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("invitations")
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update registration record
    await supabase
      .from("registrations")
      .update({ pdf_url: pdfUrl, qr_code: qrValue })
      .eq("id", registrationId);

    // Send email via Brevo
    try {
      const emailResponse = await supabase.functions.invoke("send-brevo-email", {
        body: { registrationId },
      });
      if (emailResponse.error) {
        console.error("Error sending email via Brevo:", emailResponse.error);
      } else {
        console.log("Email sent successfully");
      }
    } catch (emailErr) {
      console.error("Failed to trigger email:", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, pdfUrl, qrCode: qrValue }),
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
