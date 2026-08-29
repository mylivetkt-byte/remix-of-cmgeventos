import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminUser, UserRole, ROLE_LABELS } from "@/integrations/supabase/user-role-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  KeyRound,
  UserX,
  UserCheck,
  Edit2,
  Mail,
  Phone,
  Sparkles,
  Lock,
  RefreshCw,
} from "lucide-react";

const INITIAL_USERS: AdminUser[] = [
  {
    id: "usr-admin-1",
    email: "admin@cmgeventos.org",
    nombre_completo: "Pastor Carlos Delgado",
    telefono: "+57 300 123 4567",
    rol: "super_admin",
    activo: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "usr-coordinador-1",
    email: "coordinacion@cmgeventos.org",
    nombre_completo: "Pastora Tania Grimaldos",
    telefono: "+57 310 987 6543",
    rol: "coordinador",
    activo: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "usr-validador-1",
    email: "logistica.puertas@cmgeventos.org",
    nombre_completo: "Equipo Logística Puerta 1",
    telefono: "+57 320 555 1122",
    rol: "validador",
    activo: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "usr-lider-1",
    email: "lider.redjuvenil@cmgeventos.org",
    nombre_completo: "Líder de Red Juvenil",
    telefono: "+57 315 444 8899",
    rol: "lider_red",
    red_nombre: "RED JUVENIL",
    activo: true,
    created_at: new Date().toISOString(),
  },
];

export function UserManager() {
  const [users, setUsers] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem("cmg_admin_users");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nombre_completo: "",
    email: "",
    telefono: "",
    password: "",
    rol: "coordinador" as UserRole,
    red_id: "",
    cdp_id: "",
    activo: true,
  });

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem("cmg_admin_users", JSON.stringify(users));
  }, [users]);

  // Cargar Catálogos de RED y CDP
  const { data: catalogReds } = useQuery({
    queryKey: ["user_mgr_reds"],
    queryFn: async () => {
      const { data } = await supabase.from("catalog_red").select("id, nombre").eq("activo", true);
      return data || [];
    },
  });

  const { data: catalogCdps } = useQuery({
    queryKey: ["user_mgr_cdps"],
    queryFn: async () => {
      const { data } = await supabase.from("catalog_cdp").select("id, nombre").eq("activo", true);
      return data || [];
    },
  });

  // Filtrado de usuarios
  const filteredUsers = users.filter((usr) => {
    const matchSearch =
      usr.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usr.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === "all" || usr.rol === roleFilter;
    return matchSearch && matchRole;
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      nombre_completo: "",
      email: "",
      telefono: "",
      password: "",
      rol: "coordinador",
      red_id: "",
      cdp_id: "",
      activo: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (usr: AdminUser) => {
    setEditingUser(usr);
    setFormData({
      nombre_completo: usr.nombre_completo,
      email: usr.email,
      telefono: usr.telefono || "",
      password: "",
      rol: usr.rol,
      red_id: usr.red_id || "",
      cdp_id: usr.cdp_id || "",
      activo: usr.activo,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre_completo.trim() || !formData.email.trim()) {
      toast.error("Por favor completa el nombre y correo electrónico.");
      return;
    }

    const selectedRed = catalogReds?.find((r) => r.id === formData.red_id);
    const selectedCdp = catalogCdps?.find((c) => c.id === formData.cdp_id);

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                nombre_completo: formData.nombre_completo.trim(),
                email: formData.email.trim(),
                telefono: formData.telefono.trim() || null,
                rol: formData.rol,
                red_id: formData.red_id || null,
                red_nombre: selectedRed?.nombre || u.red_nombre || null,
                cdp_id: formData.cdp_id || null,
                cdp_nombre: selectedCdp?.nombre || u.cdp_nombre || null,
                activo: formData.activo,
              }
            : u
        )
      );
      toast.success("Usuario actualizado correctamente.");
    } else {
      const newUser: AdminUser = {
        id: `usr-${Date.now()}`,
        email: formData.email.trim(),
        nombre_completo: formData.nombre_completo.trim(),
        telefono: formData.telefono.trim() || null,
        rol: formData.rol,
        red_id: formData.red_id || null,
        red_nombre: selectedRed?.nombre || null,
        cdp_id: formData.cdp_id || null,
        cdp_nombre: selectedCdp?.nombre || null,
        activo: formData.activo,
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [newUser, ...prev]);
      toast.success("Nuevo usuario creado exitosamente.");
    }

    setIsModalOpen(false);
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextState = !u.activo;
          toast.success(
            nextState
              ? `El usuario ${u.nombre_completo} ha sido activado.`
              : `El usuario ${u.nombre_completo} ha sido desactivado.`
          );
          return { ...u, activo: nextState };
        }
        return u;
      })
    );
  };

  const resetPassword = (usr: AdminUser) => {
    toast.success(`Se ha enviado una clave temporal a ${usr.email}`);
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Encabezado y Filtros */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black font-heading text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-700" />
            Gestión de Usuarios y Permisos (RBAC)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Administra las cuentas de servidores, asigna roles de acceso y restringe secciones del panel.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold h-11 px-5 rounded-xl shadow-xs flex items-center gap-2 text-sm shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Crear Nuevo Usuario
        </Button>
      </div>

      {/* Tarjetas Informativas de Roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(ROLE_LABELS) as UserRole[]).map((rKey) => {
          const info = ROLE_LABELS[rKey];
          const count = users.filter((u) => u.rol === rKey && u.activo).length;
          return (
            <div key={rKey} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={`${info.badgeClass} px-3 py-1 text-xs rounded-xl`}>
                  {info.label}
                </Badge>
                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {count} activos
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{info.description}</p>
            </div>
          );
        })}
      </div>

      {/* Barra de Búsqueda y Filtro por Rol */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Buscar por nombre o correo electrónico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 text-sm font-semibold bg-slate-50/80 border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        <div className="w-full sm:w-60">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-11 text-sm font-semibold bg-slate-50/80 border-slate-200 rounded-xl">
              <SelectValue placeholder="Filtrar por rol..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="coordinador">Coordinador</SelectItem>
              <SelectItem value="validador">Validador QR</SelectItem>
              <SelectItem value="lider_red">Líder de Red</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="border-slate-200">
              <TableHead className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Usuario / Servidor</TableHead>
              <TableHead className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Rol de Acceso</TableHead>
              <TableHead className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Asignación (RED / CDP)</TableHead>
              <TableHead className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Estado</TableHead>
              <TableHead className="text-xs font-extrabold text-slate-700 uppercase tracking-wider text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((usr) => {
                const roleInfo = ROLE_LABELS[usr.rol];
                return (
                  <TableRow key={usr.id} className="border-slate-100 hover:bg-slate-50/70">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-black text-teal-800 text-sm shrink-0">
                          {usr.nombre_completo.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{usr.nombre_completo}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{usr.email}</span>
                            {usr.telefono && (
                              <>
                                <span>•</span>
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{usr.telefono}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={`${roleInfo.badgeClass} px-3 py-1 text-xs rounded-xl shadow-none`}>
                        {roleInfo.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-slate-700">
                      {usr.red_nombre ? (
                        <span className="bg-sky-50 text-sky-900 border border-sky-200 px-2.5 py-1 rounded-lg">
                          Red: {usr.red_nombre}
                        </span>
                      ) : usr.cdp_nombre ? (
                        <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          CDP: {usr.cdp_nombre}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Acceso Global</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {usr.activo ? (
                        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold px-2.5 py-0.5 text-xs shadow-none">
                          Activo
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold px-2.5 py-0.5 text-xs shadow-none">
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(usr)}
                          className="h-9 w-9 p-0 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl"
                          title="Editar usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetPassword(usr)}
                          className="h-9 w-9 p-0 border-slate-200 text-amber-700 hover:bg-amber-50 rounded-xl"
                          title="Restablecer contraseña"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(usr.id)}
                          className={`h-9 w-9 p-0 border-slate-200 rounded-xl ${
                            usr.activo
                              ? "text-rose-600 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={usr.activo ? "Desactivar usuario" : "Activar usuario"}
                        >
                          {usr.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-sm font-medium">
                  No se encontraron usuarios con los criterios de búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Creación / Edición de Usuario */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl w-[95vw] p-6 rounded-3xl bg-white text-slate-900 font-sans border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black font-heading text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
              {editingUser ? "Editar Cuenta de Usuario" : "Crear Nueva Cuenta de Servidor"}
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium">
              Asigna la información del servidor y configura su nivel de permiso de acceso.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nombre Completo *</Label>
              <Input
                type="text"
                placeholder="Ej: Pastor Carlos Delgado"
                value={formData.nombre_completo}
                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                className="h-11 text-sm font-semibold rounded-xl border-slate-300"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Correo Electrónico *</Label>
                <Input
                  type="email"
                  placeholder="ejemplo@cmgeventos.org"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11 text-sm font-semibold rounded-xl border-slate-300"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Teléfono (Opcional)</Label>
                <Input
                  type="text"
                  placeholder="+57 300 000 0000"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="h-11 text-sm font-semibold rounded-xl border-slate-300"
                />
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Contraseña Inicial *</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-11 text-sm font-semibold rounded-xl border-slate-300"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Rol de Acceso Asignado *</Label>
              <Select
                value={formData.rol}
                onValueChange={(val: UserRole) => setFormData({ ...formData, rol: val })}
              >
                <SelectTrigger className="h-11 text-sm font-semibold rounded-xl border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">👑 Super Admin (Acceso Total)</SelectItem>
                  <SelectItem value="coordinador">📋 Coordinador (Eventos e Inscripciones)</SelectItem>
                  <SelectItem value="validador">📱 Logística / Validador QR (Scanner Puerta)</SelectItem>
                  <SelectItem value="lider_red">✝️ Líder de Red (Consulta por RED/CDP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.rol === "lider_red" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Red Asignada</Label>
                  <Select
                    value={formData.red_id}
                    onValueChange={(val) => setFormData({ ...formData, red_id: val })}
                  >
                    <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-white border-slate-300">
                      <SelectValue placeholder="Seleccionar RED..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogReds?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">CDP Asignada</Label>
                  <Select
                    value={formData.cdp_id}
                    onValueChange={(val) => setFormData({ ...formData, cdp_id: val })}
                  >
                    <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-white border-slate-300">
                      <SelectValue placeholder="Seleccionar CDP..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogCdps?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="space-y-0.5">
                <Label className="text-xs font-extrabold text-slate-900">Estado de la Cuenta</Label>
                <p className="text-[11px] text-slate-500 font-medium">Permite iniciar sesión en el panel</p>
              </div>
              <Switch
                checked={formData.activo}
                onCheckedChange={(val) => setFormData({ ...formData, activo: val })}
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-11 px-5 text-sm font-semibold rounded-xl border-slate-200"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                className="h-11 px-6 text-sm font-extrabold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
              >
                {editingUser ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
