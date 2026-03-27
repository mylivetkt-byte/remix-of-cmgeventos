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

    // Obtener mensaje configurado
    const { data: config } = await supabase
      .from("event_config").select("mensaje_whatsapp, nombre_evento").limit(1).single();

    const waMsg = config?.mensaje_whatsapp;
    if (!waMsg) {
      return new Response(JSON.stringify({ error: "Mensaje de WhatsApp no configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construir URL de descarga
    const appUrl = Deno.env.get("APP_URL") || "https://id-preview--4d25c4e0-21df-421d-8790-b42f08873fdd.lovable.app";
    const downloadUrl = reg.pdf_url || `${appUrl}/descargar/${registrationId}`;
    const message = `${waMsg}\n\n📄 Descarga tu invitación aquí:\n${downloadUrl}`;

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

    console.log("✅ WhatsApp enviado a:", reg.telefono);
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
