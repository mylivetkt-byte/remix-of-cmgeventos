import { Link } from "react-router-dom";
import { Building2, ArrowRight, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuditorioConfig, formatPrecio } from "@/hooks/useAuditorio";

export const AuditorioBanner = () => {
  const { data: config } = useAuditorioConfig();

  if (!config || !config.activo) return null;

  const precio = config.mostrar_precio ? formatPrecio(config.precio, config.moneda) : null;
  const portada = config.fotos?.[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
      <div className="rounded-3xl border border-amber-200 bg-white shadow-xs overflow-hidden flex flex-col md:flex-row">
        {portada && (
          <div className="md:w-2/5 h-52 md:h-auto relative bg-slate-900">
            <img src={portada} alt={config.titulo} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="flex-1 p-6 sm:p-8 space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 border border-amber-200 rounded-xl px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            Alquiler de espacios
          </div>

          <div className="space-y-1.5">
            <h3 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 leading-tight">
              {config.titulo}
            </h3>
            {config.subtitulo && (
              <p className="text-slate-600 text-sm sm:text-base font-medium">{config.subtitulo}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 text-xs sm:text-sm font-bold text-slate-700">
            {config.capacidad && (
              <span className="inline-flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
                <Users className="w-4 h-4 text-teal-700" />
                Capacidad: {config.capacidad}
              </span>
            )}
            {precio && (
              <span className="inline-flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
                <Tag className="w-4 h-4 text-teal-700" />
                Desde {precio}
              </span>
            )}
          </div>

          <div className="pt-1">
            <Link to="/auditorio">
              <Button className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold h-12 px-6 rounded-2xl shadow-xs flex items-center gap-2">
                Ver fotos y solicitar alquiler
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuditorioBanner;
