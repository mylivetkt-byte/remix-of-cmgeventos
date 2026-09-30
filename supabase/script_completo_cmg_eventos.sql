-- ==============================================================================
-- SCRIPT MAESTRO DE BASE DE DATOS: CMG EVENTOS & CONFERENCIAS
-- Compatible con PostgreSQL y Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase (Run)
-- ==============================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para actualizar columnas updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================================================
-- 2. TABLAS DE CATÁLOGOS BASE
-- ==============================================================================

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

-- ==============================================================================
-- 3. CONFIGURACIÓN GENERAL Y EVENTOS
-- ==============================================================================

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
  fecha TIMESTAMPTZ,
  lugar_evento TEXT,
  lugar TEXT,
  precio NUMERIC DEFAULT 0,
  cupos INT DEFAULT 500,
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

-- ==============================================================================
-- 4. REGISTROS DE PARTICIPANTES Y ASISTENCIA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento DATE,
  edad INT,
  tipo_documento_id UUID REFERENCES public.catalog_tipo_documento(id),
  numero_documento TEXT,
  telefono TEXT,
  direccion TEXT,
  barrio TEXT,
  correo TEXT,
  estado_civil_id UUID REFERENCES public.catalog_estado_civil(id),
  sexo_id UUID REFERENCES public.catalog_sexo(id),
  cdp_id UUID REFERENCES public.catalog_cdp(id),
  red_id UUID REFERENCES public.catalog_red(id),
  nombre_invitador TEXT,
  invitado_por TEXT,
  pdf_url TEXT,
  qr_code TEXT,
  asistio BOOLEAN DEFAULT false,
  fecha_asistencia TIMESTAMPTZ,
  estado_pago TEXT DEFAULT 'Pendiente',
  monto_pagado NUMERIC DEFAULT 0,
  monto_pendiente NUMERIC DEFAULT 0,
  notas_pago TEXT,
  comprobante_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
  fecha_hora TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  metodo TEXT DEFAULT 'QR_SCANNER',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
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
  fecha_nacimiento DATE,
  edad INT,
  direccion TEXT,
  barrio TEXT,
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

-- ==============================================================================
-- 5. CASAS DE PAZ, AUDITORIO Y CONTACTOS WHATSAPP
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.casas_de_paz_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres TEXT,
  apellidos TEXT,
  nombre TEXT,
  telefono TEXT,
  direccion TEXT,
  barrio TEXT,
  ciudad TEXT,
  correo TEXT,
  estado TEXT DEFAULT 'pendiente',
  comentarios TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT,
  etiquetas TEXT[] DEFAULT '{}',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_crm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  estado TEXT DEFAULT 'enviado',
  tipo TEXT DEFAULT 'individual',
  fecha_envio TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
  telefono TEXT NOT NULL,
  nombre TEXT,
  ultimo_mensaje TEXT,
  fecha_ultimo_mensaje TIMESTAMPTZ DEFAULT now(),
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  remitente TEXT NOT NULL,
  texto TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo BOOLEAN DEFAULT true,
  nombre_bot TEXT DEFAULT 'Asistente Virtual CMG',
  mensaje_bienvenida TEXT DEFAULT '¡Hola! Bienvenido a CMG Eventos. ¿En qué podemos ayudarte hoy?',
  instrucciones_ia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auditorio_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo BOOLEAN NOT NULL DEFAULT true,
  titulo TEXT NOT NULL DEFAULT 'Alquiler del Auditorio',
  subtitulo TEXT,
  descripcion TEXT,
  precio NUMERIC DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS public.historial_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_archivo TEXT NOT NULL,
  tamano_bytes BIGINT,
  total_registros INT,
  usuario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. DATOS SEMILLA INICIALES (CATÁLOGOS Y CONFIGURACIÓN)
-- ==============================================================================

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
VALUES ('Alquiler del Auditorio', 'Un espacio amplio y equipado para tu evento', 'Auditorio disponible para conferencias y eventos especiales.', '300 personas')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 7. POLÍTICAS ROW LEVEL SECURITY (RLS PERMISIVAS)
-- Permite acceso completo para que la aplicación web funcione sin bloqueos
-- ==============================================================================

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
        'attendance',
        'retiro_sanidad_registrations',
        'casas_de_paz_requests',
        'casa_de_paz_solicitudes',
        'whatsapp_contacts',
        'whatsapp_crm_messages',
        'chat_conversations',
        'chat_messages',
        'chatbot_config',
        'chatbot_faq',
        'auditorio_config',
        'auditorio_solicitudes',
        'historial_backups'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'policy_open_all_' || tbl, tbl);
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO public USING (true) WITH CHECK (true);', 'policy_open_all_' || tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- Permisos de lectura y escritura globales en el esquema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ==============================================================================
-- 8. STORAGE BUCKET PARA INVITACIONES Y PASES PDF
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('invitations', 'invitations', true) 
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read invitations" ON storage.objects;
    CREATE POLICY "Public read invitations" ON storage.objects FOR SELECT USING (bucket_id = 'invitations');
    DROP POLICY IF EXISTS "Anyone upload invitations" ON storage.objects;
    CREATE POLICY "Anyone upload invitations" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invitations');
    DROP POLICY IF EXISTS "Anyone update invitations" ON storage.objects;
    CREATE POLICY "Anyone update invitations" ON storage.objects FOR UPDATE USING (bucket_id = 'invitations');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 9. HABILITAR REALTIME EN TABLAS CLAVE
-- ==============================================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;



-- ==============================================================================
-- 10. USUARIO SUPER ADMIN INICIAL (cmeventos@gmail.com / cmg2026)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'super_admin',
  password TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar políticas RLS para admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_open_all_admin_users" ON public.admin_users;
CREATE POLICY "policy_open_all_admin_users" ON public.admin_users FOR ALL TO public USING (true) WITH CHECK (true);

-- Insertar en tabla de administración pública
INSERT INTO public.admin_users (email, nombre, rol, password, activo)
VALUES ('cmeventos@gmail.com', 'Super Administrador CMG', 'super_admin', 'cmg2026', true)
ON CONFLICT (email) DO UPDATE SET 
  password = 'cmg2026',
  rol = 'super_admin',
  activo = true;

-- Crear o actualizar usuario en el sistema de autenticación nativo de Supabase (auth.users)
DO $
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cmeventos@gmail.com') THEN
    -- Insertar nuevo usuario con contraseña encriptada por bcrypt
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'cmeventos@gmail.com',
      crypt('cmg2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nombre":"Super Administrador CMG","rol":"super_admin"}'::jsonb,
      now(),
      now(),
      '',
      ''
    );

    -- Registrar identidad para inicio de sesión por email
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, 'cmeventos@gmail.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    ) ON CONFLICT DO NOTHING;

    -- Asignar rol en user_roles si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin')
      ON CONFLICT DO NOTHING;
    END IF;

  ELSE
    -- Si el usuario ya existe, actualizar contraseña a cmg2026 y confirmar correo
    UPDATE auth.users
    SET encrypted_password = crypt('cmg2026', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = '{"nombre":"Super Administrador CMG","rol":"super_admin"}'::jsonb,
        updated_at = now()
    WHERE email = 'cmeventos@gmail.com';
  END IF;
END $;

-- FIN DEL SCRIPT MAESTRO CMG EVENTOS
