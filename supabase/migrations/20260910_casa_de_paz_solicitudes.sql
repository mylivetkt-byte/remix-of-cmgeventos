-- Create table for Casa de Paz contact requests
CREATE TABLE IF NOT EXISTS public.casa_de_paz_solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT NOT NULL,
    barrio TEXT NOT NULL,
    correo TEXT,
    estado TEXT DEFAULT 'pendiente',
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.casa_de_paz_solicitudes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated users to submit requests
CREATE POLICY "Permitir inserción pública de solicitudes de Casa de Paz"
ON public.casa_de_paz_solicitudes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow authenticated users / admins to view and manage requests
CREATE POLICY "Permitir lectura para usuarios autenticados"
ON public.casa_de_paz_solicitudes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir actualización para usuarios autenticados"
ON public.casa_de_paz_solicitudes
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Permitir eliminación para usuarios autenticados"
ON public.casa_de_paz_solicitudes
FOR DELETE
TO authenticated
USING (true);
