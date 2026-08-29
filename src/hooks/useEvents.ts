import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventItem, EventFieldConfig } from "@/integrations/supabase/event-types";

export function useEvents(onlyActive = true) {
  return useQuery({
    queryKey: ["events", onlyActive],
    queryFn: async () => {
      let query = supabase.from("events").select("*").order("created_at", { ascending: false });
      if (onlyActive) {
        query = query.eq("activo", true);
      }
      const { data, error } = await query;
      if (error) {
        // Fallback to event_config if events table doesn't exist yet
        const fallback = await supabase.from("event_config").select("*");
        if (!fallback.error && fallback.data) {
          return fallback.data.map((item: any) => ({
            id: item.id,
            slug: "evento-principal",
            nombre: item.nombre_evento || "Evento Principal",
            descripcion: item.descripcion,
            fecha_evento: item.fecha_evento,
            lugar_evento: item.lugar_evento,
            logo_url: item.logo_url,
            activo: true,
            requiere_checkin: true,
            color_primario: "#083E30",
            color_secundario: "#CFAA37",
            asunto_correo: item.asunto_correo,
            mensaje_correo: item.mensaje_correo,
            mensaje_whatsapp: item.mensaje_whatsapp,
            correo_remitente: item.correo_remitente,
            barrio_como_combo: item.barrio_como_combo,
            invitado_obligatorio: item.invitado_obligatorio,
          })) as EventItem[];
        }
        throw error;
      }
      return data as EventItem[];
    },
  });
}

export function useEventBySlug(slug?: string) {
  return useQuery({
    queryKey: ["event", slug],
    enabled: !!slug,
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.warn("Could not query events table by slug:", error);
      }

      if (data) return data as EventItem;

      // Fallback: If no event by slug, try getting single event_config
      const { data: cfg } = await supabase.from("event_config").select("*").limit(1).single();
      if (cfg) {
        return {
          id: cfg.id,
          slug: slug || "evento-principal",
          nombre: cfg.nombre_evento || "Evento Principal",
          descripcion: cfg.descripcion,
          fecha_evento: cfg.fecha_evento,
          lugar_evento: cfg.lugar_evento,
          logo_url: cfg.logo_url,
          activo: true,
          requiere_checkin: true,
          color_primario: "#083E30",
          color_secundario: "#CFAA37",
          asunto_correo: cfg.asunto_correo,
          mensaje_correo: cfg.mensaje_correo,
          mensaje_whatsapp: cfg.mensaje_whatsapp,
          correo_remitente: cfg.correo_remitente,
          barrio_como_combo: cfg.barrio_como_combo,
          invitado_obligatorio: cfg.invitado_obligatorio,
        } as EventItem;
      }

      return null;
    },
  });
}

export function useEventFields(eventId?: string) {
  return useQuery({
    queryKey: ["event_fields", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("event_field_configs")
        .select("*")
        .eq("event_id", eventId)
        .order("orden");

      if (error) {
        console.warn("Could not load event_field_configs, using default fields:", error);
        return [];
      }
      return data as EventFieldConfig[];
    },
  });
}
