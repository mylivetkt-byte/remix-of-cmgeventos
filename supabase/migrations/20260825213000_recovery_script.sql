-- Recovery script - Only creates missing tables/columns

-- Function for updated_at trigger (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===================== CATALOGS (IF NOT EXISTS) =====================

CREATE TABLE IF NOT EXISTS public.catalog_tipo_documento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_tipo_documento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read catalog_tipo_documento" ON public.catalog_tipo_documento;
CREATE POLICY "Public read catalog_tipo_documento" ON public.catalog_tipo_documento FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full catalog_tipo_documento" ON public.catalog_tipo_documento;
CREATE POLICY "Admin full catalog_tipo_documento" ON public.catalog_tipo_documento FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_catalog_tipo_documento_updated_at ON public.catalog_tipo_documento;
CREATE TRIGGER update_catalog_tipo_documento_updated_at BEFORE UPDATE ON public.catalog_tipo_documento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.catalog_estado_civil (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_estado_civil ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read catalog_estado_civil" ON public.catalog_estado_civil;
CREATE POLICY "Public read catalog_estado_civil" ON public.catalog_estado_civil FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full catalog_estado_civil" ON public.catalog_estado_civil;
CREATE POLICY "Admin full catalog_estado_civil" ON public.catalog_estado_civil FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_catalog_estado_civil_updated_at ON public.catalog_estado_civil;
CREATE TRIGGER update_catalog_estado_civil_updated_at BEFORE UPDATE ON public.catalog_estado_civil FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.catalog_sexo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_sexo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read catalog_sexo" ON public.catalog_sexo;
CREATE POLICY "Public read catalog_sexo" ON public.catalog_sexo FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full catalog_sexo" ON public.catalog_sexo;
CREATE POLICY "Admin full catalog_sexo" ON public.catalog_sexo FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_catalog_sexo_updated_at ON public.catalog_sexo;
CREATE TRIGGER update_catalog_sexo_updated_at BEFORE UPDATE ON public.catalog_sexo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.catalog_cdp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_cdp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read catalog_cdp" ON public.catalog_cdp;
CREATE POLICY "Public read catalog_cdp" ON public.catalog_cdp FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full catalog_cdp" ON public.catalog_cdp;
CREATE POLICY "Admin full catalog_cdp" ON public.catalog_cdp FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_catalog_cdp_updated_at ON public.catalog_cdp;
CREATE TRIGGER update_catalog_cdp_updated_at BEFORE UPDATE ON public.catalog_cdp FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.catalog_red (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_red ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read catalog_red" ON public.catalog_red;
CREATE POLICY "Public read catalog_red" ON public.catalog_red FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full catalog_red" ON public.catalog_red;
CREATE POLICY "Admin full catalog_red" ON public.catalog_red FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_catalog_red_updated_at ON public.catalog_red;
CREATE TRIGGER update_catalog_red_updated_at BEFORE UPDATE ON public.catalog_red FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.catalog_barrio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_barrio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read catalog_barrio" ON public.catalog_barrio;
CREATE POLICY "Public read catalog_barrio" ON public.catalog_barrio FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full catalog_barrio" ON public.catalog_barrio;
CREATE POLICY "Admin full catalog_barrio" ON public.catalog_barrio FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_catalog_barrio_updated_at ON public.catalog_barrio;
CREATE TRIGGER update_catalog_barrio_updated_at BEFORE UPDATE ON public.catalog_barrio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== EVENT CONFIG =====================
CREATE TABLE IF NOT EXISTS public.event_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_evento TEXT NOT NULL DEFAULT 'Mi Evento',
  logo_url TEXT,
  descripcion TEXT,
  fecha_evento TIMESTAMPTZ,
  lugar_evento TEXT,
  asunto_correo TEXT NOT NULL DEFAULT 'Tu invitación al evento',
  mensaje_correo TEXT NOT NULL DEFAULT 'Te invitamos a nuestro evento especial.',
  mensaje_whatsapp TEXT NOT NULL DEFAULT 'Hola, aquí está mi invitación al evento. Puedes descargarla desde este enlace:',
  invitado_obligatorio BOOLEAN NOT NULL DEFAULT false,
  barrio_como_combo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read event_config" ON public.event_config;
CREATE POLICY "Public read event_config" ON public.event_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full event_config" ON public.event_config;
CREATE POLICY "Admin full event_config" ON public.event_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_event_config_updated_at ON public.event_config;
CREATE TRIGGER update_event_config_updated_at BEFORE UPDATE ON public.event_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.event_config (nombre_evento) VALUES ('Mi Evento') ON CONFLICT DO NOTHING;

-- ===================== REGISTRATIONS =====================
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  edad INT NOT NULL,
  tipo_documento_id UUID NOT NULL REFERENCES public.catalog_tipo_documento(id),
  numero_documento TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT NOT NULL,
  barrio TEXT NOT NULL,
  correo TEXT NOT NULL,
  estado_civil_id UUID NOT NULL REFERENCES public.catalog_estado_civil(id),
  sexo_id UUID NOT NULL REFERENCES public.catalog_sexo(id),
  cdp_id UUID NOT NULL REFERENCES public.catalog_cdp(id),
  red_id UUID NOT NULL REFERENCES public.catalog_red(id),
  nombre_invitador TEXT,
  pdf_url TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo_documento_id, numero_documento)
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert registrations" ON public.registrations;
CREATE POLICY "Anyone can insert registrations" ON public.registrations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public read registrations" ON public.registrations;
CREATE POLICY "Public read registrations" ON public.registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin update registrations" ON public.registrations;
CREATE POLICY "Admin update registrations" ON public.registrations FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin delete registrations" ON public.registrations;
CREATE POLICY "Admin delete registrations" ON public.registrations FOR DELETE TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_registrations_updated_at ON public.registrations;
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== ADD ATTENDANCE FIELDS =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'asistio') THEN
    ALTER TABLE public.registrations ADD COLUMN asistio BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'fecha_asistencia') THEN
    ALTER TABLE public.registrations ADD COLUMN fecha_asistencia TIMESTAMPTZ;
  END IF;
END $$;

-- ===================== ADMIN ROLES =====================
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
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ===================== SEED CATALOGS (IF EMPTY) =====================
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
INSERT INTO public.catalog_estado_civil (nombre, orden) 
SELECT 'Viudo(a)', 5 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_estado_civil WHERE nombre = 'Viudo(a)');

INSERT INTO public.catalog_sexo (nombre, orden) 
SELECT 'Masculino', 1 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_sexo WHERE nombre = 'Masculino');
INSERT INTO public.catalog_sexo (nombre, orden) 
SELECT 'Femenino', 2 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_sexo WHERE nombre = 'Femenino');

INSERT INTO public.catalog_cdp (nombre, orden) 
SELECT 'CDP 1', 1 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_cdp WHERE nombre = 'CDP 1');
INSERT INTO public.catalog_cdp (nombre, orden) 
SELECT 'CDP 2', 2 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_cdp WHERE nombre = 'CDP 2');
INSERT INTO public.catalog_cdp (nombre, orden) 
SELECT 'CDP 3', 3 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_cdp WHERE nombre = 'CDP 3');

INSERT INTO public.catalog_red (nombre, orden) 
SELECT 'Red 1', 1 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_red WHERE nombre = 'Red 1');
INSERT INTO public.catalog_red (nombre, orden) 
SELECT 'Red 2', 2 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_red WHERE nombre = 'Red 2');
INSERT INTO public.catalog_red (nombre, orden) 
SELECT 'Red 3', 3 WHERE NOT EXISTS (SELECT 1 FROM public.catalog_red WHERE nombre = 'Red 3');

-- ===================== STORAGE BUCKET =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('invitations', 'invitations', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read invitations" ON storage.objects;
CREATE POLICY "Public read invitations" ON storage.objects FOR SELECT USING (bucket_id = 'invitations');
DROP POLICY IF EXISTS "Anyone can upload invitations" ON storage.objects;
CREATE POLICY "Anyone can upload invitations" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invitations');
DROP POLICY IF EXISTS "Admin update invitations" ON storage.objects;
CREATE POLICY "Admin update invitations" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'invitations');

-- Verify
SELECT 'Catalogs and tables created successfully!' as status;
