export type UserRole = 'super_admin' | 'coordinador' | 'validador' | 'lider_red';

export interface AdminUser {
  id: string;
  email: string;
  nombre_completo: string;
  telefono?: string | null;
  rol: UserRole;
  red_id?: string | null;
  red_nombre?: string | null;
  cdp_id?: string | null;
  cdp_nombre?: string | null;
  activo: boolean;
  ultimo_acceso?: string | null;
  created_at: string;
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageEvents: boolean;
  canDeleteEvents: boolean;
  canManageRegistrations: boolean;
  canDeleteRegistrations: boolean;
  canManageCatalogs: boolean;
  canManageIntegrations: boolean;
  canViewReports: boolean;
  canScanQR: boolean;
}

export const ROLE_PERMISSIONS_MAP: Record<UserRole, RolePermissions> = {
  super_admin: {
    canManageUsers: true,
    canManageEvents: true,
    canDeleteEvents: true,
    canManageRegistrations: true,
    canDeleteRegistrations: true,
    canManageCatalogs: true,
    canManageIntegrations: true,
    canViewReports: true,
    canScanQR: true,
  },
  coordinador: {
    canManageUsers: false,
    canManageEvents: true,
    canDeleteEvents: false,
    canManageRegistrations: true,
    canDeleteRegistrations: false,
    canManageCatalogs: false,
    canManageIntegrations: false,
    canViewReports: true,
    canScanQR: true,
  },
  validador: {
    canManageUsers: false,
    canManageEvents: false,
    canDeleteEvents: false,
    canManageRegistrations: false,
    canDeleteRegistrations: false,
    canManageCatalogs: false,
    canManageIntegrations: false,
    canViewReports: false,
    canScanQR: true,
  },
  lider_red: {
    canManageUsers: false,
    canManageEvents: false,
    canDeleteEvents: false,
    canManageRegistrations: true,
    canDeleteRegistrations: false,
    canManageCatalogs: false,
    canManageIntegrations: false,
    canViewReports: true,
    canScanQR: false,
  },
};

export const ROLE_LABELS: Record<UserRole, { label: string; badgeClass: string; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    badgeClass: 'bg-purple-100 text-purple-950 border-purple-300 font-extrabold',
    description: 'Acceso total sin restricciones al sistema',
  },
  coordinador: {
    label: 'Coordinador',
    badgeClass: 'bg-teal-100 text-teal-950 border-teal-300 font-extrabold',
    description: 'Gestión de eventos e inscripciones',
  },
  validador: {
    label: 'Logística / Validador QR',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold',
    description: 'Escáner de puerta y control de aforo',
  },
  lider_red: {
    label: 'Líder de Red',
    badgeClass: 'bg-sky-100 text-sky-950 border-sky-300 font-extrabold',
    description: 'Consulta de inscritos de su red o CDP',
  },
};
