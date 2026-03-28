import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Home, Network, Trophy, AlertCircle } from "lucide-react";

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
        <text x="70" y="65" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1a1a1a">{value}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#888">de {total}</text>
      </svg>
      <p className="text-sm font-medium text-center text-gray-700">{label}</p>
      <p className="text-xs text-gray-400">{pct.toFixed(1)}%</p>
    </div>
  );
}

function BarChart({ data, title, colorField = "count", maxItems = 10 }:
  { data: { name: string; count: number; asistio?: number }[]; title: string; colorField?: string; maxItems?: number }) {
  const top   = data.slice(0, maxItems);
  const maxVal = Math.max(...top.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-800 mb-4 text-sm">{title}</h3>
      <div className="space-y-3">
        {top.map((item, i) => (
          <div key={item.name}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className="truncate max-w-[60%]">{item.name}</span>
              <span className="font-semibold">{item.count} {item.asistio !== undefined ? `(✅ ${item.asistio})` : ""}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.count / maxVal) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        ))}
        {top.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + "20" }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function DashboardStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const [regsRes, cdpsRes, redsRes] = await Promise.all([
        supabase.from("registrations").select(`
          id, asistio, nombre_invitador,
          catalog_cdp(nombre),
          catalog_red(nombre)
        `),
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
      const invMap: Record<string, number> = {};
      regs.forEach((r) => {
        const k = r.nombre_invitador?.trim();
        if (k) { invMap[k] = (invMap[k] ?? 0) + 1; }
      });
      const topInvitadores = Object.entries(invMap)
        .map(([name, count]) => ({ name, count }))
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">📊 Dashboard</h2>
        <span className="text-xs text-gray-400">Se actualiza cada 30 seg</span>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-6 h-6" />}    label="Total Registrados" value={d.total}     color="#00a878" />
        <StatCard icon={<UserCheck className="w-6 h-6" />} label="Asistieron"        value={d.asistidos} color="#00704a"
          sub={`${d.total > 0 ? ((d.asistidos / d.total) * 100).toFixed(1) : 0}% del total`} />
        <StatCard icon={<Home className="w-6 h-6" />}      label="Casas de Paz"     value={d.byCDP.length} color="#ffd200" />
        <StatCard icon={<Network className="w-6 h-6" />}   label="REDs activas"     value={d.byRED.length} color="#f4a100" />
      </div>

      {/* Donut total vs asistidos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-6 text-sm text-center">Total de Invitados vs Asistencia</h3>
        <div className="flex justify-center gap-12 flex-wrap">
          <DonutChart value={d.asistidos} total={d.total} label="Asistieron" />
          <DonutChart value={d.total - d.asistidos} total={d.total} label="Pendientes" />
        </div>
      </div>

      {/* Barras CDP y RED lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart title="🏠 Invitados por Casa de Paz (CDP)" data={d.byCDP} />
        <BarChart title="🌐 Invitados por RED" data={d.byRED} />
      </div>

      {/* Asistencia por CDP y RED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">✅ Asistencia por Casa de Paz</h3>
          <div className="space-y-3">
            {d.byCDP.map((item, i) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate max-w-[55%]">{item.name}</span>
                  <span className="font-semibold text-green-600">{item.asistio} / {item.count}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: item.count > 0 ? `${(item.asistio / item.count) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
            {d.byCDP.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">✅ Asistencia por RED</h3>
          <div className="space-y-3">
            {d.byRED.map((item, i) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate max-w-[55%]">{item.name}</span>
                  <span className="font-semibold text-green-600">{item.asistio} / {item.count}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: item.count > 0 ? `${(item.asistio / item.count) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
            {d.byRED.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>}
          </div>
        </div>
      </div>

      {/* Top invitadores */}
      <BarChart title="🏆 Quien más invita" data={d.topInvitadores.map((i) => ({ ...i, asistio: undefined }))} maxItems={10} />

      {/* CDPs sin registros */}
      {d.cdpsSinRegs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-700 text-sm">
              Casas de Paz sin registros ({d.cdpsSinRegs.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {d.cdpsSinRegs.map((cdp) => (
              <span key={cdp} className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full font-medium">
                {cdp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
