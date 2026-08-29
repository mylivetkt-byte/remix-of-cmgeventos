import { useState } from "react";
import { Link } from "react-router-dom";
import { useEvents } from "@/hooks/useEvents";
import { Search, Calendar, MapPin, Ticket, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, QrCode, Heart } from "lucide-react";
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
    <div className="min-h-screen flex flex-col justify-between font-sans selection:bg-amber-300 selection:text-emerald-950">
      {/* Sticky Glass Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-emerald-200/60 px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-800 via-emerald-600 to-amber-500 p-0.5 shadow-md">
              <div className="h-full w-full bg-white rounded-[10px] flex items-center justify-center">
                <Ticket className="h-6 w-6 text-emerald-800" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-heading text-emerald-950 tracking-tight flex items-center gap-2">
                CMG Eventos
                <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-sans font-bold">
                  Oficial
                </span>
              </h1>
              <p className="text-xs text-emerald-700 font-medium">Centro Mundial de Gloria</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/login">
              <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-900 hover:bg-emerald-50 bg-white/90 shadow-sm font-medium">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-amber-600" />
                Panel Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section con Imagen de Portada Principal */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4 w-full">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-emerald-800/20 text-white">
          {/* Imagen de fondo del Hero */}
          <div
            className="absolute inset-0 bg-cover bg-center transform scale-105 transition-transform duration-1000"
            style={{ backgroundImage: "url('/images/hero_events_banner.jpg')" }}
          />
          {/* Capa de degradado profesional */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/80 to-slate-950/90" />

          {/* Contenido del Hero */}
          <div className="relative z-10 px-6 py-12 md:py-16 md:px-12 max-w-3xl space-y-5">
            <Badge className="bg-amber-400 text-emerald-950 font-bold border-amber-300 px-3.5 py-1 text-xs uppercase tracking-wider shadow-md">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-950 inline" />
              Catálogo de Eventos & Conferencias
            </Badge>

            <h2 className="text-3xl md:text-5xl font-black font-heading text-white leading-tight drop-shadow-sm">
              Conéctate, Participa e <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-200 bg-clip-text text-transparent">Inscríbete en Segundos</span>
            </h2>

            <p className="text-slate-200 text-sm md:text-base leading-relaxed font-normal max-w-2xl">
              Bienvenido al portal oficial del Centro Mundial de Gloria. Explora nuestros retiros, congresos y reuniones especiales. Selecciona tu evento para obtener tu pase con código QR instantáneo.
            </p>

            {/* Buscador Integrado en Hero */}
            <div className="pt-2 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar evento por nombre, tema o lugar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-6 bg-white/95 border-2 border-amber-400/80 rounded-2xl text-emerald-950 placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/30 shadow-xl font-medium"
                />
              </div>
            </div>

            {/* Tarjetas informativas de características */}
            <div className="pt-4 flex flex-wrap gap-4 text-xs font-semibold text-emerald-100">
              <div className="flex items-center gap-2 bg-emerald-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-700/50">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Inscripción 100% Gratuita</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-700/50">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Pase QR Digital al Instante</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-700/50">
                <Heart className="w-4 h-4 text-amber-400" />
                <span>Ambiente de Bendición</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Tarjetas de Eventos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold font-heading text-emerald-950">Próximos Eventos Disponibles</h3>
            <p className="text-xs text-emerald-700 font-medium">Haz clic en "Inscribirme gratis" para llenar el formulario</p>
          </div>
          {filteredEvents && (
            <Badge variant="outline" className="border-emerald-300 text-emerald-900 bg-white font-bold px-3 py-1">
              {filteredEvents.length} {filteredEvents.length === 1 ? "evento disponible" : "eventos disponibles"}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 glass-card rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12 glass-card rounded-3xl p-6 max-w-md mx-auto">
            <p className="text-red-600 text-sm font-semibold">No se pudieron cargar los eventos en este momento.</p>
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((evt) => (
              <Card
                key={evt.id}
                className="glass-card border-white/90 hover:border-amber-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 rounded-3xl flex flex-col justify-between overflow-hidden group"
              >
                {/* Portada / Banner del Evento */}
                <div
                  className="h-48 w-full bg-cover bg-center relative overflow-hidden flex items-end p-4 transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${evt.banner_url || '/images/default_event_banner.jpg'})`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/40 to-transparent" />
                  
                  {/* Badge de Inscripción y Precio */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {evt.es_de_pago ? (
                      <Badge className="bg-amber-400 text-emerald-950 font-black border-amber-300 px-3 py-1 text-xs shadow-md">
                        {new Intl.NumberFormat("es-CO", { style: "currency", currency: evt.moneda || "COP", maximumFractionDigits: 0 }).format(evt.precio || 0)}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white font-extrabold border-emerald-500 px-3 py-1 text-xs shadow-md">
                        Gratis
                      </Badge>
                    )}
                  </div>

                  {/* Logo Avatar */}
                  <div className="relative z-10 flex items-center gap-3">
                    {evt.logo_url ? (
                      <img
                        src={evt.logo_url}
                        alt={evt.nombre}
                        className="w-14 h-14 rounded-2xl object-contain bg-white/95 p-1.5 border-2 border-amber-400 shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                          <Ticket className="w-6 h-6 text-emerald-800" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <CardHeader className="space-y-2 pt-4 pb-2 px-6">
                  <CardTitle className="text-xl font-bold font-heading text-emerald-950 group-hover:text-emerald-800 transition-colors line-clamp-1">
                    {evt.nombre}
                  </CardTitle>
                  <p className="text-emerald-800/90 text-xs leading-relaxed line-clamp-2 min-h-[2.5rem]">
                    {evt.descripcion || "Participa en este evento especial de nuestra iglesia. Inscríbete gratis para reservar tu lugar."}
                  </p>
                </CardHeader>

                <CardContent className="space-y-2.5 text-xs text-emerald-950 border-t border-emerald-200/60 pt-3.5 mx-6 mt-auto">
                  <div className="flex items-center gap-2 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                    <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="capitalize font-semibold text-emerald-900">{formatDate(evt.fecha_evento)}</span>
                  </div>
                  {evt.lugar_evento && (
                    <div className="flex items-center gap-2 bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                      <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="line-clamp-1 font-semibold text-amber-950">{evt.lugar_evento}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-4 px-6 pb-6">
                  <Link to={`/eventos/${evt.slug}`} className="w-full">
                    <Button className="w-full bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-2 group-hover:shadow-xl transition-all">
                      Inscribirme gratis
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-amber-400" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 glass-card rounded-3xl max-w-md mx-auto space-y-4">
            <Ticket className="w-12 h-12 text-emerald-700 mx-auto" />
            <h3 className="text-lg font-bold font-heading text-emerald-950">No hay eventos encontrados</h3>
            <p className="text-emerald-800 text-xs">
              {searchTerm ? "Intenta buscando con otro término." : "Actualmente no se han publicado eventos activos."}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-200/60 bg-white/60 backdrop-blur-md px-6 py-5 text-center text-xs text-emerald-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} CMG Eventos • Centro Mundial de Gloria. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-emerald-900 font-medium">
            <Link to="/admin/login" className="hover:text-amber-600 transition-colors">Administración</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EventCatalogPage;
