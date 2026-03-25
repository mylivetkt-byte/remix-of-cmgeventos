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
