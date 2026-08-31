-- Migración para el Módulo de Gestión de Pagos y Abonos en Registros de Eventos

DO $$
BEGIN
  -- Agregar campos a la tabla registrations si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'estado_pago') THEN
    ALTER TABLE public.registrations ADD COLUMN estado_pago TEXT NOT NULL DEFAULT 'Pendiente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'monto_pagado') THEN
    ALTER TABLE public.registrations ADD COLUMN monto_pagado NUMERIC NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'monto_pendiente') THEN
    ALTER TABLE public.registrations ADD COLUMN monto_pendiente NUMERIC NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'comprobante_pago_url') THEN
    ALTER TABLE public.registrations ADD COLUMN comprobante_pago_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'notas_pago') THEN
    ALTER TABLE public.registrations ADD COLUMN notas_pago TEXT;
  END IF;

  -- Repetir para la tabla retiro_sanidad_registrations si existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'retiro_sanidad_registrations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retiro_sanidad_registrations' AND column_name = 'estado_pago') THEN
      ALTER TABLE public.retiro_sanidad_registrations ADD COLUMN estado_pago TEXT NOT NULL DEFAULT 'Pendiente';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retiro_sanidad_registrations' AND column_name = 'monto_pagado') THEN
      ALTER TABLE public.retiro_sanidad_registrations ADD COLUMN monto_pagado NUMERIC NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retiro_sanidad_registrations' AND column_name = 'monto_pendiente') THEN
      ALTER TABLE public.retiro_sanidad_registrations ADD COLUMN monto_pendiente NUMERIC NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retiro_sanidad_registrations' AND column_name = 'comprobante_pago_url') THEN
      ALTER TABLE public.retiro_sanidad_registrations ADD COLUMN comprobante_pago_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retiro_sanidad_registrations' AND column_name = 'notas_pago') THEN
      ALTER TABLE public.retiro_sanidad_registrations ADD COLUMN notas_pago TEXT;
    END IF;
  END IF;
END $$;
