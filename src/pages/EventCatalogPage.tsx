import { useState } from "react";
import { Link } from "react-router-dom";
import { useEvents } from "@/hooks/useEvents";
import { Search, Calendar, MapPin, Ticket, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const EventCatalogPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: events, isLoading, isError } = useEvents(true);

  const filteredEvents = events?.filter(
    (evt) =>
      evt.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (evt.descripcion && evt.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (evt.lugar_evento && evt.lugar_evento.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Fecha por confirmar";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-900">
      {/* Navbar Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/60 border-b border-emerald-800/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-400 p-0.5 shadow-lg shadow-emerald-900/40">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Ticket className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-200 via-white to-amber-200 bg-clip-text text-transparent">
                CMG Eventos
              </h1>
              <p className="text-xs text-emerald-400/80 font-medium">Portal Oficial de Inscripciones</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-emerald-900/40 border border-emerald-800/40">
                <ShieldCheck className="w-4 h-4 mr-2 text-amber-400" />
                Panel Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden pt-12 pb-8 px-6 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <Badge className="bg-emerald-900/60 text-emerald-300 border-emerald-700/50 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400 inline" />
            Catálogo de Eventos Activos
          </Badge>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Encuentra tu próximo evento y <span className="bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300 bg-clip-text text-transparent">regístrate en segundos</span>
          </h2>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto">
            Explora las actividades, conferencias y retiros de nuestra congregación. Selecciona el evento de tu interés para completar tu inscripción y recibir tu pase con QR.
          </p>

          {/* Search bar */}
          <div className="pt-4 max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar eventos por nombre, lugar o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-6 bg-slate-900/80 border-emerald-700/40 rounded-xl text-slate-100 placeholder:text-slate-400 focus:border-amber-400 focus:ring-amber-400/20 shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content / Events Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 bg-slate-900/50 rounded-2xl animate-pulse border border-emerald-900/30" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-red-900/30 p-8 max-w-lg mx-auto">
            <p className="text-red-400 text-lg font-medium">No se pudieron cargar los eventos en este momento.</p>
            <p className="text-slate-400 text-sm mt-2">Por favor intenta de nuevo más tarde.</p>
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((evt) => (
              <Card
                key={evt.id}
                className="group relative overflow-hidden bg-slate-900/70 border-emerald-800/40 hover:border-amber-400/60 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-900/40 rounded-2xl flex flex-col justify-between backdrop-blur-md"
              >
                {/* Visual Header / Banner */}
                <div
                  className="h-44 w-full bg-cover bg-center relative overflow-hidden flex items-end p-4"
                  style={{
                    backgroundImage: evt.banner_url
                      ? `url(${evt.banner_url})`
                      : "linear-gradient(135deg, #083E30 0%, #041F18 100%)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  {evt.logo_url && (
                    <img
                      src={evt.logo_url}
                      alt={evt.nombre}
                      className="w-14 h-14 rounded-xl object-contain bg-slate-950/80 p-2 border border-emerald-500/30 relative z-10 shadow-md"
                    />
                  )}

                  <Badge className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 backdrop-blur-md px-3 py-1">
                    Inscripción abierta
                  </Badge>
                </div>

                <CardHeader className="space-y-2 pt-4">
                  <CardTitle className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                    {evt.nombre}
                  </CardTitle>
                  <p className="text-slate-300 text-sm line-clamp-2 min-h-[2.5rem]">
                    {evt.descripcion || "Participa en este gran evento. Inscríbete para asegurar tu cupo."}
                  </p>
                </CardHeader>

                <CardContent className="space-y-3 text-xs text-slate-300 border-t border-slate-800/60 pt-4 mt-auto">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="capitalize">{formatDate(evt.fecha_evento)}</span>
                  </div>
                  {evt.lugar_evento && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="line-clamp-1">{evt.lugar_evento}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-4">
                  <Link to={`/eventos/${evt.slug}`} className="w-full">
                    <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-900/50 rounded-xl group-hover:shadow-amber-400/20 transition-all flex items-center justify-center gap-2">
                      Inscribirme gratis
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-emerald-900/30 max-w-md mx-auto space-y-4">
            <Ticket className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-200">No se encontraron eventos</h3>
            <p className="text-slate-400 text-sm">
              {searchTerm ? "Prueba con otra búsqueda o limpia el filtro." : "Actualmente no hay eventos públicos disponibles."}
            </p>
            {searchTerm && (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="border-emerald-700 text-emerald-300">
                Limpiar filtro
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-900/40 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CMG Eventos. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/admin/login" className="hover:text-emerald-400 transition-colors">Administración</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EventCatalogPage;
