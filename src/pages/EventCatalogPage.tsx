import { useState } from "react";
import { Link } from "react-router-dom";
import { useEvents } from "@/hooks/useEvents";
import { Search, Calendar, MapPin, Ticket, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, QrCode, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BannerCarousel } from "@/components/BannerCarousel";
import { SplashScreen } from "@/components/SplashScreen";

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
    <div className="min-h-screen font-sans bg-slate-50 text-slate-900 selection:bg-teal-200">
      {/* Intro Animada con Logo Metálico DOXA EVENTOS */}
      <SplashScreen subtitle="Cargando catálogo de eventos DOXA..." />
      {/* Navbar Limpia en Blanco Pulcro (Estilo iglesiacmg.lovable.app) */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-slate-200/80 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shadow-xs shrink-0">
              <Ticket className="h-5 h-5 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black font-heading text-slate-900 tracking-tight">
                  Doxa Eventos
                </h1>
                <Badge className="bg-teal-100 text-teal-900 font-bold border-teal-300 text-[10px] px-2 py-0.5 shadow-none">
                  OFICIAL
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">Centro Mundial de Gloria</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/login">
              <Button variant="outline" size="sm" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl shadow-xs">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-teal-600" />
                Panel Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section con Carrusel de Banners (Pastor Carlos Delgado & Pastora Tania Grimaldos) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4 w-full space-y-6">
        <BannerCarousel />

        <div className="relative rounded-3xl overflow-hidden shadow-xs border border-slate-200/80 bg-white p-8 md:p-12">
          {/* Luz ambiental difuminada */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Contenido del Hero */}
          <div className="relative z-10 max-w-3xl space-y-6">
            <Badge className="bg-teal-100 text-teal-950 font-extrabold border-teal-200 px-4 py-1.5 text-xs uppercase tracking-wider shadow-xs inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-700" />
              Catálogo de Eventos & Conferencias
            </Badge>

            <h2 className="text-3xl md:text-5xl font-black font-heading text-slate-900 leading-tight">
              Conéctate, Participa e{" "}
              <span className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 bg-clip-text text-transparent">
                Inscríbete en Segundos
              </span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium max-w-2xl">
              Bienvenido al portal oficial del Centro Mundial de Gloria. Explora nuestros retiros, congresos y reuniones especiales. Selecciona tu evento para obtener tu pase con código QR instantáneo.
            </p>

            {/* Buscador Integrado en Hero */}
            <div className="pt-2 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-700 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar evento por nombre, tema o lugar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 h-14 bg-slate-50/80 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white shadow-xs font-semibold text-sm sm:text-base transition-all"
                />
              </div>
            </div>

            {/* Píldoras de ventajas */}
            <div className="pt-2 flex flex-wrap gap-3 text-xs sm:text-sm font-bold text-slate-700">
              <div className="flex items-center gap-2 bg-slate-100/90 px-4 py-2 rounded-xl border border-slate-200/80">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>Inscripción Rápida</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-100/90 px-4 py-2 rounded-xl border border-slate-200/80">
                <QrCode className="w-4 h-4 text-teal-700" />
                <span>Pase QR Digital al Instante</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-100/90 px-4 py-2 rounded-xl border border-slate-200/80">
                <Heart className="w-4 h-4 text-teal-700" />
                <span>Ambiente de Bendición</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Tarjetas de Eventos en Tarjetas Blancas Pulcras */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-heading text-slate-900">Próximos Eventos Disponibles</h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Haz clic en "Inscribirme al Evento" para llenar el formulario</p>
          </div>
          {filteredEvents && (
            <Badge variant="outline" className="border-slate-200 text-slate-700 bg-white font-bold px-3.5 py-1.5 text-xs shadow-xs rounded-xl">
              {filteredEvents.length} {filteredEvents.length === 1 ? "evento activo" : "eventos activos"}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 bg-white border border-slate-200 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto shadow-xs">
            <p className="text-red-600 text-sm font-bold">No se pudieron cargar los eventos en este momento.</p>
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((evt) => (
              <Card
                key={evt.id}
                className="bg-white border border-slate-200/90 hover:border-teal-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-3xl flex flex-col justify-between overflow-hidden group shadow-xs"
              >
                {/* Portada / Banner del Evento (Altura Ampliada h-80 sm:h-[400px] para mayor visibilidad) */}
                <div className="h-80 sm:h-[400px] w-full relative overflow-hidden flex items-end p-4 bg-slate-900 group rounded-t-3xl">
                  {/* Fondo difuminado de relleno */}
                  <img
                    src={evt.banner_url || evt.logo_url || '/images/default_event_banner.jpg'}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110 pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/20" />

                  {/* Imagen Principal Ajustada Completa (Sin Cortar Afiches) */}
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    <img
                      src={evt.banner_url || evt.logo_url || '/images/default_event_banner.jpg'}
                      alt={evt.nombre}
                      className="max-h-full max-w-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 rounded-xl"
                    />
                  </div>

                  {/* Badge de Inscripción y Precio */}
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-20">
                    {evt.es_de_pago ? (
                      <Badge className="bg-amber-400 text-slate-950 font-black border-amber-300 px-3.5 py-1.5 text-xs sm:text-sm shadow-md">
                        {new Intl.NumberFormat("es-CO", { style: "currency", currency: evt.moneda || "COP", maximumFractionDigits: 0 }).format(evt.precio || 0)}
                      </Badge>
                    ) : (
                      <Badge className="bg-teal-600 text-white font-extrabold border-teal-500 px-3.5 py-1.5 text-xs sm:text-sm shadow-md">
                        Gratis
                      </Badge>
                    )}
                  </div>

                  {/* Badge de Logo en Esquina */}
                  {evt.logo_url && evt.banner_url && evt.logo_url !== evt.banner_url && (
                    <div className="relative z-20 flex items-center gap-3">
                      <img
                        src={evt.logo_url}
                        alt={evt.nombre}
                        className="w-14 h-14 rounded-2xl object-contain bg-white/95 p-1 border-2 border-teal-500 shadow-xl"
                      />
                    </div>
                  )}
                </div>

                <CardHeader className="space-y-2 pt-5 pb-2 px-6">
                  <CardTitle className="text-xl font-black font-heading text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1">
                    {evt.nombre}
                  </CardTitle>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-2 min-h-[2.5rem] font-medium">
                    {evt.descripcion || "Participa en este evento especial de nuestra iglesia. Inscríbete gratis para reservar tu lugar."}
                  </p>
                </CardHeader>

                <CardContent className="space-y-2.5 text-xs sm:text-sm text-slate-900 border-t border-slate-100 pt-4 mx-6 mt-auto">
                  <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
                    <span className="capitalize font-semibold text-slate-800">{formatDate(evt.fecha_evento)}</span>
                  </div>
                  {evt.lugar_evento && (
                    <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                      <span className="line-clamp-1 font-semibold text-slate-800">{evt.lugar_evento}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-5 px-6 pb-6">
                  <Link to={`/eventos/${evt.slug}`} className="w-full">
                    <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold h-12 text-sm sm:text-base rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2">
                      Inscribirme al Evento
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-teal-200" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl max-w-md mx-auto space-y-4 shadow-xs">
            <Ticket className="w-12 h-12 text-teal-700 mx-auto" />
            <h3 className="text-lg font-bold font-heading text-slate-900">No hay eventos encontrados</h3>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">
              {searchTerm ? "Intenta buscando con otro término." : "Actualmente no se han publicado eventos activos."}
            </p>
          </div>
        )}
      </main>

      {/* Footer Limpio */}
      <footer className="border-t border-slate-200/80 bg-white px-6 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Doxa Eventos • Centro Mundial de Gloria. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-slate-700 font-semibold">
            <Link to="/admin/login" className="hover:text-teal-700 transition-colors">Administración</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EventCatalogPage;
