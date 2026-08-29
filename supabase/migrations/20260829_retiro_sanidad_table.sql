-- Migración para la tabla independiente del evento Retiro de Sanidad Interior y Liberación

-- 1. Crear el evento en la tabla 'events'
INSERT INTO public.events (
  slug,
  nombre,
  descripcion,
  activo,
  requiere_checkin,
  color_primario,
  color_secundario,
  asunto_correo,
  mensaje_correo,
  mensaje_whatsapp,
  correo_remitente
) VALUES (
  'retiro-sanidad-interior',
  'Retiro de Sanidad Interior y Liberación',
  'Un espacio de encuentro con Dios para recibir sanación interior y liberación espiritual.',
  true,
  true,
  '#1e3a5f',
  '#c084fc',
  'Tu inscripción al Retiro de Sanidad Interior y Liberación',
  '¡Gracias por inscribirte! Te esperamos en este tiempo especial de sanidad.',
  'Hola, aquí está tu invitación al Retiro de Sanidad Interior y Liberación. Puedes descargarla en este enlace:',
  'cmgeventos0@gmail.com'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Crear la tabla independiente para los registros del Retiro de Sanidad
CREATE TABLE IF NOT EXISTS public.retiro_sanidad_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  correo TEXT NOT NULL,
  nombres TEXT NOT NULL,
  primer_apellido TEXT NOT NULL,
  segundo_apellido TEXT,
  tipo_documento_id UUID NOT NULL REFERENCES public.catalog_tipo_documento(id),
  numero_documento TEXT NOT NULL,
  sexo_id UUID NOT NULL REFERENCES public.catalog_sexo(id),
  fecha_nacimiento DATE NOT NULL,
  edad INT NOT NULL,
  celular TEXT NOT NULL,
  direccion TEXT NOT NULL,
  barrio TEXT NOT NULL,
  ciudad TEXT NOT NULL DEFAULT 'Bucaramanga',
  pais TEXT NOT NULL DEFAULT 'Colombia',
  bautizo TEXT NOT NULL,
  estado_civil_id UUID NOT NULL REFERENCES public.catalog_estado_civil(id),
  participo_previo BOOLEAN NOT NULL DEFAULT false,
  red_id UUID NOT NULL REFERENCES public.catalog_red(id),
  cdp_id UUID NOT NULL REFERENCES public.catalog_cdp(id),
  iglesia_cobertura TEXT,
  pdf_url TEXT,
  qr_code TEXT,
  asistio BOOLEAN NOT NULL DEFAULT false,
  fecha_asistencia TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo_documento_id, numero_documento)
);

-- 3. Habilitar RLS en retiro_sanidad_registrations
ALTER TABLE public.retiro_sanidad_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read retiro_sanidad_registrations" ON public.retiro_sanidad_registrations;
DROP POLICY IF EXISTS "Public insert retiro_sanidad_registrations" ON public.retiro_sanidad_registrations;
DROP POLICY IF EXISTS "Admin all retiro_sanidad_registrations" ON public.retiro_sanidad_registrations;

CREATE POLICY "Public read retiro_sanidad_registrations" ON public.retiro_sanidad_registrations FOR SELECT USING (true);
CREATE POLICY "Public insert retiro_sanidad_registrations" ON public.retiro_sanidad_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin all retiro_sanidad_registrations" ON public.retiro_sanidad_registrations FOR ALL USING (true);
