import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useEventBySlug } from "@/hooks/useEvents";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";
import { RetiroSanidadForm } from "@/components/registration/RetiroSanidadForm";
import { SuccessScreen } from "@/components/registration/SuccessScreen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Ticket, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-between font-sans">
      {/* Botón superior de volver */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between mb-4">
        <Link to="/">
          <Button variant="outline" size="sm" className="bg-white/80 border-emerald-300 text-emerald-900 hover:bg-emerald-50">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Ver eventos
          </Button>
        </Link>

        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 px-3 py-1 font-medium">
          <Ticket className="w-3.5 h-3.5 mr-1 text-amber-600" />
          Inscripciones abiertas
        </Badge>
      </div>

      {/* Tarjeta principal glass */}
      <div className="w-full max-w-xl mx-auto">
        {/* Cabecera del evento */}
        <div className="glass-card rounded-2xl p-6 mb-4 shadow-lg border border-white/80">
          <div className="flex flex-col items-center text-center space-y-2">
            {event.logo_url && (
              <img src={event.logo_url} alt={event.nombre} className="h-16 w-auto object-contain mb-2" />
            )}
            <h1 className="text-2xl font-bold font-heading text-emerald-950">{event.nombre}</h1>
            {event.descripcion && (
              <p className="text-xs text-emerald-800/80 leading-relaxed max-w-md">{event.descripcion}</p>
            )}

            <div className="flex flex-wrap justify-center items-center gap-3 text-xs text-emerald-900 font-medium pt-2">
              {event.fecha_evento && (
                <div className="flex items-center gap-1.5 bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="capitalize">{formatDate(event.fecha_evento)}</span>
                </div>
              )}
              {event.lugar_evento && (
                <div className="flex items-center gap-1.5 bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>{event.lugar_evento}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contenido del Formulario */}
        <div className="glass-card rounded-2xl p-6 md:p-8 shadow-xl border border-white/80">
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

      <footer className="mt-6 text-center text-xs text-emerald-800/60">
        CMG Eventos • Centro Mundial de Gloria
      </footer>
    </div>
  );
};

export default EventRegistrationPage;
