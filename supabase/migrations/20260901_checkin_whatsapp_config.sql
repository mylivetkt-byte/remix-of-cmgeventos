-- Migración para Configuración de Mensaje de WhatsApp y PDF Adjunto en Check-in por Evento

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'enviar_whatsapp_checkin') THEN
    ALTER TABLE public.events ADD COLUMN enviar_whatsapp_checkin BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'mensaje_whatsapp_checkin') THEN
    ALTER TABLE public.events ADD COLUMN mensaje_whatsapp_checkin TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'pdf_whatsapp_checkin_url') THEN
    ALTER TABLE public.events ADD COLUMN pdf_whatsapp_checkin_url TEXT;
  END IF;
END $$;
