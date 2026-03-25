import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertCircle } from "lucide-react";

const DownloadInvitation = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRegistration = async () => {
      if (!id) {
        setError("Enlace inválido");
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("registrations")
        .select("nombres, apellidos, pdf_url")
        .eq("id", id)
        .single();

      if (fetchErr || !data) {
        setError("Invitación no encontrada");
      } else {
        setName(`${data.nombres} ${data.apellidos}`);
        setPdfUrl(data.pdf_url);
      }
      setLoading(false);
    };

    fetchRegistration();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">{error}</h1>
        <p className="text-muted-foreground">El enlace puede ser incorrecto o la invitación ya no está disponible.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Download className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold font-heading text-foreground mb-2">
        Invitación de {name}
      </h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Haz clic en el botón para descargar tu invitación en formato PDF.
      </p>
      {pdfUrl ? (
        <Button size="lg" asChild>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-5 w-5" />
            Descargar Invitación
          </a>
        </Button>
      ) : (
        <p className="text-muted-foreground">La invitación aún se está generando. Intenta de nuevo en unos segundos.</p>
      )}
    </div>
  );
};

export default DownloadInvitation;
