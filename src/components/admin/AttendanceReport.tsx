import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Check, Clock, Download, ExternalLink } from "lucide-react";
import { Loader2 } from "lucide-react";

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AttendanceReport() {
  const { data: attendees, isLoading } = useQuery({
    queryKey: ["attendance_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, nombres, apellidos, numero_documento, telefono, asistio, fecha_asistencia, catalog_cdp(nombre), catalog_red(nombre)")
        .order("fecha_asistencia", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const totalRegistrations = useQuery({
    queryKey: ["total_registrations_report"],
    queryFn: async () => {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
    refetchInterval: 10000,
  });

  const all = attendees ?? [];
  const checkedIn = all.filter((a) => a.asistio);
  const total = totalRegistrations.data ?? 0;
  const percentage = total > 0 ? Math.round((checkedIn.length / total) * 100) : 0;

  const exportCSV = () => {
    if (!checkedIn.length) return;
    const headers = ["Nombres", "Apellidos", "Documento", "Teléfono", "CDP", "RED", "Fecha Ingreso"];
    const rows = checkedIn.map((r) => [
      r.nombres, r.apellidos, r.numero_documento, r.telefono,
      (r as any).catalog_cdp?.nombre ?? "", (r as any).catalog_red?.nombre ?? "",
      r.fecha_asistencia ? new Date(r.fecha_asistencia).toLocaleString() : "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\n");
    downloadCSV(csv, "asistencia.csv");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Ingresados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{checkedIn.length}</div>
            <p className="text-xs text-muted-foreground mt-1">de {total} registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Check className="w-4 h-4" /> Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{percentage}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total - checkedIn.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{checkedIn.length} persona(s) ingresadas</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!checkedIn.length}>
            <Download className="w-4 h-4 mr-1" /> Exportar Asistencia
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/checkin" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" /> Abrir Escáner
            </a>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-x-auto bg-white/5">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-white/5 border-b border-white/10">
              <TableHead className="whitespace-nowrap">Nombres</TableHead>
              <TableHead className="whitespace-nowrap">Apellidos</TableHead>
              <TableHead className="whitespace-nowrap">Documento</TableHead>
              <TableHead className="whitespace-nowrap">CDP</TableHead>
              <TableHead className="whitespace-nowrap">RED</TableHead>
              <TableHead className="whitespace-nowrap">Estado</TableHead>
              <TableHead className="whitespace-nowrap">Fecha Ingreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/40">
                <TableCell className="font-medium whitespace-nowrap">{r.nombres}</TableCell>
                <TableCell className="whitespace-nowrap">{r.apellidos}</TableCell>
                <TableCell className="whitespace-nowrap">{r.numero_documento}</TableCell>
                <TableCell className="whitespace-nowrap">{(r as any).catalog_cdp?.nombre ?? "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{(r as any).catalog_red?.nombre ?? "-"}</TableCell>
                <TableCell>
                  {r.asistio ? (
                    <span className="inline-flex items-center gap-1 text-green-500 font-medium">
                      <Check className="w-3 h-3" /> Ingresó
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Pendiente</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.fecha_asistencia ? new Date(r.fecha_asistencia).toLocaleString() : "-"}
                </TableCell>
              </TableRow>
            ))}
            {!all.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay registros aún
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
