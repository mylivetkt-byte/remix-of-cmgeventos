-- Migración para soporte de Eventos de Pago y Comprobantes de Registro

-- 1. Agregar campos de costo y pago en la tabla 'events'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'es_de_pago') THEN
    ALTER TABLE public.events ADD COLUMN es_de_pago BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'precio') THEN
    ALTER TABLE public.events ADD COLUMN precio NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'moneda') THEN
    ALTER TABLE public.events ADD COLUMN moneda TEXT DEFAULT 'COP';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'instrucciones_pago') THEN
    ALTER TABLE public.events ADD COLUMN instrucciones_pago TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'requiere_comprobante') THEN
    ALTER TABLE public.events ADD COLUMN requiere_comprobante BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Agregar campos de estado de pago y comprobante en 'registrations'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'comprobante_pago_url') THEN
    ALTER TABLE public.registrations ADD COLUMN comprobante_pago_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'monto_pagado') THEN
    ALTER TABLE public.registrations ADD COLUMN monto_pagado NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'estado_pago') THEN
    ALTER TABLE public.registrations ADD COLUMN estado_pago TEXT DEFAULT 'gratis';
  END IF;
END $$;
