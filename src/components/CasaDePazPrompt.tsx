import { useEffect, useState } from "react";
import { Church, X, ArrowDown } from "lucide-react";

/**
 * Popup flotante animado que aparece al hacer scroll por el catálogo
 * y lleva al usuario al formulario de Casa de Paz.
 */
export const CasaDePazPrompt = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (dismissed) return;
      const grid = document.getElementById("eventos-grid");
      const form = document.getElementById("casa-de-paz");
      if (!grid || !form) return;

      const gridBottom = grid.getBoundingClientRect().bottom;
      const formTop = form.getBoundingClientRect().top;

      // Mostrar cuando el usuario ya vio buena parte de los eventos
      // y aún no llega al formulario
      const passedEvents = gridBottom < window.innerHeight * 0.9;
      const formNotVisible = formTop > window.innerHeight * 0.6;
      setVisible(passedEvents && formNotVisible);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  const goToForm = () => {
    document.getElementById("casa-de-paz")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setVisible(false);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 transition-all duration-500 ease-out ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-8 pointer-events-none"
      }`}
    >
      <div className="relative flex items-center gap-3 bg-teal-700 text-white pl-4 pr-3 py-3 rounded-2xl shadow-2xl border-2 border-amber-300 animate-[bounce-soft_2s_ease-in-out_infinite]">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Church className="w-5 h-5 text-amber-300" />
        </div>
        <div className="leading-tight">
          <p className="font-extrabold text-sm sm:text-base">¿Sin Casa de Paz?</p>
          <p className="text-[11px] sm:text-xs text-teal-100 font-medium">
            Regístrate y te contactamos
          </p>
        </div>
        <button
          onClick={goToForm}
          className="ml-1 flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-teal-950 font-extrabold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition-colors shadow-md"
        >
          Ir al formulario
          <ArrowDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Cerrar aviso"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-teal-800 flex items-center justify-center shadow-md hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CasaDePazPrompt;
