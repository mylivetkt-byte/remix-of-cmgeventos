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
    const { registrationId } = await req.json();
    if (!registrationId) {
      return new Response(JSON.stringify({ error: "registrationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY no configurada en Supabase Secrets");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Obtener registro
    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (regErr || !reg) {
      return new Response(JSON.stringify({ error: "Registro no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener configuración del evento
    const { data: config } = await supabase
      .from("event_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    const eventName    = config?.nombre_evento   || "Evento";
    const emailSubject = config?.asunto_correo   || `Tu invitación a ${eventName}`;
    const emailMessage = config?.mensaje_correo  || "Te invitamos a nuestro evento especial.";
    const eventPlace   = config?.lugar_evento    || "";
    const senderEmail  = config?.correo_remitente || "onboarding@resend.dev";

    const eventDate = config?.fecha_evento
      ? new Date(config.fecha_evento).toLocaleDateString("es-CO", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })
      : "";
    const eventTime = config?.fecha_evento
      ? new Date(config.fecha_evento).toLocaleTimeString("es-CO", {
          hour: "2-digit", minute: "2-digit",
        })
      : "";

    const appUrl      = Deno.env.get("APP_URL") || "https://cmgeventos.lovable.app";
    const downloadUrl = reg.pdf_url || `${appUrl}/descargar/${registrationId}`;

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0faf5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0faf5;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:#005537;padding:30px 40px;text-align:center;">
            ${config?.logo_url ? `<img src="${config.logo_url}" alt="${eventName}" style="max-height:80px;max-width:200px;margin-bottom:15px;display:block;margin-left:auto;margin-right:auto;">` : ""}
            <h1 style="color:#ffffff;margin:0;font-size:26px;letter-spacing:2px;">${eventName.toUpperCase()}</h1>
            <div style="width:60px;height:3px;background-color:#ffd200;margin:12px auto 0;"></div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffd200;padding:10px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;font-weight:bold;color:#005537;letter-spacing:3px;">INVITACIÓN PERSONAL</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:35px 40px;">
            <h2 style="color:#005537;margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">¡Hola!</h2>
            <h3 style="color:#1a1a1a;margin:0 0 20px;font-size:22px;">${reg.nombres} ${reg.apellidos}</h3>
            <p style="color:#555;line-height:1.7;margin:0 0 25px;font-size:15px;">${emailMessage}</p>
            ${eventDate || eventPlace ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0faf5;border-left:4px solid #005537;border-radius:4px;margin-bottom:25px;">
              <tr><td style="padding:15px 20px;">
                ${eventDate ? `<p style="color:#333;margin:0 0 6px;font-size:14px;"><strong style="color:#005537;">📅 Fecha:</strong> ${eventDate}${eventTime ? " · " + eventTime : ""}</p>` : ""}
                ${eventPlace ? `<p style="color:#333;margin:0;font-size:14px;"><strong style="color:#005537;">📍 Lugar:</strong> ${eventPlace}</p>` : ""}
              </td></tr>
            </table>` : ""}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:10px 0 25px;">
                <a href="${downloadUrl}" style="display:inline-block;background-color:#005537;color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:6px;font-size:16px;font-weight:bold;">
                  📄 Descargar mi Invitación
                </a>
              </td></tr>
            </table>
            <p style="color:#999;font-size:12px;text-align:center;margin:0;">
              Si el botón no funciona copia este enlace:<br>
              <a href="${downloadUrl}" style="color:#005537;">${downloadUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#005537;padding:20px 40px;text-align:center;">
            <p style="color:#a0d4bc;margin:0;font-size:12px;">Correo enviado automáticamente · No responder</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Enviar via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${eventName} <${senderEmail}>`,
        to: [reg.correo],
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", JSON.stringify(result));
      throw new Error(`Resend: ${result.message || JSON.stringify(result)}`);
    }

    console.log("✅ Email enviado a:", reg.correo, "id:", result.id);
    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
