import React, { useState, useRef } from "react";
import {
  X,
  Database,
  Plug,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Cloud,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileJson,
  Sparkles,
  Activity,
  Info,
  ExternalLink,
  Settings,
  Rocket,
  Check,
  Package,
  Users,
  Receipt,
  Layers,
  Copy,
  CheckCheck,
  Download,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

interface AsistenteRestauracionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BackupMetadata {
  fecha: string;
  totalTablas: number;
  totalRegistros: number;
  version: string;
}

interface BackupData {
  metadata: BackupMetadata;
  datos: Record<string, any[]>;
}

type PasoAsistente = 1 | 2 | 3 | 4;

const SQL_SCHEMA_PRINCIPAL = `-- ==============================================================================
-- SCRIPT MAESTRO DE BASE DE DATOS: CMG EVENTOS & CONFERENCIAS
-- Compatible con PostgreSQL y Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase (Run)
-- ==============================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para actualizar columnas updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql SET search_path = public;

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

DO $ 
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
END $;

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

DO $ BEGIN
    DROP POLICY IF EXISTS "Public read invitations" ON storage.objects;
    CREATE POLICY "Public read invitations" ON storage.objects FOR SELECT USING (bucket_id = 'invitations');
    DROP POLICY IF EXISTS "Anyone upload invitations" ON storage.objects;
    CREATE POLICY "Anyone upload invitations" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invitations');
    DROP POLICY IF EXISTS "Anyone update invitations" ON storage.objects;
    CREATE POLICY "Anyone update invitations" ON storage.objects FOR UPDATE USING (bucket_id = 'invitations');
EXCEPTION WHEN OTHERS THEN NULL;
END $;

-- ==============================================================================
-- 9. HABILITAR REALTIME EN TABLAS CLAVE
-- ==============================================================================

DO $ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
EXCEPTION WHEN OTHERS THEN NULL;
END $;

DO $ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
EXCEPTION WHEN OTHERS THEN NULL;
END $;

DO $ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $;



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
`;

export function AsistenteRestauracionModal({
  open,
  onOpenChange,
}: AsistenteRestauracionModalProps) {
  const [paso, setPaso] = useState<PasoAsistente>(1);

  // Paso 1: Credenciales
  const [bdUrl, setBdUrl] = useState("");
  const [bdKey, setBdKey] = useState("");
  const [mostrarKey, setMostrarKey] = useState(false);

  // Paso 2: Probar conexión
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState<"idle" | "ok" | "error">("idle");
  const [mensajeConexion, setMensajeConexion] = useState("");

  // Paso 3: Inicializar BD
  const [inicializandoBD, setInicializandoBD] = useState(false);
  const [estadoInicializacion, setEstadoInicializacion] = useState<"idle" | "ok" | "error">("idle");
  const [mensajeInicializacion, setMensajeInicializacion] = useState("");
  const [tablasCreadas, setTablasCreadas] = useState<string[]>([]);

  // Paso 4: Restauración
  const [archivoRestaurar, setArchivoRestaurar] = useState<File | null>(null);
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [metadataBackup, setMetadataBackup] = useState<BackupMetadata | null>(null);
  const [procesandoRestauracion, setProcesandoRestauracion] = useState(false);
  const [progresoRestauracion, setProgresoRestauracion] = useState("");
  const [estadoRestauracion, setEstadoRestauracion] = useState<"idle" | "ok" | "error">("idle");
  const [resumenRestauracion, setResumenRestauracion] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copiar al portapapeles
  const [copiado, setCopiado] = useState<string | null>(null);

  function crearClienteSupabase() {
    const isNewKey = bdKey.startsWith("sb_publishable_") || bdKey.startsWith("sb_secret_");
    return createClient(bdUrl, bdKey, {
      global: {
        fetch: (input, init) => {
          const headers = new Headers(
            typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
          );
          if (init?.headers) {
            new Headers(init.headers).forEach((value, key) => headers.set(key, value));
          }
          if (isNewKey && headers.get("Authorization") === `Bearer ${bdKey}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", bdKey);
          return fetch(input, { ...init, headers });
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async function handleCopiar(texto: string, campo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(campo);
      toast.success(`${campo} copiado al portapapeles`);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      toast.error("No se pudo copiar automáticamente. Puedes seleccionar el texto abajo y copiarlo.");
    }
  }

  function handleDescargarSql() {
    try {
      const blob = new Blob([SQL_SCHEMA_PRINCIPAL], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "script_completo_cmg_eventos.sql";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Script SQL completo descargado");
    } catch {
      toast.error("No se pudo descargar el archivo SQL");
    }
  }

  React.useEffect(() => {
    if (open) {
      const url = localStorage.getItem("custom_supabase_url") || import.meta.env["VITE_SUPABASE_URL"] || "";
      const key = localStorage.getItem("custom_supabase_key") || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
      if (url) setBdUrl(url);
      if (key) setBdKey(key);
    }
  }, [open]);

  // Paso 2: Probar Conexión
  async function handleProbarConexion() {
    const cleanUrl = bdUrl.trim().replace(/\/$/, "");
    const cleanKey = bdKey.trim();

    if (!cleanUrl || !cleanKey) {
      toast.error("Ingresa la URL y la API Key de Supabase");
      return;
    }

    setProbandoConexion(true);
    setEstadoConexion("idle");
    setMensajeConexion("Conectando con Supabase...");

    try {
      const isNewKey = cleanKey.startsWith("sb_publishable_") || cleanKey.startsWith("sb_secret_");
      const headers: Record<string, string> = { apikey: cleanKey };
      if (!isNewKey) {
        headers["Authorization"] = `Bearer ${cleanKey}`;
      }

      let res = await fetch(`${cleanUrl}/auth/v1/health`, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        res = await fetch(`${cleanUrl}/rest/v1/events?select=id&limit=1`, {
          method: "GET",
          headers,
        });
      }

      if (res.ok || res.status === 404 || res.status === 200 || res.status === 206) {
        setEstadoConexion("ok");
        setMensajeConexion("¡Conexión establecida correctamente con el proyecto de Supabase!");
        localStorage.setItem("custom_supabase_url", cleanUrl);
        localStorage.setItem("custom_supabase_key", cleanKey);
        window.dispatchEvent(new CustomEvent("supabase_credentials_updated"));
        toast.success("Conexión con Supabase verificada");
      } else {
        setEstadoConexion("error");
        setMensajeConexion(`Error de conexión (Código HTTP ${res.status}). Revisa la URL y la clave.`);
        toast.error("Error al conectar con Supabase");
      }
    } catch (err: any) {
      setEstadoConexion("error");
      setMensajeConexion(`No se pudo conectar: ${err?.message || "Verifica tu conexión a internet o la URL ingresada."}`);
      toast.error("Error de conexión");
    } finally {
      setProbandoConexion(false);
    }
  }

  // Paso 3: Inicializar y Verificar Tablas
  async function handleInicializarBD() {
    setInicializandoBD(true);
    setEstadoInicializacion("idle");
    setMensajeInicializacion("Verificando tablas y estructura en Supabase...");
    setTablasCreadas([]);

    try {
      const client = crearClienteSupabase();

      const tablasPrincipales = [
        "events",
        "event_config",
        "registrations",
        "catalog_tipo_documento",
        "catalog_estado_civil",
        "catalog_sexo",
        "catalog_cdp",
        "catalog_red",
        "catalog_barrio",
        "auditorio_config",
        "auditorio_solicitudes",
        "casa_de_paz_solicitudes",
      ];

      const tablasVerificadas: string[] = [];
      const tablasConError: string[] = [];

      for (const tabla of tablasPrincipales) {
        setMensajeInicializacion(`Verificando tabla: ${tabla}...`);
        try {
          const { error } = await client.from(tabla).select("*").limit(1);
          if (!error) {
            tablasVerificadas.push(tabla);
          } else {
            tablasConError.push(tabla);
          }
        } catch {
          tablasConError.push(tabla);
        }
      }

      setTablasCreadas(tablasVerificadas);

      if (tablasVerificadas.length >= tablasPrincipales.length * 0.7) {
        setEstadoInicializacion("ok");
        setMensajeInicializacion(
          `¡Base de datos verificada! ${tablasVerificadas.length} de ${tablasPrincipales.length} tablas están listas y accesibles.${
            tablasConError.length > 0
              ? ` (${tablasConError.length} tablas no encontradas: ${tablasConError.join(", ")})`
              : ""
          }`
        );
        toast.success(`${tablasVerificadas.length} tablas verificadas correctamente`);
      } else if (tablasVerificadas.length > 0) {
        setEstadoInicializacion("ok");
        setMensajeInicializacion(
          `Base de datos parcialmente configurada: ${tablasVerificadas.length} tablas accesibles. Para crear las faltantes (${tablasConError.join(", ")}), ejecuta el script SQL completo en el SQL Editor de Supabase.`
        );
        toast.warning("Base de datos parcialmente configurada");
      } else {
        setEstadoInicializacion("error");
        setMensajeInicializacion(
          "No se encontraron tablas en la base de datos de Supabase. Para crearlas, copia o descarga el script SQL completo que aparece abajo, ejecútalo en el SQL Editor de Supabase y luego haz clic en 'Verificar' nuevamente."
        );
        toast.error("La base de datos está vacía. Es necesario ejecutar el script SQL en Supabase.");
      }
    } catch (err: any) {
      setEstadoInicializacion("error");
      setMensajeInicializacion(`Error al verificar la BD: ${err?.message || "Desconocido"}`);
      toast.error("Error al verificar la base de datos");
    } finally {
      setInicializandoBD(false);
    }
  }

  // Paso 4: Cargar archivo JSON
  function handleSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoRestaurar(file);
    setEstadoRestauracion("idle");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw);

        // Soporta formato estándar { metadata, datos } o { datos } o formato plano
        let datos: Record<string, any[]> = {};
        let meta: BackupMetadata = {
          fecha: new Date().toISOString(),
          totalTablas: 0,
          totalRegistros: 0,
          version: "1.0",
        };

        if (parsed?.datos && typeof parsed.datos === "object") {
          datos = parsed.datos;
          meta = parsed.metadata || meta;
        } else if (typeof parsed === "object" && !Array.isArray(parsed)) {
          datos = parsed;
        }

        const tablasEncontradas = Object.keys(datos);
        if (tablasEncontradas.length === 0) {
          toast.error("El archivo JSON no contiene tablas de datos");
          setBackupData(null);
          setMetadataBackup(null);
          return;
        }

        let totalReg = 0;
        for (const k of tablasEncontradas) {
          if (Array.isArray(datos[k])) {
            totalReg += datos[k].length;
          }
        }

        meta.totalTablas = tablasEncontradas.length;
        meta.totalRegistros = totalReg;

        setBackupData({ metadata: meta, datos });
        setMetadataBackup(meta);
        toast.success(`Backup válido: ${totalReg} registros en ${tablasEncontradas.length} tablas`);
      } catch {
        toast.error("El archivo no es un JSON válido");
        setBackupData(null);
        setMetadataBackup(null);
      }
    };
    reader.readAsText(file);
  }

  // Paso 4: Ejecutar Restauración
  async function handleEjecutarRestauracion() {
    if (!backupData) {
      toast.error("Selecciona primero un archivo de backup válido");
      return;
    }

    setProcesandoRestauracion(true);
    setEstadoRestauracion("idle");
    setProgresoRestauracion("Iniciando restauración...");
    setResumenRestauracion({});

    try {
      const client = crearClienteSupabase();
      const resumen: Record<string, number> = {};
      const errores: string[] = [];

      // Priorizar catálogos y eventos primero para respetar claves foráneas
      const ordenPrioridad = [
        "catalog_tipo_documento",
        "catalog_estado_civil",
        "catalog_sexo",
        "catalog_cdp",
        "catalog_red",
        "catalog_barrio",
        "event_config",
        "events",
        "event_field_configs",
        "user_roles",
        "registrations",
        "retiro_sanidad_registrations",
        "auditorio_config",
        "auditorio_solicitudes",
        "casa_de_paz_solicitudes",
        "app_secrets",
      ];

      const todasLasTablas = Object.keys(backupData.datos);
      const tablasOrdenadas = [
        ...ordenPrioridad.filter((t) => todasLasTablas.includes(t)),
        ...todasLasTablas.filter((t) => !ordenPrioridad.includes(t)),
      ];

      for (const tabla of tablasOrdenadas) {
        const filas = backupData.datos[tabla];
        if (!filas || !Array.isArray(filas) || filas.length === 0) {
          resumen[tabla] = 0;
          continue;
        }

        let insertados = 0;
        const batchSize = 50;

        for (let i = 0; i < filas.length; i += batchSize) {
          const lote = filas.slice(i, i + batchSize);
          setProgresoRestauracion(`Restaurando ${tabla}: ${Math.min(i + batchSize, filas.length)} / ${filas.length} registros`);

          try {
            const { error } = await client.from(tabla as any).upsert(lote as any);
            if (error) {
              for (const item of lote) {
                try {
                  await client.from(tabla as any).upsert(item as any);
                  insertados++;
                } catch {
                  // Continuar
                }
              }
            } else {
              insertados += lote.length;
            }
          } catch (err: any) {
            errores.push(`Error en ${tabla} lote ${i}: ${err?.message || "Desconocido"}`);
          }
        }

        resumen[tabla] = insertados;
      }

      setResumenRestauracion(resumen);
      const totalRestaurado = Object.values(resumen).reduce((a, b) => a + b, 0);

      if (totalRestaurado > 0) {
        setEstadoRestauracion("ok");
        setProgresoRestauracion(
          `¡Restauración exitosa! Se procesaron ${totalRestaurado} registros en ${Object.keys(resumen).filter((k) => resumen[k] > 0).length} tablas.`
        );
        toast.success(`Restauración completada: ${totalRestaurado} registros`);

        localStorage.setItem("custom_supabase_url", bdUrl);
        localStorage.setItem("custom_supabase_key", bdKey);
        window.dispatchEvent(new CustomEvent("supabase_credentials_updated"));
      } else {
        setEstadoRestauracion("error");
        setProgresoRestauracion("No se pudieron restaurar registros. Verifica que las tablas existan en la BD.");
        toast.error("No se restauraron registros");
      }
    } catch (err: any) {
      setEstadoRestauracion("error");
      setProgresoRestauracion(`Error crítico: ${err?.message || "Desconocido"}`);
      toast.error("Error durante la restauración");
    } finally {
      setProcesandoRestauracion(false);
    }
  }

  const pasos = [
    { num: 1, label: "Credenciales", icon: KeyRound, color: "cyan" },
    { num: 2, label: "Probar Conexión", icon: Plug, color: "blue" },
    { num: 3, label: "Verificar BD", icon: Database, color: "indigo" },
    { num: 4, label: "Restaurar Datos", icon: Upload, color: "emerald" },
  ];

  function puedeAvanzar(): boolean {
    if (paso === 1) return bdUrl.trim().length > 0 && bdKey.trim().length > 0;
    if (paso === 2) return estadoConexion === "ok";
    if (paso === 3) return estadoInicializacion === "ok";
    return false;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 flex h-[92vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white p-0 shadow-2xl border border-slate-200 overflow-hidden font-sans select-none text-slate-800">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight uppercase">
                  Asistente de Restauración
                </h2>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-300 border border-cyan-500/30">
                  SETUP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configura la conexión, verifica la BD y restaura tu copia de seguridad.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEPPER */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-8 py-3">
          {pasos.map((p, idx) => (
            <React.Fragment key={p.num}>
              <button
                type="button"
                onClick={() => {
                  if (p.num < paso || puedeAvanzar()) {
                    setPaso(p.num as PasoAsistente);
                  }
                }}
                className={`flex items-center gap-2 transition-all ${
                  p.num === paso
                    ? "text-slate-900"
                    : p.num < paso
                    ? "text-emerald-600 cursor-pointer"
                    : "text-slate-400 cursor-default"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                    p.num === paso
                      ? "bg-slate-900 text-white shadow-md"
                      : p.num < paso
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {p.num < paso ? <Check className="h-4 w-4" /> : p.num}
                </div>
                <span className="text-xs font-bold hidden sm:inline">{p.label}</span>
              </button>
              {idx < pasos.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded transition-all ${
                    p.num < paso ? "bg-emerald-400" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CUERPO */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60 custom-scrollbar">
          {/* PASO 1 */}
          {paso === 1 && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white shrink-0 shadow-md">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-cyan-950 uppercase tracking-tight">
                      Paso 1: Ingresa las Credenciales de Supabase
                    </h3>
                    <p className="text-xs text-cyan-900 leading-relaxed">
                      Necesitas la <strong>URL</strong> y la <strong>API Key (anon/publishable)</strong> de tu proyecto Supabase.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600">
                    <Cloud className="h-3.5 w-3.5 text-cyan-600" />
                    <span>URL del Proyecto</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bdUrl}
                      onChange={(e) => {
                        setBdUrl(e.target.value);
                        setEstadoConexion("idle");
                      }}
                      placeholder="https://xxxxxxxx.supabase.co"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all pr-10"
                    />
                    {bdUrl && (
                      <button
                        type="button"
                        onClick={() => handleCopiar(bdUrl, "URL")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title="Copiar URL"
                      >
                        {copiado === "URL" ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                    <span>Clave Pública (anon / publishable key)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarKey ? "text" : "password"}
                      value={bdKey}
                      onChange={(e) => {
                        setBdKey(e.target.value);
                        setEstadoConexion("idle");
                      }}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all pr-20"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMostrarKey(!mostrarKey)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                        title={mostrarKey ? "Ocultar" : "Mostrar"}
                      >
                        {mostrarKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      {bdKey && (
                        <button
                          type="button"
                          onClick={() => handleCopiar(bdKey, "API Key")}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                          title="Copiar Key"
                        >
                          {copiado === "API Key" ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Info className="h-4 w-4 text-cyan-600" />
                  <span>¿Dónde encuentro estas credenciales?</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-500 text-[11px]">
                  <li>Ve al <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-cyan-600 underline font-semibold">Panel de Supabase</a></li>
                  <li>Selecciona tu proyecto ➔ <strong>Settings</strong> ➔ <strong>API</strong></li>
                  <li>Copia la <strong>URL</strong> y la <strong>anon (publishable) key</strong></li>
                </ol>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {paso === 2 && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shrink-0 shadow-md">
                    <Plug className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-blue-950 uppercase tracking-tight">
                      Paso 2: Probar Conexión con Supabase
                    </h3>
                    <p className="text-xs text-blue-900 leading-relaxed">
                      Verificaremos que las credenciales ingresadas sean válidas y que tengamos acceso al servidor de Supabase.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">URL del Servidor:</span>
                  <span className="font-mono text-slate-800 font-bold max-w-[320px] truncate">{bdUrl}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500">API Key:</span>
                  <span className="font-mono text-slate-800">{bdKey.slice(0, 15)}••••••{bdKey.slice(-8)}</span>
                </div>
              </div>

              {estadoConexion !== "idle" && (
                <div
                  className={`rounded-2xl border-2 p-4 transition-all ${
                    estadoConexion === "ok" ? "border-emerald-300 bg-emerald-50/60" : "border-rose-300 bg-rose-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                        estadoConexion === "ok" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {estadoConexion === "ok" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase text-slate-700">
                        {estadoConexion === "ok" ? "¡Conexión Exitosa!" : "Fallo de Conexión"}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{mensajeConexion}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleProbarConexion}
                disabled={probandoConexion}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase px-6 py-4 shadow-lg shadow-blue-600/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
              >
                {probandoConexion ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plug className="h-5 w-5" />}
                <span>{probandoConexion ? "Probando..." : "Probar Conexión Ahora"}</span>
              </button>
            </div>
          )}

          {/* PASO 3 */}
          {paso === 3 && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shrink-0 shadow-md">
                    <Database className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-indigo-950 uppercase tracking-tight">
                      Paso 3: Verificar Estructura de la Base de Datos
                    </h3>
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      Verificaremos que las tablas necesarias existan en tu base de datos de Supabase.
                    </p>
                  </div>
                </div>
              </div>

              {estadoInicializacion !== "idle" && (
                <div
                  className={`rounded-2xl border-2 p-4 transition-all ${
                    estadoInicializacion === "ok" ? "border-emerald-300 bg-emerald-50/60" : "border-rose-300 bg-rose-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                        estadoInicializacion === "ok" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {estadoInicializacion === "ok" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black uppercase text-slate-700">
                        {estadoInicializacion === "ok" ? "Base de Datos Verificada" : "Tablas No Encontradas"}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{mensajeInicializacion}</p>
                    </div>
                  </div>

                  {tablasCreadas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-1.5">
                      {tablasCreadas.map((t) => (
                        <div key={t} className="flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="font-mono text-slate-700">{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleInicializarBD}
                disabled={inicializandoBD}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase px-6 py-4 shadow-lg shadow-indigo-600/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
              >
                {inicializandoBD ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
                <span>{inicializandoBD ? mensajeInicializacion : "Verificar Tablas de la Base de Datos"}</span>
              </button>

              {/* Script SQL completo */}
              {estadoInicializacion === "error" && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-white flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-indigo-400" />
                      Script SQL Completo (CMG Eventos)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDescargarSql}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-[10px] font-bold text-white transition-all shadow-xs"
                      >
                        <Download className="h-3 w-3" />
                        Descargar .sql
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopiar(SQL_SCHEMA_PRINCIPAL, "SQL Completo")}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1 text-[10px] font-bold text-white transition-all"
                      >
                        {copiado === "SQL Completo" ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiado === "SQL Completo" ? "¡Copiado!" : "Copiar Script Completo"}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 max-h-56 overflow-y-auto bg-slate-900 border-b border-slate-800">
                    <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre leading-relaxed select-all">
                      {SQL_SCHEMA_PRINCIPAL.trim()}
                    </pre>
                  </div>
                  <div className="px-4 py-3 bg-amber-50 text-[11px] text-amber-900 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <Info className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>Instrucciones para crear la base de datos en Supabase:</span>
                    </div>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                      <li>Haz clic arriba en <strong>"Copiar Script Completo"</strong> (o <strong>"Descargar .sql"</strong>).</li>
                      <li>Abre el panel de tu proyecto en Supabase y entra a la sección <strong>SQL Editor</strong>.</li>
                      <li>Crea una nueva consulta (<strong>"New query"</strong>), pega el script y pulsa <strong>RUN</strong>.</li>
                      <li>Regresa aquí y haz clic en <strong>"Verificar Tablas de la Base de Datos"</strong>.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 4 */}
          {paso === 4 && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shrink-0 shadow-md">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-emerald-950 uppercase tracking-tight">
                      Paso 4: Restaurar Datos desde Copia de Seguridad
                    </h3>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      Carga tu archivo <strong>JSON de copia de seguridad</strong>. Se insertarán los datos en las tablas de tu base de datos de Supabase.
                    </p>
                  </div>
                </div>
              </div>

              {/* Zona de archivo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                  archivoRestaurar
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleSeleccionarArchivo}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      archivoRestaurar ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <FileJson className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-slate-800">
                      {archivoRestaurar ? archivoRestaurar.name : "Seleccionar Archivo de Backup JSON"}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {archivoRestaurar
                        ? `${(archivoRestaurar.size / (1024 * 1024)).toFixed(2)} MB`
                        : "Haz clic aquí para buscar el archivo .json en tu equipo"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumen del backup cargado */}
              {metadataBackup && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Contenido del Archivo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Tablas</span>
                      <span className="font-mono text-sm font-black text-slate-800">{metadataBackup.totalTablas}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Registros</span>
                      <span className="font-mono text-sm font-black text-slate-800">{metadataBackup.totalRegistros}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Estado de restauración */}
              {estadoRestauracion !== "idle" && (
                <div
                  className={`rounded-2xl border-2 p-4 transition-all ${
                    estadoRestauracion === "ok" ? "border-emerald-300 bg-emerald-50/60" : "border-rose-300 bg-rose-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                        estadoRestauracion === "ok" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {estadoRestauracion === "ok" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black uppercase text-slate-700">
                        {estadoRestauracion === "ok" ? "¡Restauración Finalizada!" : "Error en Restauración"}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{progresoRestauracion}</p>
                    </div>
                  </div>

                  {Object.keys(resumenRestauracion).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                      {Object.entries(resumenRestauracion).map(([tabla, count]) => (
                        <div key={tabla} className="flex items-center justify-between text-[11px] bg-white/70 px-2 py-1 rounded">
                          <span className="font-mono text-slate-700 truncate">{tabla}:</span>
                          <span className="font-bold text-emerald-700 font-mono">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleEjecutarRestauracion}
                disabled={!backupData || procesandoRestauracion}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-6 py-4 shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
              >
                {procesandoRestauracion ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span>{procesandoRestauracion ? progresoRestauracion : "Iniciar Restauración de Datos"}</span>
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
          <button
            type="button"
            onClick={() => setPaso((prev) => Math.max(1, prev - 1) as PasoAsistente)}
            disabled={paso === 1 || procesandoRestauracion}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Anterior</span>
          </button>

          <span className="text-[11px] font-medium text-slate-400">
            Paso {paso} de 4
          </span>

          <button
            type="button"
            onClick={() => setPaso((prev) => Math.min(4, prev + 1) as PasoAsistente)}
            disabled={!puedeAvanzar() || paso === 4 || procesandoRestauracion}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-30 transition-all shadow-xs"
          >
            <span>Siguiente</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
