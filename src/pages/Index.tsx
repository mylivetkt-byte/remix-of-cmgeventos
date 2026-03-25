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
      <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="relative z-10 w-full max-w-lg glass-card rounded-2xl">
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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="relative z-10 w-full max-w-lg glass-card rounded-2xl shadow-2xl">
        <RegistrationForm onSuccess={setSuccessData} />
      </div>
    </div>
  );
};

export default Index;
