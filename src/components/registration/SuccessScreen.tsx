import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, MessageCircle, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  nombres: string;
  pdfUrl: string | null;
  whatsappUrl: string;
  onReset: () => void;
  registrationId: string;
}

export function SuccessScreen({ nombres, whatsappUrl, onReset, registrationId }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poll = async () => {
      for (let i = 0; i < 15; i++) {
        const { data } = await supabase
          .from("registrations")
          .select("pdf_url")
          .eq("id", registrationId)
          .single();
        if (data?.pdf_url) {
          setPdfUrl(data.pdf_url);
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      setLoading(false);
    };
    poll();
  }, [registrationId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-10 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
        <CheckCircle className="w-12 h-12 text-success" />
      </div>

      <h1 className="text-2xl font-bold font-heading text-foreground mb-2">
        ¡Registro Exitoso!
      </h1>

      <p className="text-muted-foreground mb-2 max-w-sm">
        Gracias, <span className="font-semibold text-foreground">{nombres}</span>. Tu registro ha sido completado.
      </p>

      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        Tu invitación está siendo generada. También puedes descargarla o compartirla por WhatsApp.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {loading ? (
          <Button size="lg" className="w-full" disabled>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generando invitación...
          </Button>
        ) : pdfUrl ? (
          <Button size="lg" className="w-full" asChild>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-5 w-5" />
              Descargar Invitación
            </a>
          </Button>
        ) : (
          <Button size="lg" className="w-full" variant="outline" disabled>
            Invitación no disponible
          </Button>
        )}

        <Button size="lg" variant="whatsapp" className="w-full" asChild>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-5 w-5" />
            Compartir por WhatsApp
          </a>
        </Button>

        <Button size="lg" variant="outline" className="w-full" onClick={onReset}>
          <RotateCcw className="mr-2 h-5 w-5" />
          Nuevo Registro
        </Button>
      </div>
    </div>
  );
}
