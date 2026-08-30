-- Migración para permitir que un mismo usuario se registre a MÚLTIPLES EVENTOS DIFERENTES
-- Eliminar la restricción de clave única antigua en registrations (que aplicaba a nivel global)

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'registrations' 
          AND constraint_type = 'UNIQUE'
          AND (constraint_name LIKE '%tipo_documento%' OR constraint_name LIKE '%numero_documento%')
    ) LOOP
        EXECUTE 'ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Agregar restricción multi-evento: Un usuario sólo no se puede duplicar EN EL MISMO EVENTO
ALTER TABLE public.registrations 
  DROP CONSTRAINT IF EXISTS registrations_event_id_tipo_doc_num_doc_key;

ALTER TABLE public.registrations 
  ADD CONSTRAINT registrations_event_id_tipo_doc_num_doc_key 
  UNIQUE (event_id, tipo_documento_id, numero_documento);
