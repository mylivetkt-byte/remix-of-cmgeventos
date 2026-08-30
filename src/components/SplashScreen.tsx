import { useState, useEffect } from "react";
import { DoxaLogo } from "./DoxaLogo";
import { Sparkles } from "lucide-react";

interface SplashScreenProps {
  duration?: number;
  subtitle?: string;
}

export const SplashScreen = ({ duration = 2200, subtitle = "Cargando formulario de registro..." }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animación de barra de progreso fluida
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, duration / 22);

    // Inicio de desvanecimiento suave
    const fadeTimer = setTimeout(() => setFadeOut(true), duration - 400);

    // Desaparición completa
    const removeTimer = setTimeout(() => setVisible(false), duration);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-500 selection:bg-none ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Resplandor circular dorado en el fondo */}
      <div className="absolute w-96 h-96 bg-amber-600/15 rounded-full blur-3xl animate-pulse pointer-events-none" />

      {/* Contenedor central de la animación */}
      <div className="relative flex flex-col items-center gap-6 p-6 z-10 max-w-sm w-full text-center">
        {/* Logo metálico con animación de escala y destello */}
        <div className="relative transform transition-all duration-700 animate-fade-in drop-shadow-2xl">
          <DoxaLogo className="w-72 sm:w-80 h-auto mx-auto object-contain rounded-xl shadow-2xl" />
          
          {/* Brillo de barrido diagonal */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
        </div>

        {/* Subtítulo y animación de carga */}
        <div className="space-y-3 w-full pt-2">
          <p className="text-xs sm:text-sm font-bold text-amber-200/90 tracking-wide flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{subtitle}</span>
          </p>

          {/* Barra de progreso dorada en gradiente */}
          <div className="w-full bg-slate-900 border border-amber-900/40 rounded-full h-2 overflow-hidden p-0.5 shadow-inner">
            <div
              className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 h-full rounded-full transition-all duration-150 ease-out shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest pt-1">
            Centro Mundial de Gloria • Doxa Eventos
          </p>
        </div>
      </div>
    </div>
  );
};
