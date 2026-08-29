import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserCheck, Home, Network, AlertCircle, Filter, Sparkles } from "lucide-react";
import { EventItem } from "@/integrations/supabase/event-types";

// ── Helpers ───────────────────────────────────────────────────────────
const COLORS = [
  "#00a878", "#ffd200", "#00704a", "#f4a100", "#34c38f",
  "#ffb703", "#2ec4b6", "#e9c46a", "#52b788", "#f77f00",
];

function DonutChart({ value, total, label }: { value: number; total: number; label: string }) {
  const pct   = total > 0 ? (value / total) * 100 : 0;
  const r     = 54;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#00a878" strokeWidth="14"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 70 70)" />
        <text x="70" y="65" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#083E30">{value}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#888">de {total}</text>
      </svg>
      <p className="text-sm font-bold text-center text-emerald-950">{label}</p>
      <p className="text-xs font-semibold text-emerald-700">{pct.toFixed(1)}%</p>
    </div>
  );
}

function BarChart({ data, title, maxItems = 10 }:
  { data: { name: string; count: number; asistio?: number }[]; title: string; maxItems?: number }) {
  const top   = data.slice(0, maxItems);
  const maxVal = Math.max(...top.map((d) => d.count), 1);

  return (
    <div className="glass-card rounded-2xl border border-white/90 shadow-md p-5 text-emerald-950 font-sans">
      <h3 className="font-bold text-emerald-900 mb-4 text-sm font-heading">{title}</h3>
      <div className="space-y-3">
        {top.map((item, i) => (
          <div key={item.name}>
            <div className="flex justify-between text-xs text-emerald-950 font-medium mb-1">
              <span className="truncate max-w-[60%]">{item.name}</span>
              <span className="font-bold">{item.count} {item.asistio !== undefined ? `(✅ ${item.asistio})` : ""}</span>
            </div>
            <div className="h-2.5 bg-emerald-100/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.count / maxVal) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        ))}
        {top.length === 0 && <p className="text-xs text-emerald-700 text-center py-4">Sin datos para el evento seleccionado</p>}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="glass-card rounded-2xl border border-white/90 shadow-md p-5 flex items-center gap-4 text-emerald-950 font-sans">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ backgroundColor: color + "20" }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-black text-emerald-950">{value}</p>
        <p className="text-xs font-semibold text-emerald-800">{label}</p>
        {sub && <p className="text-[11px] text-emerald-700 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

// ── Componente Principal DashboardStats ──────────────────────────────
export function DashboardStats() {
  const [filterEvent, setFilterEvent] = useState<string>("all");

  const { data: events } = useQuery({
    queryKey: ["admin_events_dashboard_list"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, nombre, slug").order("created_at", { ascending: false });
      return (data as EventItem[]) || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard_stats", filterEvent],
    queryFn: async () => {
      let qRegs = supabase.from("registrations").select(`
        id, event_id, asistio, nombre_invitador,
        catalog_cdp(nombre),
        catalog_red(nombre)
      `);

      if (filterEvent !== "all") {
        qRegs = qRegs.eq("event_id", filterEvent);
      }

      const [regsRes, cdpsRes, redsRes] = await Promise.all([
        qRegs,
        supabase.from("catalog_cdp").select("id, nombre").eq("activo", true),
        supabase.from("catalog_red").select("id, nombre").eq("activo", true),
      ]);

      const regs = regsRes.data ?? [];
      const cdps = cdpsRes.data ?? [];
      const reds = redsRes.data ?? [];

      const total     = regs.length;
      const asistidos = regs.filter((r) => r.asistio).length;

      // Por CDP
      const cdpMap: Record<string, { count: number; asistio: number }> = {};
      regs.forEach((r) => {
        const k = (r as any).catalog_cdp?.nombre ?? "Sin CDP";
        if (!cdpMap[k]) cdpMap[k] = { count: 0, asistio: 0 };
        cdpMap[k].count++;
        if (r.asistio) cdpMap[k].asistio++;
      });
      const byCDP = Object.entries(cdpMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.count - a.count);

      // Por RED
      const redMap: Record<string, { count: number; asistio: number }> = {};
      regs.forEach((r) => {
        const k = (r as any).catalog_red?.nombre ?? "Sin RED";
        if (!redMap[k]) redMap[k] = { count: 0, asistio: 0 };
        redMap[k].count++;
        if (r.asistio) redMap[k].asistio++;
      });
      const byRED = Object.entries(redMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.count - a.count);

      // Quién invita más
      const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

      const invMap: Record<string, { count: number; red: string; displayName: string }> = {};
      regs.forEach((r) => {
        const nombre = r.nombre_invitador?.trim();
        if (!nombre) return;
        const red     = (r as any).catalog_red?.nombre ?? "Sin RED";
        const k       = `${normalize(nombre)}||${red}`;
        if (!invMap[k]) invMap[k] = { count: 0, red, displayName: nombre };
        invMap[k].count++;
        if (nombre.length > invMap[k].displayName.length) invMap[k].displayName = nombre;
      });
      const topInvitadores = Object.entries(invMap)
        .map(([_, v]) => ({
          name:  `${v.displayName} (${v.red})`,
          count: v.count,
        }))
        .sort((a, b) => b.count - a.count);

      // CDPs sin registros
      const cdpsConRegs = new Set(regs.map((r) => (r as any).catalog_cdp?.nombre));
      const cdpsSinRegs = cdps
        .filter((c) => !cdpsConRegs.has(c.nombre))
        .map((c) => c.nombre);

      return { total, asistidos, byCDP, byRED, topInvitadores, cdpsSinRegs };
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-700" />
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-6 pb-10 animate-fade-in text-emerald-950 font-sans">
      {/* Encabezado y Filtro de Eventos */}
      <div className="glass-card p-5 rounded-2xl border border-white/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-heading text-emerald-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            Métricas y Consolidados del Dashboard
          </h2>
          <p className="text-xs text-emerald-800 mt-0.5">Estadísticas en tiempo real actualizadas cada 30 segundos</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-amber-600 shrink-0" />
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="w-full sm:w-72 bg-white border-emerald-300 font-bold text-emerald-950">
              <SelectValue placeholder="Filtrar por Evento" />
            </SelectTrigger>
            <SelectContent className="bg-white border-emerald-200">
              <SelectItem value="all">📊 Todos los Eventos</SelectItem>
              {events?.map((evt) => (
                <SelectItem key={evt.id} value={evt.id}>
                  🎟️ {evt.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-6 h-6" />}    label="Total Registrados" value={d.total}     color="#083E30" />
        <StatCard icon={<UserCheck className="w-6 h-6" />} label="Asistieron"        value={d.asistidos} color="#0D4F3C"
          sub={`${d.total > 0 ? ((d.asistidos / d.total) * 100).toFixed(1) : 0}% de asistencia`} />
        <StatCard icon={<Home className="w-6 h-6" />}      label="Casas de Paz"     value={d.byCDP.length} color="#CFAA37" />
        <StatCard icon={<Network className="w-6 h-6" />}   label="REDs activas"     value={d.byRED.length} color="#D97706" />
      </div>

      {/* Donut total vs asistidos */}
      <div className="glass-card rounded-2xl border border-white/90 shadow-md p-6">
        <h3 className="font-bold text-emerald-900 mb-6 text-sm text-center font-heading">
          Total de Inscritos vs Asistentes ({filterEvent === "all" ? "Todos los Eventos" : events?.find(e => e.id === filterEvent)?.nombre})
        </h3>
        <div className="flex justify-center gap-12 flex-wrap">
          <DonutChart value={d.asistidos} total={d.total} label="Asistieron" />
          <DonutChart value={d.total - d.asistidos} total={d.total} label="Pendientes" />
        </div>
      </div>

      {/* Barras CDP y RED lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart title="🏠 Inscritos por Casa de Paz (CDP)" data={d.byCDP} />
        <BarChart title="🌐 Inscritos por RED" data={d.byRED} />
      </div>

      {/* Asistencia por CDP y RED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl border border-white/90 shadow-md p-5">
          <h3 className="font-bold text-emerald-900 mb-4 text-sm font-heading">✅ Asistencia por Casa de Paz</h3>
          <div className="space-y-3">
            {d.byCDP.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs text-emerald-950 mb-1">
                  <span className="truncate max-w-[55%] font-medium">{item.name}</span>
                  <span className="font-bold text-emerald-800">{item.asistio} / {item.count}</span>
                </div>
                <div className="h-2.5 bg-emerald-100/60 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                    style={{ width: item.count > 0 ? `${(item.asistio / item.count) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
            {d.byCDP.length === 0 && <p className="text-xs text-emerald-700 text-center py-4">Sin datos</p>}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/90 shadow-md p-5">
          <h3 className="font-bold text-emerald-900 mb-4 text-sm font-heading">✅ Asistencia por RED</h3>
          <div className="space-y-3">
            {d.byRED.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs text-emerald-950 mb-1">
                  <span className="truncate max-w-[55%] font-medium">{item.name}</span>
                  <span className="font-bold text-emerald-800">{item.asistio} / {item.count}</span>
                </div>
                <div className="h-2.5 bg-emerald-100/60 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                    style={{ width: item.count > 0 ? `${(item.asistio / item.count) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
            {d.byRED.length === 0 && <p className="text-xs text-emerald-700 text-center py-4">Sin datos</p>}
          </div>
        </div>
      </div>

      {/* Top invitadores */}
      <BarChart title="🏆 Quién más invita" data={d.topInvitadores} maxItems={5} />

      {/* CDPs sin registros */}
      {d.cdpsSinRegs.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-950 text-sm font-heading">
              Casas de Paz sin registros en este evento ({d.cdpsSinRegs.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {d.cdpsSinRegs.map((cdp) => (
              <span key={cdp} className="bg-white border border-amber-200 text-amber-900 text-xs px-3 py-1 rounded-full font-semibold">
                {cdp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
