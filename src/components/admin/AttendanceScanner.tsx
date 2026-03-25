import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { QrCode, Users, Check } from "lucide-react";

export const AttendanceScanner = () => {
  const [qrInput, setQrInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const attendanceStats = useQuery({
    queryKey: ["attendance_stats"],
    queryFn: async () => {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check_in_attendance`;
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!response.ok) throw new Error("Error fetching stats");
      return response.json();
    },
    refetchInterval: 5000,
  });

  const totalRegistrations = useQuery({
    queryKey: ["total_registrations"],
    queryFn: async () => {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCheckIn = async (qrData: string) => {
    try {
      setIsScanning(true);

      const registration = await supabase
        .from("registrations")
        .select("id, nombres, apellidos, asistio")
        .eq("qr_code", qrData)
        .maybeSingle();

      if (registration.error) throw registration.error;
      if (!registration.data) {
        toast({
          variant: "destructive",
          title: "No encontrado",
          description: "El código QR no es válido",
        });
        setQrInput("");
        return;
      }

      const registrationId = registration.data.id;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check_in_attendance`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registration_id: registrationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al registrar asistencia");
      }

      const result = await response.json();

      if (registration.data.asistio) {
        toast({
          title: "Ya registrado",
          description: `${registration.data.nombres} ${registration.data.apellidos} ya había marcado asistencia`,
        });
      } else {
        toast({
          title: "Asistencia registrada",
          description: `Bienvenido ${result.nombres} ${result.apellidos}!`,
        });
      }

      await attendanceStats.refetch();
      await totalRegistrations.refetch();
      setQrInput("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsScanning(false);
      inputRef.current?.focus();
    }
  };

  const attendeeCount = attendanceStats.data?.total_asistentes || 0;
  const totalCount = totalRegistrations.data || 0;
  const percentage = totalCount > 0 ? Math.round((attendeeCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Users className="w-4 h-4 inline mr-2" />
              Asistentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attendeeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">de {totalCount} registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Check className="w-4 h-4 inline mr-2" />
              Porcentaje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{percentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">de asistencia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <QrCode className="w-4 h-4 inline mr-2" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount - attendeeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">por registrar</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Escanear Código QR</CardTitle>
          <CardDescription>
            Apunta la cámara del scanner al código QR de la invitación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Código QR</label>
            <Input
              ref={inputRef}
              placeholder="Escanea el código QR aquí..."
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && qrInput) {
                  handleCheckIn(qrInput);
                }
              }}
              disabled={isScanning}
              className="mt-2 font-mono"
            />
          </div>
          <Button
            onClick={() => handleCheckIn(qrInput)}
            disabled={!qrInput || isScanning}
            className="w-full"
          >
            {isScanning ? "Procesando..." : "Registrar Asistencia"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
