export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_secrets: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      catalog_barrio: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_cdp: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          red_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          red_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          red_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_cdp_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_estado_civil: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_red: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_sexo: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_tipo_documento: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_catalog_values: {
        Row: {
          activo: boolean
          catalog_key: string
          created_at: string
          event_id: string
          id: string
          label: string
          orden: number
          value: string
        }
        Insert: {
          activo?: boolean
          catalog_key: string
          created_at?: string
          event_id: string
          id?: string
          label: string
          orden?: number
          value: string
        }
        Update: {
          activo?: boolean
          catalog_key?: string
          created_at?: string
          event_id?: string
          id?: string
          label?: string
          orden?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_catalog_values_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_config: {
        Row: {
          asunto_correo: string
          barrio_como_combo: boolean
          created_at: string
          descripcion: string | null
          fecha_evento: string | null
          id: string
          invitado_obligatorio: boolean
          logo_url: string | null
          lugar_evento: string | null
          mensaje_correo: string
          mensaje_whatsapp: string
          nombre_evento: string
          updated_at: string
        }
        Insert: {
          asunto_correo?: string
          barrio_como_combo?: boolean
          created_at?: string
          descripcion?: string | null
          fecha_evento?: string | null
          id?: string
          invitado_obligatorio?: boolean
          logo_url?: string | null
          lugar_evento?: string | null
          mensaje_correo?: string
          mensaje_whatsapp?: string
          nombre_evento?: string
          updated_at?: string
        }
        Update: {
          asunto_correo?: string
          barrio_como_combo?: boolean
          created_at?: string
          descripcion?: string | null
          fecha_evento?: string | null
          id?: string
          invitado_obligatorio?: boolean
          logo_url?: string | null
          lugar_evento?: string | null
          mensaje_correo?: string
          mensaje_whatsapp?: string
          nombre_evento?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_field_configs: {
        Row: {
          created_at: string
          event_id: string
          field_key: string
          field_type: Database["public"]["Enums"]["event_field_type"]
          help_text: string | null
          id: string
          label: string
          max_length: number | null
          min_length: number | null
          options: Json | null
          orden: number
          pattern: string | null
          placeholder: string | null
          required: boolean
        }
        Insert: {
          created_at?: string
          event_id: string
          field_key: string
          field_type?: Database["public"]["Enums"]["event_field_type"]
          help_text?: string | null
          id?: string
          label: string
          max_length?: number | null
          min_length?: number | null
          options?: Json | null
          orden?: number
          pattern?: string | null
          placeholder?: string | null
          required?: boolean
        }
        Update: {
          created_at?: string
          event_id?: string
          field_key?: string
          field_type?: Database["public"]["Enums"]["event_field_type"]
          help_text?: string | null
          id?: string
          label?: string
          max_length?: number | null
          min_length?: number | null
          options?: Json | null
          orden?: number
          pattern?: string | null
          placeholder?: string | null
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_field_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_default_registrations: {
        Row: {
          apellidos: string
          asistio: boolean
          barrio: string
          bautizo: string | null
          cdp_id: string
          celular: string | null
          ciudad: string | null
          correo: string
          created_at: string
          direccion: string
          edad: number
          estado_civil_id: string
          event_id: string | null
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          nombre_invitador: string | null
          nombres: string
          numero_documento: string
          pais: string | null
          participo_previo: boolean | null
          pdf_url: string | null
          primer_apellido: string | null
          qr_code: string | null
          red_id: string
          segundo_apellido: string | null
          sexo_id: string
          telefono: string
          tipo_documento_id: string
          updated_at: string
        }
        Insert: {
          apellidos: string
          asistio?: boolean
          barrio: string
          bautizo?: string | null
          cdp_id: string
          celular?: string | null
          ciudad?: string | null
          correo: string
          created_at?: string
          direccion: string
          edad: number
          estado_civil_id: string
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          nombre_invitador?: string | null
          nombres: string
          numero_documento: string
          pais?: string | null
          participo_previo?: boolean | null
          pdf_url?: string | null
          primer_apellido?: string | null
          qr_code?: string | null
          red_id: string
          segundo_apellido?: string | null
          sexo_id: string
          telefono: string
          tipo_documento_id: string
          updated_at?: string
        }
        Update: {
          apellidos?: string
          asistio?: boolean
          barrio?: string
          bautizo?: string | null
          cdp_id?: string
          celular?: string | null
          ciudad?: string | null
          correo?: string
          created_at?: string
          direccion?: string
          edad?: number
          estado_civil_id?: string
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          nombre_invitador?: string | null
          nombres?: string
          numero_documento?: string
          pais?: string | null
          participo_previo?: boolean | null
          pdf_url?: string | null
          primer_apellido?: string | null
          qr_code?: string | null
          red_id?: string
          segundo_apellido?: string | null
          sexo_id?: string
          telefono?: string
          tipo_documento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_cdp_id_fkey"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_estado_civil_id_fkey"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_sexo_id_fkey"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_entrenamiento_intensivo_para_lideres_cdp_registrations: {
        Row: {
          apellidos: string
          asistio: boolean
          barrio: string
          cdp_id: string | null
          correo: string
          created_at: string
          direccion: string
          edad: number
          estado_civil_id: string | null
          event_id: string | null
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          nombre_invitador: string | null
          nombres: string
          numero_documento: string
          pdf_url: string | null
          qr_code: string | null
          red_id: string | null
          sexo_id: string | null
          telefono: string
          tipo_documento_id: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          asistio?: boolean
          barrio: string
          cdp_id?: string | null
          correo: string
          created_at?: string
          direccion: string
          edad: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          nombre_invitador?: string | null
          nombres: string
          numero_documento: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          asistio?: boolean
          barrio?: string
          cdp_id?: string | null
          correo?: string
          created_at?: string
          direccion?: string
          edad?: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          nombre_invitador?: string | null
          nombres?: string
          numero_documento?: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono?: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_entrenamiento_intensivo_para_lide_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_entrenamiento_intensivo_para_lidere_estado_civil_id_fkey"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_entrenamiento_intensivo_para_lideres_cdp_r_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_entrenamiento_intensivo_para_lideres_cdp_re_sexo_id_fkey"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_entrenamiento_intensivo_para_lideres_cdp_reg_cdp_id_fkey"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_entrenamiento_intensivo_para_lideres_cdp_reg_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_fiesta_de_bienvenida_registrations: {
        Row: {
          apellidos: string
          asistio: boolean
          barrio: string
          cdp_id: string | null
          correo: string
          created_at: string
          direccion: string
          edad: number
          estado_civil_id: string | null
          event_id: string | null
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          nombre_invitador: string | null
          nombres: string
          numero_documento: string
          pdf_url: string | null
          qr_code: string | null
          red_id: string | null
          sexo_id: string | null
          telefono: string
          tipo_documento_id: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          asistio?: boolean
          barrio: string
          cdp_id?: string | null
          correo: string
          created_at?: string
          direccion: string
          edad: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          nombre_invitador?: string | null
          nombres: string
          numero_documento: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          asistio?: boolean
          barrio?: string
          cdp_id?: string | null
          correo?: string
          created_at?: string
          direccion?: string
          edad?: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          nombre_invitador?: string | null
          nombres?: string
          numero_documento?: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono?: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_fiesta_de_bienvenida_registration_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_fiesta_de_bienvenida_registrations_cdp_id_fkey"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_fiesta_de_bienvenida_registrations_estado_civil_id_fkey"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_fiesta_de_bienvenida_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_fiesta_de_bienvenida_registrations_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_fiesta_de_bienvenida_registrations_sexo_id_fkey"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_retiro_de_lideres_de_casa_de_paz_registrations: {
        Row: {
          apellidos: string
          asistio: boolean
          barrio: string
          cdp_id: string | null
          correo: string
          created_at: string
          direccion: string
          edad: number
          estado_civil_id: string | null
          event_id: string | null
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          nombre_invitador: string | null
          nombres: string
          numero_documento: string
          pdf_url: string | null
          qr_code: string | null
          red_id: string | null
          sexo_id: string | null
          telefono: string
          tipo_documento_id: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          asistio?: boolean
          barrio: string
          cdp_id?: string | null
          correo: string
          created_at?: string
          direccion: string
          edad: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          nombre_invitador?: string | null
          nombres: string
          numero_documento: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          asistio?: boolean
          barrio?: string
          cdp_id?: string | null
          correo?: string
          created_at?: string
          direccion?: string
          edad?: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          nombre_invitador?: string | null
          nombres?: string
          numero_documento?: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono?: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_retiro_de_lideres_de_casa_de_paz__tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_lideres_de_casa_de_paz_re_estado_civil_id_fkey"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_lideres_de_casa_de_paz_registrat_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_lideres_de_casa_de_paz_registrati_sexo_id_fkey"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_lideres_de_casa_de_paz_registratio_cdp_id_fkey"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_lideres_de_casa_de_paz_registratio_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_retiro_de_sanidad_interior_y_liberacion_registrations: {
        Row: {
          apellidos: string
          asistio: boolean
          barrio: string
          cdp_id: string | null
          correo: string
          created_at: string
          direccion: string
          edad: number
          estado_civil_id: string | null
          event_id: string | null
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          nombre_invitador: string | null
          nombres: string
          numero_documento: string
          pdf_url: string | null
          qr_code: string | null
          red_id: string | null
          sexo_id: string | null
          telefono: string
          tipo_documento_id: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          asistio?: boolean
          barrio: string
          cdp_id?: string | null
          correo: string
          created_at?: string
          direccion: string
          edad: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          nombre_invitador?: string | null
          nombres: string
          numero_documento: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          asistio?: boolean
          barrio?: string
          cdp_id?: string | null
          correo?: string
          created_at?: string
          direccion?: string
          edad?: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          nombre_invitador?: string | null
          nombres?: string
          numero_documento?: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono?: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_retiro_de_sanidad_interior_y_libe_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_sanidad_interior_y_libera_estado_civil_id_fkey"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_sanidad_interior_y_liberacion_re_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_sanidad_interior_y_liberacion_reg_sexo_id_fkey"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_sanidad_interior_y_liberacion_regi_cdp_id_fkey"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_retiro_de_sanidad_interior_y_liberacion_regi_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_seminario_biblico_registrations: {
        Row: {
          apellidos: string
          asistio: boolean
          barrio: string
          cdp_id: string | null
          correo: string
          created_at: string
          direccion: string
          edad: number
          estado_civil_id: string | null
          event_id: string | null
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          nombre_invitador: string | null
          nombres: string
          numero_documento: string
          pdf_url: string | null
          qr_code: string | null
          red_id: string | null
          sexo_id: string | null
          telefono: string
          tipo_documento_id: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          asistio?: boolean
          barrio: string
          cdp_id?: string | null
          correo: string
          created_at?: string
          direccion: string
          edad: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          nombre_invitador?: string | null
          nombres: string
          numero_documento: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          asistio?: boolean
          barrio?: string
          cdp_id?: string | null
          correo?: string
          created_at?: string
          direccion?: string
          edad?: number
          estado_civil_id?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          nombre_invitador?: string | null
          nombres?: string
          numero_documento?: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string | null
          sexo_id?: string | null
          telefono?: string
          tipo_documento_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_seminario_biblico_registrations_cdp_id_fkey"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_seminario_biblico_registrations_estado_civil_id_fkey"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_seminario_biblico_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_seminario_biblico_registrations_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_seminario_biblico_registrations_sexo_id_fkey"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_seminario_biblico_registrations_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          activo: boolean
          asunto_correo: string
          banner_url: string | null
          barrio_como_combo: boolean
          color_primario: string
          color_secundario: string
          correo_remitente: string
          created_at: string
          descripcion: string | null
          es_de_pago: boolean | null
          fecha: string | null
          fecha_evento: string | null
          id: string
          instrucciones_pago: string | null
          invitado_obligatorio: boolean
          logo_header_url: string | null
          logo_url: string | null
          lugar: string | null
          lugar_evento: string | null
          mensaje_correo: string
          mensaje_whatsapp: string
          moneda: string | null
          nombre: string
          precio: number | null
          requiere_checkin: boolean
          requiere_comprobante: boolean | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          asunto_correo?: string
          banner_url?: string | null
          barrio_como_combo?: boolean
          color_primario?: string
          color_secundario?: string
          correo_remitente?: string
          created_at?: string
          descripcion?: string | null
          es_de_pago?: boolean | null
          fecha?: string | null
          fecha_evento?: string | null
          id?: string
          instrucciones_pago?: string | null
          invitado_obligatorio?: boolean
          logo_header_url?: string | null
          logo_url?: string | null
          lugar?: string | null
          lugar_evento?: string | null
          mensaje_correo?: string
          mensaje_whatsapp?: string
          moneda?: string | null
          nombre?: string
          precio?: number | null
          requiere_checkin?: boolean
          requiere_comprobante?: boolean | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          asunto_correo?: string
          banner_url?: string | null
          barrio_como_combo?: boolean
          color_primario?: string
          color_secundario?: string
          correo_remitente?: string
          created_at?: string
          descripcion?: string | null
          es_de_pago?: boolean | null
          fecha?: string | null
          fecha_evento?: string | null
          id?: string
          instrucciones_pago?: string | null
          invitado_obligatorio?: boolean
          logo_header_url?: string | null
          logo_url?: string | null
          lugar?: string | null
          lugar_evento?: string | null
          mensaje_correo?: string
          mensaje_whatsapp?: string
          moneda?: string | null
          nombre?: string
          precio?: number | null
          requiere_checkin?: boolean
          requiere_comprobante?: boolean | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          apellidos: string
          asistio: boolean | null
          barrio: string
          cdp_id: string
          comprobante_pago_url: string | null
          correo: string
          created_at: string
          direccion: string
          edad: number
          estado_civil_id: string
          estado_pago: string | null
          event_id: string | null
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          monto_pagado: number | null
          monto_pendiente: number
          nombre_invitador: string | null
          nombres: string
          notas_pago: string | null
          numero_documento: string
          pdf_url: string | null
          qr_code: string | null
          red_id: string
          sexo_id: string
          telefono: string
          tipo_documento_id: string
          updated_at: string
        }
        Insert: {
          apellidos: string
          asistio?: boolean | null
          barrio: string
          cdp_id: string
          comprobante_pago_url?: string | null
          correo: string
          created_at?: string
          direccion: string
          edad: number
          estado_civil_id: string
          estado_pago?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          monto_pagado?: number | null
          monto_pendiente?: number
          nombre_invitador?: string | null
          nombres: string
          notas_pago?: string | null
          numero_documento: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id: string
          sexo_id: string
          telefono: string
          tipo_documento_id: string
          updated_at?: string
        }
        Update: {
          apellidos?: string
          asistio?: boolean | null
          barrio?: string
          cdp_id?: string
          comprobante_pago_url?: string | null
          correo?: string
          created_at?: string
          direccion?: string
          edad?: number
          estado_civil_id?: string
          estado_pago?: string | null
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          monto_pagado?: number | null
          monto_pendiente?: number
          nombre_invitador?: string | null
          nombres?: string
          notas_pago?: string | null
          numero_documento?: string
          pdf_url?: string | null
          qr_code?: string | null
          red_id?: string
          sexo_id?: string
          telefono?: string
          tipo_documento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_cdp_id_fkey1"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_estado_civil_id_fkey1"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_red_id_fkey1"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_sexo_id_fkey1"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_tipo_documento_id_fkey1"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      retiro_sanidad_2026_registrations: {
        Row: {
          asistio: boolean
          barrio: string | null
          bautizo: string
          cdp_id: string
          celular: string
          ciudad: string
          created_at: string
          direccion: string | null
          edad: number
          estado_civil_id: string
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          nombre_invitador: string | null
          nombres: string
          numero_documento: string
          pais: string
          participo_previo: boolean
          pdf_url: string | null
          primer_apellido: string
          qr_code: string | null
          red_id: string
          segundo_apellido: string | null
          sexo_id: string
          tipo_documento_id: string
          updated_at: string
        }
        Insert: {
          asistio?: boolean
          barrio?: string | null
          bautizo: string
          cdp_id: string
          celular: string
          ciudad: string
          created_at?: string
          direccion?: string | null
          edad: number
          estado_civil_id: string
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          nombre_invitador?: string | null
          nombres: string
          numero_documento: string
          pais: string
          participo_previo: boolean
          pdf_url?: string | null
          primer_apellido: string
          qr_code?: string | null
          red_id: string
          segundo_apellido?: string | null
          sexo_id: string
          tipo_documento_id: string
          updated_at?: string
        }
        Update: {
          asistio?: boolean
          barrio?: string | null
          bautizo?: string
          cdp_id?: string
          celular?: string
          ciudad?: string
          created_at?: string
          direccion?: string | null
          edad?: number
          estado_civil_id?: string
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          nombre_invitador?: string | null
          nombres?: string
          numero_documento?: string
          pais?: string
          participo_previo?: boolean
          pdf_url?: string | null
          primer_apellido?: string
          qr_code?: string | null
          red_id?: string
          segundo_apellido?: string | null
          sexo_id?: string
          tipo_documento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retiro_sanidad_2026_registrations_cdp_id_fkey"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_2026_registrations_estado_civil_id_fkey"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_2026_registrations_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_2026_registrations_sexo_id_fkey"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_2026_registrations_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      retiro_sanidad_registrations: {
        Row: {
          asistio: boolean
          barrio: string
          bautizo: string
          cdp_id: string
          celular: string
          ciudad: string
          comprobante_pago_url: string | null
          correo: string
          created_at: string
          direccion: string
          edad: number
          estado_civil_id: string
          estado_pago: string
          event_id: string | null
          fecha_asistencia: string | null
          fecha_nacimiento: string
          id: string
          iglesia_cobertura: string | null
          monto_pagado: number
          monto_pendiente: number
          nombres: string
          notas_pago: string | null
          numero_documento: string
          pais: string
          participo_previo: boolean
          pdf_url: string | null
          primer_apellido: string
          qr_code: string | null
          red_id: string
          segundo_apellido: string | null
          sexo_id: string
          tipo_documento_id: string
          updated_at: string
        }
        Insert: {
          asistio?: boolean
          barrio: string
          bautizo: string
          cdp_id: string
          celular: string
          ciudad?: string
          comprobante_pago_url?: string | null
          correo: string
          created_at?: string
          direccion: string
          edad: number
          estado_civil_id: string
          estado_pago?: string
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento: string
          id?: string
          iglesia_cobertura?: string | null
          monto_pagado?: number
          monto_pendiente?: number
          nombres: string
          notas_pago?: string | null
          numero_documento: string
          pais?: string
          participo_previo?: boolean
          pdf_url?: string | null
          primer_apellido: string
          qr_code?: string | null
          red_id: string
          segundo_apellido?: string | null
          sexo_id: string
          tipo_documento_id: string
          updated_at?: string
        }
        Update: {
          asistio?: boolean
          barrio?: string
          bautizo?: string
          cdp_id?: string
          celular?: string
          ciudad?: string
          comprobante_pago_url?: string | null
          correo?: string
          created_at?: string
          direccion?: string
          edad?: number
          estado_civil_id?: string
          estado_pago?: string
          event_id?: string | null
          fecha_asistencia?: string | null
          fecha_nacimiento?: string
          id?: string
          iglesia_cobertura?: string | null
          monto_pagado?: number
          monto_pendiente?: number
          nombres?: string
          notas_pago?: string | null
          numero_documento?: string
          pais?: string
          participo_previo?: boolean
          pdf_url?: string | null
          primer_apellido?: string
          qr_code?: string | null
          red_id?: string
          segundo_apellido?: string | null
          sexo_id?: string
          tipo_documento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retiro_sanidad_registrations_cdp_id_fkey"
            columns: ["cdp_id"]
            isOneToOne: false
            referencedRelation: "catalog_cdp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_registrations_estado_civil_id_fkey"
            columns: ["estado_civil_id"]
            isOneToOne: false
            referencedRelation: "catalog_estado_civil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_registrations_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "catalog_red"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_registrations_sexo_id_fkey"
            columns: ["sexo_id"]
            isOneToOne: false
            referencedRelation: "catalog_sexo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiro_sanidad_registrations_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "catalog_tipo_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_event_registration_table: {
        Args: { event_slug: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      event_field_type:
        | "text"
        | "select"
        | "radio"
        | "checkbox"
        | "date"
        | "number"
        | "phone"
        | "email"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      event_field_type: [
        "text",
        "select",
        "radio",
        "checkbox",
        "date",
        "number",
        "phone",
        "email",
      ],
    },
  },
} as const
