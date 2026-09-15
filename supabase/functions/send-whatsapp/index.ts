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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const { registrationId } = await req.json();
    if (!registrationId) {
      return new Response(JSON.stringify({ error: "registrationId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener credenciales del servidor WhatsApp
    const [{ data: urlData }, { data: tokenData }] = await Promise.all([
      supabase.from("app_secrets").select("value").eq("key", "WA_SERVER_URL").maybeSingle(),
      supabase.from("app_secrets").select("value").eq("key", "WA_API_TOKEN").maybeSingle(),
    ]);

    const waUrl   = urlData?.value;
    const waToken = tokenData?.value;

    if (!waUrl || !waToken) {
      return new Response(JSON.stringify({ error: "Servidor WhatsApp no configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener registro
    const { data: reg, error: regErr } = await supabase
      .from("registrations").select("*").eq("id", registrationId).single();

    if (regErr || !reg) {
      return new Response(JSON.stringify({ error: "Registro no encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reg.telefono) {
      return new Response(JSON.stringify({ error: "El registro no tiene teléfono" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener mensaje de WhatsApp específico del evento
    let waMsg = "";
    let eventName = "Evento";
    let eventPlace = "";
    let eventDate = "";
    let eventTime = "";

    if (reg.event_id) {
      const { data: evt } = await supabase
        .from("events")
        .select("mensaje_whatsapp, nombre, fecha_evento, lugar_evento")
        .eq("id", reg.event_id)
        .maybeSingle();

      if (evt) {
        if (evt.mensaje_whatsapp) waMsg = evt.mensaje_whatsapp;
        if (evt.nombre) eventName = evt.nombre;
        if (evt.lugar_evento) eventPlace = evt.lugar_evento;
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
    } else {
      const { data: config } = await supabase
        .from("event_config").select("mensaje_whatsapp, nombre_evento, fecha_evento, lugar_evento").limit(1).maybeSingle();

      if (config?.mensaje_whatsapp) waMsg = config.mensaje_whatsapp;
      if (config?.nombre_evento) eventName = config.nombre_evento;
      if (config?.lugar_evento) eventPlace = config.lugar_evento;
      if (config?.fecha_evento) {
        const d = new Date(config.fecha_evento);
        eventDate = d.toLocaleDateString("es-CO", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        });
        eventTime = d.toLocaleTimeString("es-CO", {
          hour: "2-digit", minute: "2-digit",
        });
      }
    }

    // Construir URL de descarga
    const appUrl = Deno.env.get("APP_URL") || "https://cmgeventos.lovable.app";
    const downloadUrl = reg.pdf_url || `${appUrl}/descargar/${registrationId}`;

    let message = "";
    if (waMsg && waMsg.trim() !== "") {
      let template = waMsg
        .replace(/{nombres}/gi, reg.nombres || "")
        .replace(/{nombre}/gi, reg.nombres || "")
        .replace(/{apellidos}/gi, reg.apellidos || "")
        .replace(/{evento}/gi, eventName)
        .replace(/{nombre_evento}/gi, eventName)
        .replace(/{fecha}/gi, eventDate ? `${eventDate}${eventTime ? " · " + eventTime : ""}` : "")
        .replace(/{hora}/gi, eventTime || "")
        .replace(/{lugar}/gi, eventPlace || "")
        .replace(/{documento}/gi, reg.numero_documento || "")
        .replace(/{numero_documento}/gi, reg.numero_documento || "")
        .replace(/{cedula}/gi, reg.numero_documento || "");

      if (/{enlace}|{link}|{url}/i.test(template)) {
        message = template
          .replace(/{enlace}/gi, downloadUrl)
          .replace(/{link}/gi, downloadUrl)
          .replace(/{url}/gi, downloadUrl);
      } else {
        message = `${template.trim()}\n\n📄 *Descarga tu invitación a ${eventName} aquí:*\n${downloadUrl}`;
      }
    } else {
      const lines = [
        `🎉 *${eventName.toUpperCase()}*`,
        ``,
        `Hola *${reg.nombres} ${reg.apellidos || ""}*`.trim() + `,`,
        `¡Tu invitación está lista! 🎊`,
        ``,
      ];
      if (eventDate)  lines.push(`📅 *Fecha:* ${eventDate}${eventTime ? " · " + eventTime : ""}`);
      if (eventPlace) lines.push(`📍 *Lugar:* ${eventPlace}`);
      lines.push(``, `📄 *Descarga tu invitación:*`, downloadUrl);
      message = lines.join("\n");
    }

    // Enviar al servidor WhatsApp
    const res = await fetch(`${waUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${waToken}`,
      },
      body: JSON.stringify({ phone: reg.telefono, message }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Error WhatsApp:", result);
      return new Response(JSON.stringify({ error: result.error || "Error enviando WhatsApp" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ WhatsApp enviado a:", reg.telefono, "evento:", eventName);
    return new Response(JSON.stringify({ success: true, to: result.to }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
