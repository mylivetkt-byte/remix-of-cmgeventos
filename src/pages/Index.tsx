import { useState } from "react";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { SuccessScreen } from "@/components/registration/SuccessScreen";
import { useEventConfig } from "@/hooks/useCatalogs";

interface SuccessData {
  nombres: string;
  pdfUrl: string | null;
  registrationId: string;
}

const Index = () => {
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const eventConfig = useEventConfig();

  const getWhatsAppUrl = () => {
    if (!successData) return "";
    const msg = eventConfig.data?.mensaje_whatsapp || "Hola, aquí está mi invitación al evento.";
    const downloadUrl = `${window.location.origin}/descargar/${successData.registrationId}`;
    const fullMsg = `${msg} ${downloadUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(fullMsg)}`;
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <SuccessScreen
            nombres={successData.nombres}
            pdfUrl={successData.pdfUrl}
            whatsappUrl={getWhatsAppUrl()}
            onReset={() => setSuccessData(null)}
            registrationId={successData.registrationId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <RegistrationForm onSuccess={setSuccessData} />
    </div>
  );
};

export default Index;
