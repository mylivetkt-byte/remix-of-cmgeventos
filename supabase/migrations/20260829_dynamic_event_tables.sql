-- Función para crear automáticamente una tabla de registros independiente por cada evento nuevo

CREATE OR REPLACE FUNCTION public.create_event_registration_table(event_slug TEXT)
RETURNS VOID AS $$
DECLARE
  clean_table_name TEXT;
BEGIN
  -- Generar nombre de tabla seguro a partir del slug del evento
  clean_table_name := 'evento_' || regexp_replace(lower(event_slug), '[^a-z0-9_]', '_', 'g') || '_registrations';

  EXECUTE format('
    CREATE TABLE IF NOT EXISTS public.%I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      correo TEXT NOT NULL,
      telefono TEXT NOT NULL,
      numero_documento TEXT NOT NULL,
      tipo_documento_id UUID REFERENCES public.catalog_tipo_documento(id),
      sexo_id UUID REFERENCES public.catalog_sexo(id),
      fecha_nacimiento DATE NOT NULL,
      edad INT NOT NULL,
      direccion TEXT NOT NULL,
      barrio TEXT NOT NULL,
      estado_civil_id UUID REFERENCES public.catalog_estado_civil(id),
      red_id UUID REFERENCES public.catalog_red(id),
      cdp_id UUID REFERENCES public.catalog_cdp(id),
      nombre_invitador TEXT,
      pdf_url TEXT,
      qr_code TEXT,
      asistio BOOLEAN NOT NULL DEFAULT false,
      fecha_asistencia TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read" ON public.%I;
    DROP POLICY IF EXISTS "Public insert" ON public.%I;
    DROP POLICY IF EXISTS "Admin all" ON public.%I;

    CREATE POLICY "Public read" ON public.%I FOR SELECT USING (true);
    CREATE POLICY "Public insert" ON public.%I FOR INSERT WITH CHECK (true);
    CREATE POLICY "Admin all" ON public.%I FOR ALL USING (true);
  ', clean_table_name, clean_table_name, clean_table_name, clean_table_name, clean_table_name, clean_table_name, clean_table_name, clean_table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
