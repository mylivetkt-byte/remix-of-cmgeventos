import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditorioConfig {
  id: string;
  activo: boolean;
  titulo: string;
  subtitulo: string | null;
  descripcion: string | null;
  precio: number | null;
  moneda: string;
  mostrar_precio: boolean;
  texto_tarifas: string | null;
  condiciones: string | null;
  capacidad: string | null;
  direccion: string | null;
  telefono_contacto: string | null;
  correo_contacto: string | null;
  fotos: string[];
}

export function useAuditorioConfig() {
  return useQuery({
    queryKey: ["auditorio_config"],
    queryFn: async (): Promise<AuditorioConfig | null> => {
      const { data, error } = await supabase
        .from("auditorio_config")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("No se pudo cargar la configuración del auditorio:", error.message);
        return null;
      }
      if (!data) return null;

      return {
        ...data,
        fotos: Array.isArray(data.fotos) ? (data.fotos as unknown as string[]) : [],
      } as AuditorioConfig;
    },
  });
}

export function formatPrecio(precio?: number | null, moneda?: string | null) {
  if (precio == null) return null;
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: moneda || "COP",
      maximumFractionDigits: 0,
    }).format(precio);
  } catch {
    return `${precio}`;
  }
}
