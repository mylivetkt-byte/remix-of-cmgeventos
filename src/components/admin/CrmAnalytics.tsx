import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrmContact } from "@/lib/whatsapp-crm";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Tag,
} from "lucide-react";

interface CrmAnalyticsProps {
  contacts: CrmContact[];
  campaignName?: string;
}

const COLORS = {
  sent: "#0d9488", // Teal 600
  pending: "#64748b", // Slate 500
  error: "#ef4444", // Red 500
  rsvpConfirmed: "#10b981", // Emerald 500
  rsvpDeclined: "#f59e0b", // Amber 500
};

export function CrmAnalytics({ contacts, campaignName }: CrmAnalyticsProps) {
  // Cálculo de estadísticas
  const total = contacts.length;
  const sent = contacts.filter((c) => c.status === "sent").length;
  const pending = contacts.filter((c) => c.status === "pending" || c.status === "sending").length;
  const errors = contacts.filter((c) => c.status === "error").length;

  // Supeditado a respuestas de RSVP si existen en los datos
  const rsvpConfirmed = contacts.filter((c) => c.extra?.["rsvp"] === "confirmado").length;
  const rsvpDeclined = contacts.filter((c) => c.extra?.["rsvp"] === "cancelado").length;

  const successRate = total > 0 ? ((sent / total) * 100).toFixed(1) : "0";
  const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : "0";
  const rsvpRate = sent > 0 ? (((rsvpConfirmed + rsvpDeclined) / sent) * 100).toFixed(1) : "0";

  // Datos para Gráfico Donut de Estados
  const statusPieData = [
    { name: "Enviados Con Éxito", value: sent, color: COLORS.sent },
    { name: "Pendientes", value: pending, color: COLORS.pending },
    { name: "Errores / Rebotados", value: errors, color: COLORS.error },
  ].filter((d) => d.value > 0);

  // Datos para Gráfico por Categoría / Red
  const categoryMap = new Map<string, { total: number; sent: number; errors: number }>();
  contacts.forEach((c) => {
    const cat = c.extra?.["categoria"] || c.extra?.["red"] || "General";
    const current = categoryMap.get(cat) || { total: 0, sent: 0, errors: 0 };
    current.total++;
    if (c.status === "sent") current.sent++;
    if (c.status === "error") current.errors++;
    categoryMap.set(cat, current);
  });

  const categoryBarData = Array.from(categoryMap.entries()).map(([cat, stats]) => ({
    categoria: cat,
    Enviados: stats.sent,
    Rebotados: stats.errors,
    Pendientes: stats.total - stats.sent - stats.errors,
  }));

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 font-sans">
      {/* Cabecera del Panel Analytics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Métricas & Analytics de Envío {campaignName ? `— ${campaignName}` : ""}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Análisis de rendimiento, tasa de entrega y respuestas de WhatsApp
          </p>
        </div>

        <Badge className="bg-teal-50 text-teal-900 border-teal-200 font-extrabold px-3.5 py-1.5 rounded-full self-start sm:self-auto">
          <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-teal-700" /> {total} Contactos Procesados
        </Badge>
      </div>

      {/* Tarjetas KPI de Rendimiento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Enviados */}
        <Card className="rounded-3xl border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-extrabold text-slate-500 uppercase">Enviados con Éxito</CardTitle>
            <div className="p-2 bg-teal-50 rounded-xl text-teal-700">
              <Send className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{sent}</div>
            <p className="text-xs text-teal-700 font-bold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {successRate}% de Tasa de Entrega
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Tasa de Éxito % */}
        <Card className="rounded-3xl border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-extrabold text-slate-500 uppercase">Efectividad Global</CardTitle>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-950">{successRate}%</div>
            <p className="text-xs text-slate-500 font-medium mt-1">Mensajes entregados correctamente</p>
          </CardContent>
        </Card>

        {/* KPI 3: Respuestas RSVP */}
        <Card className="rounded-3xl border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-extrabold text-slate-500 uppercase">Respuestas RSVP</CardTitle>
            <div className="p-2 bg-sky-50 rounded-xl text-sky-700">
              <MessageSquare className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{rsvpConfirmed + rsvpDeclined}</div>
            <p className="text-xs text-sky-700 font-bold mt-1">{rsvpRate}% Tasa de interacción</p>
          </CardContent>
        </Card>

        {/* KPI 4: Rebotados / Errores */}
        <Card className="rounded-3xl border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-extrabold text-slate-500 uppercase">Mensajes Rebotados</CardTitle>
            <div className="p-2 bg-red-50 rounded-xl text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-950">{errors}</div>
            <p className="text-xs text-red-700 font-bold mt-1">{errorRate}% de Fallos o Números Inexistentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones de Gráficos con Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Donut: Distribución de Estados */}
        <Card className="rounded-3xl border-slate-200/80 bg-white shadow-xs p-6">
          <CardHeader className="px-0 pt-0 pb-4">
            <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-teal-600" /> Distribución de Estados de Envío
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 h-64">
            {statusPieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs font-medium">
                No hay datos de envíos para mostrar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "600", paddingTop: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Barras: Comparativa por Categoría / Red */}
        <Card className="rounded-3xl border-slate-200/80 bg-white shadow-xs p-6">
          <CardHeader className="px-0 pt-0 pb-4">
            <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-teal-600" /> Rendimiento por Categoría / Red
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 h-64">
            {categoryBarData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs font-medium">
                No hay categorías registradas en esta campaña
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "bold" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "600" }} />
                  <Bar dataKey="Enviados" fill={COLORS.sent} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Rebotados" fill={COLORS.error} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
