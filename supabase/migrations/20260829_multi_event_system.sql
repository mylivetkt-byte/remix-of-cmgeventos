-- Script de migración multi-evento e idóneo para Supabase

-- 1. Crear o asegurar la tabla 'events' (si existía event_config, nos aseguramos de crear events)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_evento TIMESTAMPTZ,
  lugar_evento TEXT,
  logo_url TEXT,
  banner_url TEXT,
  color_primario TEXT DEFAULT '#083E30',
  color_secundario TEXT DEFAULT '#CFAA37',
  activo BOOLEAN NOT NULL DEFAULT true,
  requiere_checkin BOOLEAN NOT NULL DEFAULT true,
  asunto_correo TEXT DEFAULT 'Tu invitación al evento',
  mensaje_correo TEXT DEFAULT 'Te invitamos a nuestro evento especial.',
  mensaje_whatsapp TEXT DEFAULT 'Hola, aquí está mi invitación al evento. Puedes descargarla desde este enlace:',
  correo_remitente TEXT DEFAULT 'cmgeventos0@gmail.com',
  barrio_como_combo BOOLEAN DEFAULT false,
  invitado_obligatorio BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Si la tabla 'event_config' existía con datos, migrar el evento por defecto a 'events'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_config') THEN
    INSERT INTO public.events (
      id, slug, nombre, descripcion, fecha_evento, lugar_evento, logo_url,
      asunto_correo, mensaje_correo, mensaje_whatsapp, correo_remitente,
      barrio_como_combo, invitado_obligatorio, created_at, updated_at
    )
    SELECT
      id,
      'evento-principal',
      COALESCE(nombre_evento, 'Evento Principal'),
      descripcion,
      CASE WHEN fecha_evento IS NOT NULL AND fecha_evento != '' THEN fecha_evento::TIMESTAMPTZ ELSE NULL END,
      lugar_evento,
      logo_url,
      asunto_correo,
      mensaje_correo,
      mensaje_whatsapp,
      correo_remitente,
      barrio_como_combo,
      invitado_obligatorio,
      created_at::TIMESTAMPTZ,
      updated_at::TIMESTAMPTZ
    FROM public.event_config
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 2. Asegurar que exista al menos un evento por defecto en 'events'
INSERT INTO public.events (
  slug, nombre, descripcion, fecha_evento, lugar_evento,
  activo, requiere_checkin, color_primario, color_secundario,
  asunto_correo, mensaje_correo, mensaje_whatsapp, correo_remitente
)
VALUES (
  'evento-principal', 'Evento Principal CMG', 'Gran evento congregacional y conferencias',
  now() + interval '30 days', 'Auditorio Principal CMG',
  true, true, '#083E30', '#CFAA37',
  'Tu invitación al evento', 'Te invitamos a nuestro evento especial.',
  'Hola, aquí está mi invitación al evento. Puedes descargarla en este enlace:', 'cmgeventos0@gmail.com'
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Habilitar RLS en events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read events" ON public.events;
DROP POLICY IF EXISTS "Admin full events" ON public.events;
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admin full events" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- 4. Asociar columna event_id a registrations si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'event_id') THEN
    ALTER TABLE public.registrations ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Asignar el event_id por defecto a los registros existentes que lo tengan NULL
DO $$
DECLARE
  default_evt_id UUID;
BEGIN
  SELECT id INTO default_evt_id FROM public.events WHERE slug = 'evento-principal' LIMIT 1;
  IF default_evt_id IS NOT NULL THEN
    UPDATE public.registrations SET event_id = default_evt_id WHERE event_id IS NULL;
  END IF;
END $$;

-- 5. Crear tabla event_field_configs para personalizar campos por evento
CREATE TABLE IF NOT EXISTS public.event_field_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  label TEXT NOT NULL,
  placeholder TEXT,
  help_text TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  orden INT NOT NULL DEFAULT 0,
  options JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, field_key)
);

ALTER TABLE public.event_field_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read event_field_configs" ON public.event_field_configs;
DROP POLICY IF EXISTS "Admin full event_field_configs" ON public.event_field_configs;
CREATE POLICY "Public read event_field_configs" ON public.event_field_configs FOR SELECT USING (true);
CREATE POLICY "Admin full event_field_configs" ON public.event_field_configs FOR ALL USING (true) WITH CHECK (true);

-- 6. Insertar campos por defecto para el evento principal
DO $$
DECLARE
  main_evt_id UUID;
BEGIN
  SELECT id INTO main_evt_id FROM public.events WHERE slug = 'evento-principal' LIMIT 1;
  IF main_evt_id IS NOT NULL THEN
    DELETE FROM public.event_field_configs WHERE event_id = main_evt_id;
    
    INSERT INTO public.event_field_configs (event_id, field_key, field_type, label, placeholder, required, orden) VALUES
      (main_evt_id, 'nombres', 'text', 'Nombre(s)', 'Ingresa tu(s) nombre(s)', true, 1),
      (main_evt_id, 'apellidos', 'text', 'Apellidos', 'Ingresa tus apellidos', true, 2),
      (main_evt_id, 'fecha_nacimiento', 'date', 'Fecha de Nacimiento', '', true, 3),
      (main_evt_id, 'tipo_documento_id', 'select', 'Tipo de Documento', '', true, 4),
      (main_evt_id, 'numero_documento', 'text', 'Número de Documento', 'Ej: 1234567890', true, 5),
      (main_evt_id, 'telefono', 'phone', 'Teléfono / WhatsApp', 'Ej: 3001234567', true, 6),
      (main_evt_id, 'direccion', 'text', 'Dirección', 'Ingresa tu dirección', true, 7),
      (main_evt_id, 'barrio', 'text', 'Barrio', 'Ingresa tu barrio', true, 8),
      (main_evt_id, 'correo', 'email', 'Correo Electrónico', 'tu@correo.com', true, 9),
      (main_evt_id, 'estado_civil_id', 'select', 'Estado Civil', '', true, 10),
      (main_evt_id, 'sexo_id', 'radio', 'Sexo', '', true, 11),
      (main_evt_id, 'cdp_id', 'select', 'Casa de Paz (CDP)', '', true, 12),
      (main_evt_id, 'red_id', 'select', 'RED', '', true, 13),
      (main_evt_id, 'nombre_invitador', 'text', 'Nombre de quien te invitó', 'Opcional', false, 14);
  END IF;
END $$;
