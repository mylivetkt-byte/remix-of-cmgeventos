-- ==============================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS: CMG EVENTOS Y CONFERENCIAS
-- Compatible con PostgreSQL y Supabase
-- ==============================================================================

-- 1. Extensiones y Funciones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Catálogos base
CREATE TABLE IF NOT EXISTS public.catalog_tipo_documento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_estado_civil (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_sexo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_cdp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_red (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_barrio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Configuración y Eventos
CREATE TABLE IF NOT EXISTS public.event_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_evento TEXT NOT NULL DEFAULT 'Mi Evento',
  descripcion TEXT,
  fecha_evento TEXT,
  lugar_evento TEXT,
  logo_url TEXT,
  banner_url TEXT,
  color_primario TEXT DEFAULT '#083E30',
  color_secundario TEXT DEFAULT '#CFAA37',
  activo BOOLEAN NOT NULL DEFAULT true,
  asunto_correo TEXT DEFAULT 'Tu invitación al evento',
  mensaje_correo TEXT DEFAULT 'Te invitamos a nuestro evento especial.',
  mensaje_whatsapp TEXT DEFAULT 'Hola, aquí está mi invitación al evento. Puedes descargarla desde este enlace:',
  correo_remitente TEXT DEFAULT 'cmgeventos0@gmail.com',
  barrio_como_combo BOOLEAN NOT NULL DEFAULT false,
  invitado_obligatorio BOOLEAN NOT NULL DEFAULT false,
  requiere_checkin BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.event_field_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL,
  label TEXT NOT NULL,
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, field_key)
);

-- 4. Registros Principales
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  edad INT NOT NULL,
  tipo_documento_id UUID REFERENCES public.catalog_tipo_documento(id),
  numero_documento TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT NOT NULL,
  barrio TEXT NOT NULL,
  correo TEXT NOT NULL,
  estado_civil_id UUID REFERENCES public.catalog_estado_civil(id),
  sexo_id UUID REFERENCES public.catalog_sexo(id),
  cdp_id UUID REFERENCES public.catalog_cdp(id),
  red_id UUID REFERENCES public.catalog_red(id),
  nombre_invitador TEXT,
  pdf_url TEXT,
  qr_code TEXT,
  asistio BOOLEAN DEFAULT false,
  fecha_asistencia TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo_documento_id, numero_documento)
);

CREATE TABLE IF NOT EXISTS public.retiro_sanidad_registrations (
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

-- 5. Solicitudes de Casa de Paz y Auditorio
CREATE TABLE IF NOT EXISTS public.casa_de_paz_solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT NOT NULL,
  barrio TEXT NOT NULL,
  correo TEXT,
  estado TEXT DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auditorio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo BOOLEAN NOT NULL DEFAULT true,
  titulo TEXT NOT NULL DEFAULT 'Alquiler del Auditorio',
  subtitulo TEXT,
  descripcion TEXT,
  precio NUMERIC,
  moneda TEXT NOT NULL DEFAULT 'COP',
  mostrar_precio BOOLEAN NOT NULL DEFAULT true,
  texto_tarifas TEXT,
  condiciones TEXT,
  capacidad TEXT,
  direccion TEXT,
  telefono_contacto TEXT,
  correo_contacto TEXT,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auditorio_solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT,
  organizacion TEXT,
  tipo_evento TEXT,
  fecha_evento DATE,
  hora_inicio TEXT,
  hora_fin TEXT,
  num_asistentes INT,
  mensaje TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Usuarios y Secretos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Semillas Iniciales (Catálogos y Evento Principal)
INSERT INTO public.catalog_tipo_documento (nombre, orden) 
SELECT 'Cédula de Ciudadanía', 1 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_tipo_documento WHERE nombre = 'Cédula de Ciudadanía');
INSERT INTO public.catalog_tipo_documento (nombre, orden) 
SELECT 'Tarjeta de Identidad', 2 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_tipo_documento WHERE nombre = 'Tarjeta de Identidad');
INSERT INTO public.catalog_tipo_documento (nombre, orden) 
SELECT 'Cédula de Extranjería', 3 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_tipo_documento WHERE nombre = 'Cédula de Extranjería');
INSERT INTO public.catalog_tipo_documento (nombre, orden) 
SELECT 'Pasaporte', 4 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_tipo_documento WHERE nombre = 'Pasaporte');

INSERT INTO public.catalog_estado_civil (nombre, orden) 
SELECT 'Soltero(a)', 1 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_estado_civil WHERE nombre = 'Soltero(a)');
INSERT INTO public.catalog_estado_civil (nombre, orden) 
SELECT 'Casado(a)', 2 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_estado_civil WHERE nombre = 'Casado(a)');
INSERT INTO public.catalog_estado_civil (nombre, orden) 
SELECT 'Unión Libre', 3 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_estado_civil WHERE nombre = 'Unión Libre');
INSERT INTO public.catalog_estado_civil (nombre, orden) 
SELECT 'Divorciado(a)', 4 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_estado_civil WHERE nombre = 'Divorciado(a)');

INSERT INTO public.catalog_sexo (nombre, orden) 
SELECT 'Masculino', 1 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_sexo WHERE nombre = 'Masculino');
INSERT INTO public.catalog_sexo (nombre, orden) 
SELECT 'Femenino', 2 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_sexo WHERE nombre = 'Femenino');

INSERT INTO public.catalog_cdp (nombre, orden) 
SELECT 'CDP 1', 1 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_cdp WHERE nombre = 'CDP 1');
INSERT INTO public.catalog_cdp (nombre, orden) 
SELECT 'CDP 2', 2 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_cdp WHERE nombre = 'CDP 2');

INSERT INTO public.catalog_red (nombre, orden) 
SELECT 'Red 1', 1 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_red WHERE nombre = 'Red 1');
INSERT INTO public.catalog_red (nombre, orden) 
SELECT 'Red 2', 2 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_red WHERE nombre = 'Red 2');

INSERT INTO public.event_config (nombre_evento) 
VALUES ('Evento Principal CMG') ON CONFLICT DO NOTHING;

INSERT INTO public.events (slug, nombre, descripcion, activo)
VALUES ('evento-principal', 'Evento Principal CMG', 'Gran evento congregacional y conferencias', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.auditorio_config (titulo, subtitulo, descripcion, capacidad)
VALUES ('Alquiler del Auditorio', 'Un espacio amplio y equipado para tu evento', 'Auditorio disponible para conferencias y eventos.', '300 personas')
ON CONFLICT DO NOTHING;

-- 8. Permisos y Políticas RLS Permisivas
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'catalog_tipo_documento',
        'catalog_estado_civil',
        'catalog_sexo',
        'catalog_cdp',
        'catalog_red',
        'catalog_barrio',
        'event_config',
        'events',
        'event_field_configs',
        'registrations',
        'retiro_sanidad_registrations',
        'casa_de_paz_solicitudes',
        'auditorio_config',
        'auditorio_solicitudes',
        'user_roles',
        'app_secrets'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'policy_cmg_all_' || tbl, tbl);
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', 'policy_cmg_all_' || tbl, tbl);
        END IF;
    END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 9. Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('invitations', 'invitations', true) ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read invitations" ON storage.objects;
    CREATE POLICY "Public read invitations" ON storage.objects FOR SELECT USING (bucket_id = 'invitations');
    DROP POLICY IF EXISTS "Anyone upload invitations" ON storage.objects;
    CREATE POLICY "Anyone upload invitations" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invitations');
    DROP POLICY IF EXISTS "Anyone update invitations" ON storage.objects;
    CREATE POLICY "Anyone update invitations" ON storage.objects FOR UPDATE USING (bucket_id = 'invitations');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
