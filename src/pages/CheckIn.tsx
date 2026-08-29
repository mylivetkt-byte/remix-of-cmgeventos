import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, CheckCircle2, XCircle, Loader2, RotateCcw, Ticket, Filter, Search, AlertTriangle, ShieldCheck } from "lucide-react";
import { EventItem } from "@/integrations/supabase/event-types";

type ScanState = "scanning" | "found" | "confirming" | "success" | "error" | "already" | "wrong_event";

interface RegistrationData {
  id: string;
  nombres: string;
  apellidos: string;
  asistio: boolean;
  numero_documento: string;
  event_id?: string;
  events?: {
    nombre: string;
    slug: string;
    lugar_evento?: string;
  } | null;
}

const CheckIn = () => {
  const [state, setState] = useState<ScanState>("scanning");
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [manualDoc, setManualDoc] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar lista de eventos activos
  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase.from("events").select("id, nombre, slug").order("created_at", { ascending: false });
      if (data) setEvents(data as EventItem[]);
    };
    loadEvents();
  }, []);

  const startScanner = async () => {
    setState("scanning");
    setRegistration(null);

    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }

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
      console.warn("No se pudo iniciar cámara automáticamente:", err);
    }
  };

  const processRegistrationResult = (data: any) => {
    const matchedEvent = events.find((e) => e.id === data?.event_id);
    const reg = {
      ...data,
      events: data.events || matchedEvent || null,
    } as RegistrationData;
    setRegistration(reg);

    // Verificar si el pase corresponde al evento seleccionado en el escáner
    if (selectedEventId !== "all" && reg.event_id && reg.event_id !== selectedEventId) {
      setState("wrong_event");
      return;
    }

    if (reg.asistio) {
      setState("already");
    } else {
      setState("confirming");
    }
  };

  const handleQrScanned = async (qrCode: string) => {
    setState("found");

    const { data, error } = await supabase
      .from("registrations")
      .select("id, event_id, nombres, apellidos, asistio, numero_documento")
      .eq("qr_code", qrCode)
      .maybeSingle();

    if (error || !data) {
      setState("error");
      return;
    }

    processRegistrationResult(data);
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDoc.trim()) return;

    setState("found");
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }

    const { data, error } = await supabase
      .from("registrations")
      .select("id, event_id, nombres, apellidos, asistio, numero_documento")
      .eq("numero_documento", manualDoc.trim())
      .maybeSingle();

    if (error || !data) {
      toast.error("No se encontró ningún registro con ese documento");
      setState("error");
      return;
    }

    processRegistrationResult(data);
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
    setManualDoc("");
    startScanner();
  };

  useEffect(() => {
    startScanner();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, [selectedEventId]);

  const currentSelectedEventObj = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-amber-400">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-white shadow-2xl rounded-3xl overflow-hidden">
        {/* Cabecera del Escáner */}
        <CardHeader className="text-center pb-3 border-b border-slate-700 bg-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-amber-400 text-slate-950 font-extrabold px-3 py-0.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Punto de Control / Escáner
            </Badge>

            <span className="text-xs text-slate-400 font-mono">CMG Check-in</span>
          </div>

          <CardTitle className="font-heading text-xl flex items-center justify-center gap-2 text-white">
            <Camera className="w-5 h-5 text-emerald-400" /> Control de Ingreso a Eventos
          </CardTitle>

          {/* Selector de Evento Activo */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold mb-1 justify-center">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              Filtrar por Evento en Puerta:
            </div>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full bg-slate-900 border-slate-600 text-amber-300 font-bold text-xs">
                <SelectValue placeholder="Todos los Eventos" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                <SelectItem value="all">🌐 Todos los Eventos</SelectItem>
                {events.map((evt) => (
                  <SelectItem key={evt.id} value={evt.id}>
                    🎟️ {evt.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          {/* Vista de Cámara */}
          {state === "scanning" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 text-center font-medium">
                Apunta la cámara al código QR de la boleta o invitación
              </p>

              <div
                id="qr-reader"
                ref={containerRef}
                className="rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-inner bg-black"
              />

              {/* Búsqueda Manual por Documento */}
              <form onSubmit={handleManualSearch} className="pt-2 space-y-2 border-t border-slate-700">
                <p className="text-[11px] text-slate-400 text-center font-medium">¿Problemas con el QR? Ingresa el documento:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Número de documento..."
                    value={manualDoc}
                    onChange={(e) => setManualDoc(e.target.value)}
                    className="bg-slate-900 border-slate-600 text-white text-xs font-semibold"
                  />
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Cargando */}
          {state === "found" && (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
              <p className="text-sm text-slate-300">Verificando pase e identificando evento...</p>
            </div>
          )}

          {/* Confirmar Check-in con Nombre de Evento */}
          {state === "confirming" && registration && (
            <div className="flex flex-col items-center py-4 gap-4 animate-fade-in text-center">
              {/* Badge del Evento */}
              <Badge className="bg-amber-400 text-slate-950 font-black px-3.5 py-1 text-xs shadow-md">
                <Ticket className="w-4 h-4 mr-1 text-slate-950" />
                EVENTO: {registration.events?.nombre || "Evento General"}
              </Badge>

              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">{registration.nombres} {registration.apellidos}</h2>
                <p className="text-xs text-slate-300 font-mono">Documento: {registration.numero_documento}</p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 w-full text-xs text-slate-300">
                <span>¿Permitir ingreso a <strong>{registration.events?.nombre || "este evento"}</strong>?</span>
              </div>

              <div className="flex gap-3 w-full pt-2">
                <Button variant="outline" className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={reset}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={confirmCheckIn} disabled={processing}>
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirmar Ingreso
                </Button>
              </div>
            </div>
          )}

          {/* Evento Incorrecto / No Coincide */}
          {state === "wrong_event" && registration && (
            <div className="flex flex-col items-center py-4 gap-4 animate-fade-in text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-amber-400">⚠️ Evento no coincide</h2>
                <p className="text-sm font-semibold text-white">{registration.nombres} {registration.apellidos}</p>
              </div>

              <div className="bg-amber-950/60 p-4 rounded-xl border border-amber-500/40 text-xs text-amber-200 space-y-2 text-left w-full">
                <p>
                  <strong>Este pase pertenece al evento:</strong>
                </p>
                <p className="text-amber-400 font-extrabold text-sm">
                  🎟️ {registration.events?.nombre || "Otro Evento"}
                </p>
                <p className="text-slate-300 text-[11px] border-t border-amber-500/30 pt-2">
                  El escáner está filtrando por: <strong>{currentSelectedEventObj?.nombre}</strong>.
                </p>
              </div>

              <Button onClick={reset} className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2">
                <RotateCcw className="w-4 h-4" /> Escanear Otro Pase
              </Button>
            </div>
          )}

          {/* Ingreso Exitoso */}
          {state === "success" && registration && (
            <div className="flex flex-col items-center py-4 gap-4 animate-fade-in text-center">
              <Badge className="bg-emerald-500 text-white font-extrabold px-3 py-0.5 text-xs">
                {registration.events?.nombre || "Evento General"}
              </Badge>

              <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-emerald-400">¡INGRESO AUTORIZADO!</h2>
                <p className="text-lg font-bold text-white mt-1">{registration.nombres} {registration.apellidos}</p>
                <p className="text-xs text-slate-300 mt-1">Asistencia registrada correctamente</p>
              </div>

              <Button onClick={reset} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 text-base gap-2 rounded-2xl shadow-lg">
                <RotateCcw className="w-5 h-5" /> ESCANEAR SIGUIENTE BOLETA
              </Button>
            </div>
          )}

          {/* Ya había ingresado */}
          {state === "already" && registration && (
            <div className="flex flex-col items-center py-4 gap-4 animate-fade-in text-center">
              <Badge className="bg-amber-400 text-slate-950 font-bold px-3 py-0.5 text-xs">
                {registration.events?.nombre || "Evento General"}
              </Badge>

              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-amber-400">¡Esta persona ya ingresó!</h2>
                <p className="text-base font-bold text-white mt-1">{registration.nombres} {registration.apellidos}</p>
                <p className="text-xs text-slate-300 mt-1 font-mono">Doc: {registration.numero_documento}</p>
              </div>

              <Button onClick={reset} className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2">
                <RotateCcw className="w-4 h-4" /> Escanear Otro
              </Button>
            </div>
          )}

          {/* Error / No Encontrado */}
          {state === "error" && (
            <div className="flex flex-col items-center py-4 gap-4 animate-fade-in text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-400">Pase no encontrado</h2>
                <p className="text-xs text-slate-300 mt-1">El código QR o documento no corresponde a ningún participante.</p>
              </div>
              <Button onClick={reset} className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2">
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
