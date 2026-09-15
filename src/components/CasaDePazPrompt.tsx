import { useEffect, useState } from "react";
import { Church, X, ArrowDown } from "lucide-react";

/**
 * Burbuja flotante expandible que aparece al hacer scroll por el catálogo
 * y lleva al usuario al formulario de Casa de Paz.
 */
export const CasaDePazPrompt = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (dismissed) return;
      const grid = document.getElementById("eventos-grid");
      const form = document.getElementById("casa-de-paz");
      if (!grid || !form) return;

      const gridRect = grid.getBoundingClientRect();
      const formTop = form.getBoundingClientRect().top;

      // Mostrar apenas el usuario empieza a recorrer el catálogo
      const gridHeight = gridRect.height || 1;
      const scrolledIntoGrid = window.innerHeight - gridRect.top;
      const ratio = scrolledIntoGrid / gridHeight;
      const passedEvents = ratio > 0.05;
      const formNotVisible = formTop > window.innerHeight * 0.8;
      setVisible(passedEvents && formNotVisible);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  const goToForm = () => {
    document.getElementById("casa-de-paz")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setVisible(false);
    setExpanded(false);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-500 ease-out ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-6 pointer-events-none"
      }`}
      // Posición más arriba y a la derecha en móvil; centrado abajo en desktop
      style={{ bottom: "7rem", right: "1rem" }}
    >
      {expanded ? (
        <div className="relative flex items-center gap-3 bg-white text-slate-800 pl-4 pr-3 py-3 rounded-2xl shadow-2xl border-2 border-amber-300 max-w-[18rem]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center shrink-0 shadow-md">
            <Church className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex flex-col">
            <p className="font-extrabold text-xs leading-tight text-teal-900">
              ¿Sin Casa de Paz?
            </p>
            <button
              onClick={goToForm}
              className="mt-1.5 flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-teal-950 font-extrabold text-[11px] px-3 py-1.5 rounded-full transition-colors shadow-sm w-fit"
            >
              Ir al formulario
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Cerrar aviso"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shadow-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          aria-label="¿Sin Casa de Paz? Ir al formulario"
          className="group flex items-center gap-2 bg-white hover:bg-slate-50 text-teal-900 pl-2 pr-3 py-2 rounded-full shadow-2xl border-2 border-amber-300 transition-all animate-[bounce-soft_2.5s_ease-in-out_infinite]"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center shrink-0 shadow-md">
            <Church className="w-4 h-4 text-amber-300" />
          </div>
          <span className="font-extrabold text-xs whitespace-nowrap">
            ¿Sin Casa de Paz?
          </span>
        </button>
      )}
    </div>
  );
};

export default CasaDePazPrompt;
