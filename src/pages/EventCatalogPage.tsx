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
    <div className="min-h-screen flex flex-col justify-between text-emerald-950 font-sans selection:bg-amber-300 selection:text-emerald-950">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-emerald-200/60 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-amber-500 p-0.5 shadow-md">
              <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center">
                <Ticket className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading text-emerald-900 tracking-tight">
                CMG Eventos
              </h1>
              <p className="text-xs text-emerald-700 font-medium">Portal de Inscripciones</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/login">
              <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 bg-white/80">
                <ShieldCheck className="w-4 h-4 mr-2 text-amber-600" />
                Panel Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden pt-10 pb-6 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-3 relative z-10">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600 inline" />
            Catálogo de Eventos Activos
          </Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold font-heading text-emerald-950 leading-tight">
            Próximos Eventos y Conferencias
          </h2>
          <p className="text-emerald-800 text-sm md:text-base max-w-xl mx-auto">
            Selecciona el evento al que deseas asistir para realizar tu inscripción y obtener tu pase de ingreso.
          </p>

          {/* Buscador */}
          <div className="pt-2 max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar eventos por nombre, lugar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-5 bg-white/90 border-emerald-300 rounded-xl text-emerald-950 placeholder:text-emerald-700/60 focus:border-emerald-600 focus:ring-emerald-500/20 shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Eventos */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 glass-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-10 glass-card rounded-2xl p-6 max-w-md mx-auto">
            <p className="text-red-600 text-sm font-semibold">No se pudieron cargar los eventos.</p>
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => (
              <Card
                key={evt.id}
                className="glass-card border-white/80 hover:border-emerald-400 transition-all duration-300 hover:shadow-xl rounded-2xl flex flex-col justify-between overflow-hidden"
              >
                {/* Header del Evento */}
                <div
                  className="h-40 w-full bg-cover bg-center relative overflow-hidden flex items-end p-4"
                  style={{
                    backgroundImage: evt.banner_url
                      ? `url(${evt.banner_url})`
                      : "linear-gradient(135deg, #083E30 0%, #0c5c47 100%)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/20 to-transparent" />
                  
                  {evt.logo_url && (
                    <img
                      src={evt.logo_url}
                      alt={evt.nombre}
                      className="w-12 h-12 rounded-lg object-contain bg-white/90 p-1.5 border border-white/60 relative z-10 shadow-sm"
                    />
                  )}

                  <Badge className="absolute top-3 right-3 bg-amber-400 text-emerald-950 font-bold border-amber-300 px-2.5 py-0.5 text-xs shadow-sm">
                    Inscripciones Abiertas
                  </Badge>
                </div>

                <CardHeader className="space-y-1 pt-4 pb-2">
                  <CardTitle className="text-lg font-bold font-heading text-emerald-950 line-clamp-1">
                    {evt.nombre}
                  </CardTitle>
                  <p className="text-emerald-800/80 text-xs line-clamp-2 min-h-[2rem]">
                    {evt.descripcion || "Participa en este evento especial. Asegura tu cupo realizando tu registro."}
                  </p>
                </CardHeader>

                <CardContent className="space-y-2 text-xs text-emerald-900 border-t border-emerald-100/80 pt-3 mt-auto">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="capitalize">{formatDate(evt.fecha_evento)}</span>
                  </div>
                  {evt.lugar_evento && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="line-clamp-1">{evt.lugar_evento}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3">
                  <Link to={`/eventos/${evt.slug}`} className="w-full">
                    <Button className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-md rounded-xl flex items-center justify-center gap-2">
                      Inscribirme gratis
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-card rounded-2xl max-w-md mx-auto space-y-3">
            <Ticket className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-base font-semibold text-emerald-950">No hay eventos disponibles</h3>
            <p className="text-emerald-700 text-xs">
              {searchTerm ? "Prueba cambiando el término de búsqueda." : "Vuelve pronto para consultar nuevos eventos."}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-200/60 bg-white/40 backdrop-blur-sm px-6 py-4 text-center text-xs text-emerald-800">
        <p>© {new Date().getFullYear()} CMG Eventos • Centro Mundial de Gloria</p>
      </footer>
    </div>
  );
};

export default EventCatalogPage;
