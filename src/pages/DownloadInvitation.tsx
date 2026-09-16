import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { formatFullName } from "@/lib/date-utils";

const DownloadInvitation = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRegistration = async () => {
      if (!id) {
        if (isMounted) {
          setError("Enlace inválido");
          setLoading(false);
        }
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("registrations")
        .select("nombres, apellidos, pdf_url")
        .eq("id", id)
        .single();

      if (fetchErr || !data) {
        if (isMounted) {
          setError("Invitación no encontrada");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setName(formatFullName(data.nombres, data.apellidos));
      }

      if (data.pdf_url) {
        if (isMounted) {
          setPdfUrl(data.pdf_url);
          setLoading(false);
        }
      } else {
        // PDF not generated yet: generate on demand
        if (isMounted) {
          setGenerating(true);
          setLoading(false);
        }
        try {
          const { data: genData, error: genErr } = await supabase.functions.invoke("generate-invitation", {
            body: { registrationId: id },
          });
          if (!genErr && genData?.pdfUrl && isMounted) {
            setPdfUrl(genData.pdfUrl);
          } else {
            // Polling fallback
            for (let i = 0; i < 8; i++) {
              await new Promise((r) => setTimeout(r, 2000));
              const { data: recheck } = await supabase
                .from("registrations")
                .select("pdf_url")
                .eq("id", id)
                .single();
              if (recheck?.pdf_url && isMounted) {
                setPdfUrl(recheck.pdf_url);
                break;
              }
            }
          }
        } catch (_) {}
        if (isMounted) setGenerating(false);
      }
    };

    fetchRegistration();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="orb orb-1" /><div className="orb orb-2" />
        <AlertCircle className="relative z-10 h-12 w-12 text-destructive mb-4" />
        <h1 className="relative z-10 text-xl font-bold text-foreground mb-2">{error}</h1>
        <p className="relative z-10 text-muted-foreground">El enlace puede ser incorrecto o la invitación ya no está disponible.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <div className="relative z-10 glass-card rounded-2xl p-10 max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 mx-auto">
          <Download className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold font-heading text-foreground mb-2">
          Invitación de {name}
        </h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Haz clic en el botón para descargar tu invitación en formato PDF.
        </p>
        {pdfUrl ? (
          <Button size="lg" asChild className="w-full">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-5 w-5" />
              Descargar Invitación
            </a>
          </Button>
        ) : generating ? (
          <Button size="lg" className="w-full" disabled>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generando pase oficial...
          </Button>
        ) : (
          <p className="text-muted-foreground">La invitación aún se está generando. Por favor intenta en unos segundos.</p>
        )}
      </div>
    </div>
  );
};

export default DownloadInvitation;
