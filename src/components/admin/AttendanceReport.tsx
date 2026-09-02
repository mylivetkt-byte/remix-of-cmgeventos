import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Check, Clock, Download, ExternalLink, Filter, Sparkles } from "lucide-react";
import { Loader2 } from "lucide-react";
import { EventItem } from "@/integrations/supabase/event-types";

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface AttendanceReportProps {
  filterEvent?: string;
  onFilterEventChange?: (id: string) => void;
}

export function AttendanceReport({ filterEvent: externalFilterEvent, onFilterEventChange }: AttendanceReportProps = {}) {
  const [internalFilterEvent, setInternalFilterEvent] = useState<string>("all");

  const filterEvent = externalFilterEvent !== undefined ? externalFilterEvent : internalFilterEvent;
  const setFilterEvent = (id: string) => {
    setInternalFilterEvent(id);
    if (onFilterEventChange) onFilterEventChange(id);
  };

  const { data: events } = useQuery({
    queryKey: ["admin_events_list"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, nombre, slug").order("created_at", { ascending: false });
      return (data as EventItem[]) || [];
    },
  });

  const { data: attendees, isLoading } = useQuery({
    queryKey: ["attendance_report", filterEvent],
    queryFn: async () => {
      let q = supabase
        .from("registrations")
        .select("id, event_id, nombres, apellidos, numero_documento, telefono, correo, asistio, fecha_asistencia, estado_pago, catalog_cdp(nombre), catalog_red(nombre)")
        .order("fecha_asistencia", { ascending: false, nullsFirst: false });

      if (filterEvent !== "all") {
        q = q.eq("event_id", filterEvent);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const totalRegistrations = useQuery({
    queryKey: ["total_registrations_report", filterEvent],
    queryFn: async () => {
      let q = supabase.from("registrations").select("*", { count: "exact", head: true });
      if (filterEvent !== "all") {
        q = q.eq("event_id", filterEvent);
      }
      const { count } = await q;
      return count || 0;
    },
    refetchInterval: 10000,
  });

  const all = attendees ?? [];
  const checkedIn = all.filter((a) => a.asistio);
  const total = totalRegistrations.data ?? 0;
  const percentage = total > 0 ? Math.round((checkedIn.length / total) * 100) : 0;

  const selectedEventName = filterEvent === "all"
    ? "Todos_los_Eventos"
    : events?.find((e) => e.id === filterEvent)?.nombre.replace(/\s+/g, "_") || "Evento";

  const exportCSV = () => {
    if (!all.length) return;
    const headers = ["Evento", "Nombres", "Apellidos", "Documento", "Teléfono", "Correo", "CDP", "RED", "Estado Asistencia", "Fecha Ingreso", "Estado Pago"];
    const rows = all.map((r) => [
      (r as any).events?.nombre ?? "Evento General",
      r.nombres,
      r.apellidos,
      r.numero_documento,
      r.telefono,
      r.correo || "",
      (r as any).catalog_cdp?.nombre ?? "",
      (r as any).catalog_red?.nombre ?? "",
      r.asistio ? "ASISTIÓ" : "PENDIENTE",
      r.fecha_asistencia ? new Date(r.fecha_asistencia).toLocaleString() : "",
      r.estado_pago || "gratis",
    ]);

    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\n");
    downloadCSV(csv, `reporte_asistencia_${selectedEventName}.csv`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8 text-emerald-950 font-sans">
      {/* Cabecera del Modo Evento Aislado si aplica */}
      {filterEvent !== "all" && (
        <div className="bg-emerald-800 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="text-xs sm:text-sm font-extrabold">
              Reporte de Asistencia del Evento: <span className="underline underline-offset-4 font-black">{events?.find((e) => e.id === filterEvent)?.nombre}</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFilterEvent("all")} className="text-white hover:bg-emerald-900 text-xs font-bold px-3 py-1 rounded-xl">
            ✕ Ver Toda la Asistencia
          </Button>
        </div>
      )}

      {/* Filtro de Evento Select */}
      <div className="glass-card p-4 rounded-2xl border border-white/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-emerald-900">Seleccionar Evento para Reporte de Asistencia:</span>
        </div>

        <Select value={filterEvent} onValueChange={setFilterEvent}>
          <SelectTrigger className="w-full sm:w-72 bg-white border-emerald-300 font-semibold text-emerald-950">
            <SelectValue placeholder="Seleccionar Evento" />
          </SelectTrigger>
          <SelectContent className="bg-white border-emerald-200">
            <SelectItem value="all">📊 Todos los Eventos</SelectItem>
            {events?.map((evt) => (
              <SelectItem key={evt.id} value={evt.id}>
                {evt.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-white/90 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-emerald-800 flex items-center gap-2 uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-700" /> Ingresados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-950">{checkedIn.length}</div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">de {total} registrados en total</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/90 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-emerald-800 flex items-center gap-2 uppercase tracking-wider">
              <Check className="w-4 h-4 text-emerald-700" /> Porcentaje de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-950">{percentage}%</div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">de asistencia efectiva</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/90 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-emerald-800 flex items-center gap-2 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-amber-600" /> Asistentes Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-950">{total - checkedIn.length}</div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">por ingresar con su pase QR</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones y Exportar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-emerald-900">
            {all.length} registro(s) encontrados ({checkedIn.length} ingresados)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="default" size="sm" onClick={exportCSV} disabled={!all.length} className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md">
            <Download className="w-4 h-4 mr-1.5" /> Exportar Reporte de Asistencia (.csv)
          </Button>

          <Button variant="outline" size="sm" asChild className="border-emerald-300 text-emerald-900 hover:bg-emerald-50">
            <a href="/checkin" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1.5 text-amber-600" /> Escáner de Pases QR
            </a>
          </Button>
        </div>
      </div>

      {/* Tabla de Asistencia */}
      <div className="rounded-2xl border border-emerald-200 overflow-x-auto bg-white/90 shadow-md">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-emerald-100/60 border-b border-emerald-200">
              <TableHead className="font-bold text-emerald-950">Evento</TableHead>
              <TableHead className="font-bold text-emerald-950">Nombres</TableHead>
              <TableHead className="font-bold text-emerald-950">Apellidos</TableHead>
              <TableHead className="font-bold text-emerald-950">Documento</TableHead>
              <TableHead className="font-bold text-emerald-950">CDP</TableHead>
              <TableHead className="font-bold text-emerald-950">RED</TableHead>
              <TableHead className="font-bold text-emerald-950">Estado</TableHead>
              <TableHead className="font-bold text-emerald-950">Fecha/Hora Ingreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.map((r) => (
              <TableRow key={r.id} className="hover:bg-emerald-50/50 border-b border-emerald-100">
                <TableCell className="font-bold text-emerald-900 whitespace-nowrap">
                  {(r as any).events?.nombre ?? "Evento General"}
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap text-emerald-950">{r.nombres}</TableCell>
                <TableCell className="whitespace-nowrap text-emerald-950">{r.apellidos}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-emerald-900">{r.numero_documento}</TableCell>
                <TableCell className="whitespace-nowrap text-emerald-800">{(r as any).catalog_cdp?.nombre ?? "-"}</TableCell>
                <TableCell className="whitespace-nowrap text-emerald-800">{(r as any).catalog_red?.nombre ?? "-"}</TableCell>
                <TableCell>
                  {r.asistio ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-700 text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                      <Check className="w-3 h-3" /> ASISTIÓ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                      Pendiente
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-emerald-900">
                  {r.fecha_asistencia ? new Date(r.fecha_asistencia).toLocaleString("es-ES") : "-"}
                </TableCell>
              </TableRow>
            ))}
            {!all.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-emerald-700 py-8 font-medium">
                  No hay registros de asistencia para el evento seleccionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
