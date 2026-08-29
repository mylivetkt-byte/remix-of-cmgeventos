import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Evento no encontrado</h2>
        <p className="text-slate-400 mb-6 max-w-md">
          El evento que buscas no existe o ha finalizado. Regresa al catálogo para ver los eventos disponibles.
        </p>
        <Link to="/">
          <Button className="bg-emerald-600 hover:bg-emerald-500">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al catálogo
          </Button>
        </Link>
      </div>
    );
  }

  // Determine form component to render
  const isDefaultEvent = !event.slug || event.slug === "evento-principal" || event.slug === "evento-default";
  const isRetiroSanidad = event.slug ? event.slug.includes("retiro-sanidad") : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-slate-100 py-8 px-4 flex flex-col items-center justify-between">
      {/* Header bar */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between mb-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-emerald-900/40 border border-emerald-800/40">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ver todos los eventos
          </Button>
        </Link>
        
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-950/60 px-3 py-1">
          <Ticket className="w-3.5 h-3.5 mr-1 text-amber-400" />
          Registro Abierto
        </Badge>
      </div>

      {/* Main card */}
      <div className="w-full max-w-2xl mx-auto">
        {/* Banner / Title Header */}
        <div className="bg-slate-900/90 border border-emerald-800/50 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md mb-6">
          <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-950/80 to-slate-900/90 relative">
            {event.logo_url && (
              <img
                src={event.logo_url}
                alt={event.nombre}
                className="h-16 w-auto mb-4 object-contain"
              />
            )}
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
              {event.nombre}
            </h1>
            {event.descripcion && (
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
                {event.descripcion}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-emerald-300 font-medium pt-2 border-t border-emerald-800/40">
              {event.fecha_evento && (
                <div className="flex items-center gap-2 bg-emerald-900/40 px-3 py-1.5 rounded-lg border border-emerald-700/30">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="capitalize">{formatDate(event.fecha_evento)}</span>
                </div>
              )}
              {event.lugar_evento && (
                <div className="flex items-center gap-2 bg-emerald-900/40 px-3 py-1.5 rounded-lg border border-emerald-700/30">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>{event.lugar_evento}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form or Success Screen */}
        <div className="glass-card rounded-2xl p-6 md:p-8 border border-emerald-800/40 shadow-2xl">
          {successData ? (
            <SuccessScreen
              nombres={successData.nombres}
              pdfUrl={successData.pdfUrl}
              whatsappUrl={getWhatsAppUrl()}
              onReset={() => setSuccessData(null)}
              registrationId={successData.registrationId}
            />
          ) : isRetiroSanidad ? (
            <RetiroSanidadForm
              eventId={event.id}
              onSuccess={setSuccessData}
            />
          ) : isDefaultEvent ? (
            <RegistrationForm
              onSuccess={setSuccessData}
            />
          ) : (
            <DynamicRegistrationForm
              eventId={event.id}
              onSuccess={setSuccessData}
            />
          )}
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-500">
        CMG Eventos • Formulario Seguro de Registro
      </footer>
    </div>
  );
};

export default EventRegistrationPage;
