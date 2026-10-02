-- ==============================================================================
-- MIGRACIÓN: AGENTE PASTORAL VIRTUAL Y CEREBRO DE MEMORIA ESPIRITUAL
-- Compatible con PostgreSQL y Supabase
-- ==============================================================================

-- 1. Tabla de Sesiones Pastorales (Aislamiento por token de dispositivo)
CREATE TABLE IF NOT EXISTS public.pastoral_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL UNIQUE,
    user_name TEXT,
    summary TEXT,
    last_intent TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Mensajes del Chat
CREATE TABLE IF NOT EXISTS public.pastoral_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.pastoral_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    audio_url TEXT,
    intent TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Cerebro de Memoria Espiritual a Largo Plazo
CREATE TABLE IF NOT EXISTS public.pastoral_spiritual_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.pastoral_chat_sessions(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('prayer_request', 'family_need', 'decision_christ', 'emotional_state', 'interested_event', 'pastoral_note')),
    detail TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para búsqueda veloz por sesión
CREATE INDEX IF NOT EXISTS idx_pastoral_sessions_token ON public.pastoral_chat_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_pastoral_messages_session ON public.pastoral_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_pastoral_memory_session ON public.pastoral_spiritual_memory(session_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.pastoral_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_spiritual_memory ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad:
-- Permitir a usuarios anónimos y autenticados interactuar con sus propias sesiones
CREATE POLICY "Permitir inserción y lectura de sesiones"
ON public.pastoral_chat_sessions
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir gestión de mensajes de chat pastoral"
ON public.pastoral_chat_messages
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir gestión de memoria espiritual"
ON public.pastoral_spiritual_memory
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
