import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY is not configured");
    }

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

    // Fetch registration
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

    // Fetch event config
    const { data: config } = await supabase
      .from("event_config")
      .select("*")
      .limit(1)
      .single();

    const eventName = config?.nombre_evento || "Evento";
    const emailSubject = config?.asunto_correo || "Tu invitación al evento";
    const emailMessage = config?.mensaje_correo || "Te invitamos a nuestro evento especial.";
    const eventDate = config?.fecha_evento
      ? new Date(config.fecha_evento).toLocaleDateString("es-CO", {
          year: "numeric", month: "long", day: "numeric",
        })
      : "";
    const eventPlace = config?.lugar_evento || "";

    // Build download URL
    const projectId = Deno.env.get("SUPABASE_URL")!.match(/\/\/([^.]+)/)?.[1] || "";
    // Use the app's public URL for the download link
    const downloadUrl = reg.pdf_url || `https://id-preview--4d25c4e0-21df-421d-8790-b42f08873fdd.lovable.app/descargar/${registrationId}`;

    // Build HTML email
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1a1a2e;padding:30px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">${eventName.toUpperCase()}</h1>
            <p style="color:#a5b4fc;margin:8px 0 0;font-size:14px;">INVITACIÓN PERSONAL</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:30px 40px;">
            <h2 style="color:#1a1a2e;margin:0 0 15px;font-size:20px;">¡Hola ${reg.nombres}!</h2>
            <p style="color:#555;line-height:1.6;margin:0 0 20px;">${emailMessage}</p>
            ${eventDate || eventPlace ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:6px;margin-bottom:20px;">
              <tr><td style="padding:15px 20px;">
                ${eventDate ? `<p style="color:#333;margin:0 0 5px;"><strong>📅 Fecha:</strong> ${eventDate}</p>` : ""}
                ${eventPlace ? `<p style="color:#333;margin:0;"><strong>📍 Lugar:</strong> ${eventPlace}</p>` : ""}
              </td></tr>
            </table>
            ` : ""}
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:10px 0 25px;">
                <a href="${downloadUrl}" target="_blank"
                   style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold;">
                  📄 Descargar Invitación PDF
                </a>
              </td></tr>
            </table>
            <p style="color:#888;font-size:13px;text-align:center;margin:0;">
              Si el botón no funciona, copia este enlace:<br>
              <a href="${downloadUrl}" style="color:#4f46e5;">${downloadUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#1a1a2e;padding:20px 40px;text-align:center;">
            <p style="color:#a5b4fc;margin:0;font-size:12px;">Este correo fue enviado automáticamente. No responder.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send via Brevo API
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: eventName,
          email: config?.correo_remitente || "noreply@tudominio.com",
        },
        to: [{ email: reg.correo, name: `${reg.nombres} ${reg.apellidos}` }],
        subject: emailSubject,
        htmlContent,
      }),
    });

    const brevoData = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error("Brevo API error:", brevoData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: brevoData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully via Brevo:", brevoData);

    return new Response(
      JSON.stringify({ success: true, messageId: brevoData.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error sending email:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
