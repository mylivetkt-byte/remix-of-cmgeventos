import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const { registration_id } = await req.json();

      if (!registration_id) {
        return new Response(
          JSON.stringify({ error: "registration_id requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check current state first
      const { data: current } = await supabase
        .from("registrations")
        .select("id, nombres, apellidos, asistio")
        .eq("id", registration_id)
        .maybeSingle();

      if (!current) {
        return new Response(
          JSON.stringify({ error: "Registro no encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (current.asistio) {
        return new Response(
          JSON.stringify({ ...current, already_checked_in: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("registrations")
        .update({ asistio: true, fecha_asistencia: new Date().toISOString() })
        .eq("id", registration_id)
        .select("id, nombres, apellidos, asistio, fecha_asistencia")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ...data, already_checked_in: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET") {
      const { count, error } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("asistio", true);

      if (error) throw error;

      return new Response(
        JSON.stringify({ total_asistentes: count || 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Método no permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
