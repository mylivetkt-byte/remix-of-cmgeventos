import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";

type ScanState = "scanning" | "found" | "confirming" | "success" | "error" | "already";

interface RegistrationData {
  id: string;
  nombres: string;
  apellidos: string;
  asistio: boolean;
  numero_documento: string;
}

const CheckIn = () => {
  const [state, setState] = useState<ScanState>("scanning");
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    setState("scanning");
    setRegistration(null);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          handleQrScanned(decodedText);
        },
        () => {}
      );
    } catch (err) {
      toast.error("No se pudo acceder a la cámara. Verifica los permisos.");
      console.error(err);
    }
  };

  const handleQrScanned = async (qrCode: string) => {
    setState("found");

    const { data, error } = await supabase
      .from("registrations")
      .select("id, nombres, apellidos, asistio, numero_documento")
      .eq("qr_code", qrCode)
      .maybeSingle();

    if (error || !data) {
      setState("error");
      return;
    }

    setRegistration(data as RegistrationData);

    if ((data as any).asistio) {
      setState("already");
    } else {
      setState("confirming");
    }
  };

  const confirmCheckIn = async () => {
    if (!registration) return;
    setProcessing(true);

    try {
      const res = await supabase.functions.invoke("check_in_attendance", {
        method: "POST",
        body: { registration_id: registration.id },
      });

      if (res.error) throw res.error;

      setState("success");
    } catch (err: any) {
      toast.error(err.message || "Error al registrar asistencia");
      setState("error");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    startScanner();
  };

  useEffect(() => {
    startScanner();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-heading text-xl flex items-center justify-center gap-2">
            <Camera className="w-5 h-5" /> Check-In Evento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera view */}
          {state === "scanning" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Apunta la cámara al código QR de la invitación
              </p>
              <div
                id="qr-reader"
                ref={containerRef}
                className="rounded-lg overflow-hidden border border-border"
              />
            </div>
          )}

          {/* Loading */}
          {state === "found" && (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Buscando registro...</p>
            </div>
          )}

          {/* Confirm check-in */}
          {state === "confirming" && registration && (
            <div className="flex flex-col items-center py-6 gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold">{registration.nombres} {registration.apellidos}</h2>
                <p className="text-sm text-muted-foreground">Doc: {registration.numero_documento}</p>
              </div>
              <p className="text-base font-medium">¿Desea ingresar al evento?</p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={confirmCheckIn} disabled={processing}>
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sí, Ingresar
                </Button>
              </div>
            </div>
          )}

          {/* Success */}
          {state === "success" && registration && (
            <div className="flex flex-col items-center py-6 gap-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-green-600">¡Ingresado!</h2>
                <p className="text-base">{registration.nombres} {registration.apellidos}</p>
              </div>
              <Button onClick={reset} className="w-full gap-2">
                <RotateCcw className="w-4 h-4" /> Escanear Otro
              </Button>
            </div>
          )}

          {/* Already checked in */}
          {state === "already" && registration && (
            <div className="flex flex-col items-center py-6 gap-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-yellow-500" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-yellow-600">Ya registrado</h2>
                <p className="text-base">{registration.nombres} {registration.apellidos}</p>
                <p className="text-sm text-muted-foreground">Esta persona ya ingresó al evento</p>
              </div>
              <Button onClick={reset} className="w-full gap-2">
                <RotateCcw className="w-4 h-4" /> Escanear Otro
              </Button>
            </div>
          )}

          {/* Error / not found */}
          {state === "error" && (
            <div className="flex flex-col items-center py-6 gap-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-destructive">No encontrado</h2>
                <p className="text-sm text-muted-foreground">El código QR no corresponde a ningún registro</p>
              </div>
              <Button onClick={reset} className="w-full gap-2">
                <RotateCcw className="w-4 h-4" /> Intentar de Nuevo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckIn;
