CREATE TABLE public.auditorio_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activo boolean NOT NULL DEFAULT true,
  titulo text NOT NULL DEFAULT 'Alquiler del Auditorio',
  subtitulo text,
  descripcion text,
  precio numeric,
  moneda text NOT NULL DEFAULT 'COP',
  mostrar_precio boolean NOT NULL DEFAULT true,
  texto_tarifas text,
  condiciones text,
  capacidad text,
  direccion text,
  telefono_contacto text,
  correo_contacto text,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auditorio_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditorio_config TO authenticated;
GRANT ALL ON public.auditorio_config TO service_role;

ALTER TABLE public.auditorio_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read auditorio config" ON public.auditorio_config FOR SELECT USING (true);
CREATE POLICY "Authenticated manage auditorio config" ON public.auditorio_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_auditorio_config_updated_at BEFORE UPDATE ON public.auditorio_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.auditorio_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text NOT NULL,
  correo text,
  organizacion text,
  tipo_evento text,
  fecha_evento date,
  hora_inicio text,
  hora_fin text,
  num_asistentes integer,
  mensaje text,
  estado text NOT NULL DEFAULT 'pendiente',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.auditorio_solicitudes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditorio_solicitudes TO authenticated;
GRANT ALL ON public.auditorio_solicitudes TO service_role;

ALTER TABLE public.auditorio_solicitudes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request auditorio" ON public.auditorio_solicitudes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated read auditorio requests" ON public.auditorio_solicitudes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update auditorio requests" ON public.auditorio_solicitudes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete auditorio requests" ON public.auditorio_solicitudes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_auditorio_solicitudes_updated_at BEFORE UPDATE ON public.auditorio_solicitudes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.auditorio_config (titulo, subtitulo, descripcion, texto_tarifas, capacidad)
VALUES ('Alquiler del Auditorio', 'Un espacio amplio y equipado para tu evento', 'Nuestro auditorio está disponible para conferencias, celebraciones, capacitaciones y eventos especiales. Cuenta con sonido, iluminación y espacio cómodo para tus invitados.', 'Consulta tarifas por horas o por jornada completa.', '300 personas');