-- Migración de Corrección Completa: Garantizar todas las columnas en la tabla 'events'

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS fecha_evento TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lugar_evento TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS color_primario TEXT DEFAULT '#083E30';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS color_secundario TEXT DEFAULT '#CFAA37';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS es_de_pago BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS precio NUMERIC DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'COP';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS instrucciones_pago TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS requiere_comprobante BOOLEAN DEFAULT false;
