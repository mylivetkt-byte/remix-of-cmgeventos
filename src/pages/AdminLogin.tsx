import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Lock, Database } from "lucide-react";
import { toast } from "sonner";
import { AsistenteRestauracionModal } from "@/components/admin/AsistenteRestauracionModal";
import { PinAdminModal } from "@/components/admin/PinAdminModal";

const AdminLogin = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [asistenteOpen, setAsistenteOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Sesión iniciada");
      navigate("/admin", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Error al iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm animate-fade-in shadow-xl border-border/80">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="font-heading text-xl">Panel Administrador</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@correo.com"
                className="form-field-mobile"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-field-mobile"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full font-bold" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Iniciar Sesión
            </Button>
          </form>

          {/* Botón Asistente de Restauración y Conexión BD */}
          <div className="mt-5 pt-4 border-t border-border flex justify-center">
            <button
              type="button"
              onClick={() => setPinModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
              title="Configurar conexión a Supabase y restaurar base de datos"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Asistente de Conexión BD y Restauración</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Asistente de Restauración */}
      <AsistenteRestauracionModal
        open={asistenteOpen}
        onOpenChange={setAsistenteOpen}
      />

      {/* Modal de Seguridad PIN / Contraseña */}
      <PinAdminModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        titulo="AUTORIZACIÓN DE ADMINISTRADOR"
        motivo="El acceso al Asistente de Base de Datos y Restauración requiere la clave o PIN de Administrador."
        onAutorizado={() => {
          setAsistenteOpen(true);
        }}
      />
    </div>
  );
};

export default AdminLogin;
