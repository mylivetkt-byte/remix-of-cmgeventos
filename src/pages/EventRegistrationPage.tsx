import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useEventBySlug } from "@/hooks/useEvents";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";
import { RetiroSanidadForm } from "@/components/registration/RetiroSanidadForm";
import { SuccessScreen } from "@/components/registration/SuccessScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Ticket, AlertCircle, Sparkles } from "lucide-react";

interface SuccessData {
  nombres: string;
  pdfUrl: string | null;
  registrationId: string;
}

export const EventRegistrationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, isError } = useEventBySlug(slug);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
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

  const getWhatsAppUrl = () => {
    if (!successData || !event) return "";
    const msg = event.mensaje_whatsapp || "Hola, aquí está mi invitación al evento.";
    const downloadUrl = `${window.location.origin}/descargar/${successData.registrationId}`;
    return `https://wa.me/?text=${encodeURIComponent(`${msg} ${downloadUrl}`)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-emerald-950">
        <AlertCircle className="w-14 h-14 text-amber-600 mb-3" />
        <h2 className="text-2xl font-bold font-heading mb-2">Evento no encontrado</h2>
        <p className="text-emerald-800 text-sm mb-6 max-w-md">
          El evento al que intentas acceder no se encuentra activo en este momento.
        </p>
        <Link to="/">
          <Button className="bg-emerald-800 hover:bg-emerald-900 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al catálogo
          </Button>
        </Link>
      </div>
    );
  }

  const isDefaultEvent = !event.slug || event.slug === "evento-principal" || event.slug === "evento-default";
  const isRetiroSanidad = event.slug ? event.slug.includes("retiro-sanidad") : false;

  return (
    <div className="min-h-screen py-6 px-4 flex flex-col items-center justify-between font-sans selection:bg-amber-300">
      {/* Botón superior de volver */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between mb-4">
        <Link to="/">
          <Button variant="outline" size="sm" className="bg-white/90 border-emerald-300 text-emerald-900 hover:bg-emerald-50 shadow-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Ver catálogo de eventos
          </Button>
        </Link>

        {event.es_de_pago ? (
          <Badge className="bg-amber-400 text-emerald-950 border-amber-300 font-black px-3.5 py-1 text-xs shadow-sm">
            Entrada: {new Intl.NumberFormat("es-CO", { style: "currency", currency: event.moneda || "COP", maximumFractionDigits: 0 }).format(event.precio || 0)}
          </Badge>
        ) : (
          <Badge className="bg-emerald-600 text-white border-emerald-500 font-extrabold px-3 py-1 text-xs shadow-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Registro Gratuito
          </Badge>
        )}
      </div>

      {/* Contenedor principal de Evento */}
      <div className="w-full max-w-2xl mx-auto space-y-5">
        {/* Banner Ilustrado del Evento (Ajuste Perfecto Completo) */}
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/80 glass-card bg-emerald-950/90 relative">
          <div className="h-72 md:h-96 w-full relative flex items-end p-6 md:p-8 overflow-hidden">
            {/* Fondo difuminado para bordes */}
            <img
              src={event.banner_url || event.logo_url || '/images/default_event_banner.jpg'}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-45 scale-110 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-transparent to-black/20" />

            {/* Imagen Principal Adaptable Completa */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src={event.banner_url || event.logo_url || '/images/default_event_banner.jpg'}
                alt={event.nombre}
                className="max-h-full max-w-full object-contain drop-shadow-2xl rounded-2xl"
              />
            </div>

            <div className="relative z-10 flex items-center gap-4 text-white">
              {event.logo_url && event.banner_url && event.logo_url !== event.banner_url && (
                <img
                  src={event.logo_url}
                  alt={event.nombre}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-contain bg-white p-1.5 border-2 border-amber-400 shadow-xl shrink-0"
                />
              )}

              <div className="bg-emerald-950/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <h1 className="text-xl md:text-2xl font-black font-heading leading-tight text-white">
                  {event.nombre}
                </h1>
                <p className="text-xs text-amber-300 font-semibold mt-0.5">Centro Mundial de Gloria</p>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-6 bg-white/90 space-y-3">
            {event.descripcion && (
              <p className="text-xs md:text-sm text-emerald-900 leading-relaxed font-normal">{event.descripcion}</p>
            )}

            {/* Instrucciones de Pago */}
            {event.es_de_pago && (
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 space-y-1.5 text-xs text-amber-950 shadow-sm">
                <div className="font-bold flex items-center gap-2 text-amber-900">
                  <Ticket className="w-4 h-4 text-amber-600" />
                  Instrucciones de Pago ({new Intl.NumberFormat("es-CO", { style: "currency", currency: event.moneda || "COP", maximumFractionDigits: 0 }).format(event.precio || 0)})
                </div>
                {event.instrucciones_pago ? (
                  <p className="whitespace-pre-line text-emerald-950 leading-relaxed">{event.instrucciones_pago}</p>
                ) : (
                  <p className="text-slate-600">Realiza tu transferencia a las cuentas oficiales de la iglesia para confirmar tu boleta.</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-950 font-semibold pt-1">
              {event.fecha_evento && (
                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span className="capitalize">{formatDate(event.fecha_evento)}</span>
                </div>
              )}
              {event.lugar_evento && (
                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>{event.lugar_evento}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tarjeta del Formulario */}
        <div className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-white/90">
          {successData ? (
            <SuccessScreen
              nombres={successData.nombres}
              pdfUrl={successData.pdfUrl}
              whatsappUrl={getWhatsAppUrl()}
              onReset={() => setSuccessData(null)}
              registrationId={successData.registrationId}
            />
          ) : isRetiroSanidad ? (
            <RetiroSanidadForm eventId={event.id} onSuccess={setSuccessData} />
          ) : isDefaultEvent ? (
            <RegistrationForm onSuccess={setSuccessData} />
          ) : (
            <DynamicRegistrationForm eventId={event.id} onSuccess={setSuccessData} />
          )}
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-emerald-800 font-medium">
        CMG Eventos • Centro Mundial de Gloria
      </footer>
    </div>
  );
};

export default EventRegistrationPage;
