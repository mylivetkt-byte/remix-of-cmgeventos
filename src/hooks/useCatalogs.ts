import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type CatalogTable = "catalog_tipo_documento" | "catalog_estado_civil" | "catalog_sexo" | "catalog_cdp" | "catalog_red" | "catalog_barrio";

export function useCatalog(table: CatalogTable) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return data;
    },
  });
}

export interface CdpWithRed {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
  red_id: string | null;
}

export function useCdpWithRed() {
  return useQuery({
    queryKey: ["catalog_cdp_with_red"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_cdp")
        .select("id, nombre, activo, orden, red_id")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return data as CdpWithRed[];
    },
  });
}

export function useEventConfig() {
  return useQuery({
    queryKey: ["event_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
