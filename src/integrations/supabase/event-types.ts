export interface EventItem {
  id: string;
  slug: string;
  nombre: string;
  descripcion?: string | null;
  fecha_evento?: string | null;
  lugar_evento?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  color_primario?: string | null;
  color_secundario?: string | null;
  activo: boolean;
  requiere_checkin: boolean;
  asunto_correo?: string | null;
  mensaje_correo?: string | null;
  mensaje_whatsapp?: string | null;
  correo_remitente?: string | null;
  barrio_como_combo?: boolean | null;
  invitado_obligatorio?: boolean | null;
  es_de_pago?: boolean | null;
  precio?: number | null;
  moneda?: string | null;
  instrucciones_pago?: string | null;
  requiere_comprobante?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventFieldConfig {
  id: string;
  event_id: string;
  field_key: string;
  field_type: 'text' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'phone' | 'email';
  label: string;
  placeholder?: string | null;
  help_text?: string | null;
  required: boolean;
  orden: number;
  options?: any;
  created_at?: string;
}
