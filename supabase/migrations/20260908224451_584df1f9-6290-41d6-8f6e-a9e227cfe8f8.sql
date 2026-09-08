ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS proteccion_datos text,
  ADD COLUMN IF NOT EXISTS mensaje_personalizado text,
  ADD COLUMN IF NOT EXISTS bloques_orden jsonb NOT NULL DEFAULT '["mensaje","formulario","proteccion"]'::jsonb;