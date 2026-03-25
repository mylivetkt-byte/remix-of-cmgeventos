/*
  # Add attendance field to registrations

  1. New Columns
    - `asistio` (boolean) - Tracks if the person attended the event
    - `fecha_asistencia` (timestamp) - Records when they checked in
  
  2. Updated
    - `registrations` table now has attendance tracking fields

  3. Important Notes
    - Default value is false (not attended yet)
    - Timestamp is set when checking in
    - Will be used for QR code scanning at event entrance
*/

ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS asistio BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_asistencia TIMESTAMPTZ;