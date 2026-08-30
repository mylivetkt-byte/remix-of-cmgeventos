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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    let brevoApiKey = Deno.env.get("BREVO_API_KEY") || "";
    const { data: secretRow } = await supabase
      .from("app_secrets")
      .select("value")
      .eq("key", "BREVO_API_KEY")
      .maybeSingle();
    if (secretRow?.value) brevoApiKey = secretRow.value;

    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY no configurada");
    }

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

    let eventName    = "Evento";
    let emailSubject = "Tu invitación al evento";
    let emailMessage = "Te invitamos a nuestro evento especial.";
    let eventPlace   = "";
    let senderEmail  = "cmgeventos0@gmail.com";
    let logoUrl: string | null = null;
    let eventDate    = "";
    let eventTime    = "";

    if (reg.event_id) {
      const { data: evt } = await supabase
        .from("events")
        .select("*")
        .eq("id", reg.event_id)
        .maybeSingle();

      if (evt) {
        eventName    = evt.nombre || "Evento";
        emailSubject = evt.asunto_correo || `Tu invitación a ${eventName}`;
        emailMessage = evt.mensaje_correo || "Te invitamos a nuestro evento especial.";
        eventPlace   = evt.lugar_evento || "";
        senderEmail  = evt.correo_remitente || "cmgeventos0@gmail.com";
        logoUrl      = evt.logo_url || null;

        if (evt.fecha_evento) {
          const d = new Date(evt.fecha_evento);
          eventDate = d.toLocaleDateString("es-CO", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          eventTime = d.toLocaleTimeString("es-CO", {
            hour: "2-digit", minute: "2-digit",
          });
        }
      }
    }

    if (!reg.event_id) {
      const { data: config } = await supabase
        .from("event_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (config) {
        eventName    = config.nombre_evento   || "Evento";
        emailSubject = config.asunto_correo   || `Tu invitación a ${eventName}`;
        emailMessage = config.mensaje_correo  || "Te invitamos a nuestro evento especial.";
        eventPlace   = config.lugar_evento    || "";
        senderEmail  = config.correo_remitente || "cmgeventos0@gmail.com";
        logoUrl      = config.logo_url || null;
        if (config.fecha_evento) {
          const d = new Date(config.fecha_evento);
          eventDate = d.toLocaleDateString("es-CO", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          eventTime = d.toLocaleTimeString("es-CO", {
            hour: "2-digit", minute: "2-digit",
          });
        }
      }
    }

    const appUrl      = Deno.env.get("APP_URL") || "https://cmgeventos.lovable.app";
    const downloadUrl = reg.pdf_url || `${appUrl}/descargar/${registrationId}`;

    // ── HTML Blanco Elegante con Acentos Verdes y Dorados ────────────
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${emailSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f4;font-family:'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f4;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(8,62,48,0.12);">

      <!-- HEADER VERDE CLARO ELEGANTE -->
      <tr>
        <td style="background:linear-gradient(135deg,#083E30 0%,#0D5E45 60%,#126649 100%);padding:44px 40px 36px;text-align:center;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${eventName}" style="max-height:90px;max-width:220px;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;border-radius:10px;background:#ffffff;padding:8px;">` : ""}
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:100px;padding:5px 20px;margin-bottom:16px;">
            <span style="color:#ffffff;font-size:10px;font-weight:700;letter-spacing:3px;">✦ INVITACIÓN OFICIAL ✦</span>
          </div>
          <h1 style="color:#ffffff;margin:0 0 8px;font-size:28px;font-weight:800;letter-spacing:1px;line-height:1.2;">${eventName.toUpperCase()}</h1>
          <div style="width:70px;height:3px;background:linear-gradient(90deg,rgba(255,255,255,0.3),#ffffff,rgba(255,255,255,0.3));margin:10px auto;border-radius:2px;"></div>
          <p style="color:rgba(255,255,255,0.75);margin:0;font-size:13px;letter-spacing:1px;">Centro Mundial de Gloria</p>
        </td>
      </tr>

      <!-- FRANJA DORADA -->
      <tr>
        <td style="background:linear-gradient(90deg,#b8922e,#CFAA37,#e8c84a,#CFAA37,#b8922e);padding:10px 40px;text-align:center;">
          <p style="margin:0;font-size:10px;font-weight:800;color:#ffffff;letter-spacing:4px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">CONFIRMACIÓN PERSONAL DE ASISTENCIA</p>
        </td>
      </tr>

      <!-- CUERPO BLANCO -->
      <tr>
        <td style="background:#ffffff;padding:40px 44px;">
          <p style="color:#888;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Estimado(a)</p>
          <h2 style="color:#083E30;margin:0 0 6px;font-size:26px;font-weight:800;">${reg.nombres} ${reg.apellidos}</h2>
          <div style="height:2px;width:60px;background:#CFAA37;margin-bottom:22px;border-radius:2px;"></div>

          <p style="color:#444;line-height:1.85;margin:0 0 28px;font-size:15px;">${emailMessage}</p>

          ${eventDate || eventPlace ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6fbf8;border:1px solid #d4ece3;border-left:4px solid #083E30;border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:18px 22px;">
              <p style="color:#083E30;font-weight:800;margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">DETALLES DEL EVENTO</p>
              ${eventDate ? `<p style="color:#222;margin:0 0 8px;font-size:14px;"><strong style="color:#083E30;">📅 Fecha:</strong>&nbsp; ${eventDate}${eventTime ? " · " + eventTime : ""}</p>` : ""}
              ${eventPlace ? `<p style="color:#222;margin:0;font-size:14px;"><strong style="color:#083E30;">📍 Lugar:</strong>&nbsp; ${eventPlace}</p>` : ""}
            </td></tr>
          </table>` : ""}

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:6px 0 28px;">
              <a href="${downloadUrl}" style="display:inline-block;background:linear-gradient(135deg,#083E30,#0D5E45);color:#ffffff;text-decoration:none;padding:16px 52px;border-radius:100px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 6px 20px rgba(8,62,48,0.25);">
                📄 &nbsp;Descargar mi Invitación PDF
              </a>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6ee;border:1px solid #e8d88a;border-radius:12px;">
            <tr><td style="padding:14px 20px;text-align:center;">
              <p style="color:#888;margin:0;font-size:10px;letter-spacing:1px;text-transform:uppercase;">Código de registro</p>
              <p style="color:#9a7a20;margin:5px 0 0;font-size:13px;font-weight:700;letter-spacing:3px;font-family:monospace;">${registrationId.slice(0,8).toUpperCase()}</p>
            </td></tr>
          </table>

          <p style="color:#aaa;font-size:11px;text-align:center;margin:20px 0 0;line-height:1.65;">
            Si el botón no funciona, copia este enlace:<br>
            <a href="${downloadUrl}" style="color:#083E30;word-break:break-all;">${downloadUrl}</a>
          </p>
        </td>
      </tr>

      <!-- FOOTER VERDE OSCURO -->
      <tr>
        <td style="background:linear-gradient(135deg,#083E30,#0D5E45);padding:22px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Centro Mundial de Gloria</p>
          <p style="color:rgba(255,255,255,0.4);margin:0;font-size:11px;">Correo enviado automáticamente · No responder directamente</p>
          <div style="width:40px;height:2px;background:rgba(207,170,55,0.5);margin:14px auto 0;border-radius:2px;"></div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: eventName, email: senderEmail },
        to: [{ email: reg.correo, name: `${reg.nombres} ${reg.apellidos}` }],
        subject: emailSubject,
        htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Brevo API error:", JSON.stringify(result));
      throw new Error(`Brevo: ${result.message || JSON.stringify(result)}`);
    }

    console.log("✅ Email enviado a:", reg.correo, "evento:", eventName);
    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error enviando correo:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
