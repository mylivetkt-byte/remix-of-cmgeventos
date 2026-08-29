import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BannerSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  facebook?: string;
  instagram?: string;
}

const SLIDES: BannerSlide[] = [
  {
    id: "pastor-carlos",
    image: "/images/banner_pastor_carlos.jpg",
    title: "Pastor Carlos Delgado",
    subtitle: "Pastor Principal · Centro Mundial de Gloria",
    facebook: "@PastorCarlosDelgado",
    instagram: "@PCARLOS_DELGADO",
  },
  {
    id: "pastora-tania",
    image: "/images/banner_pastora_tania.jpg",
    title: "Pastora Tania Grimaldos",
    subtitle: "Pastora Líder · Centro Mundial de Gloria",
    facebook: "@PastoraTaniaGrimaldos",
    instagram: "@PTANIA_DELGADO",
  },
];

export function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  };

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-slate-900 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Contenedor del Slide */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
        {SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Imagen de Fondo */}
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20" />
            </div>
          );
        })}
      </div>

      {/* Flechas de Navegación (Izquierda / Derecha) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={prevSlide}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 text-white hover:bg-black/70 hover:scale-110 transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={nextSlide}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 text-white hover:bg-black/70 hover:scale-110 transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="w-6 h-6" />
      </Button>

      {/* Indicadores de Puntos de Diapositiva (Puntos Blancos como iglesiacmg.lovable.app) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/40 px-3.5 py-1.5 rounded-full backdrop-blur-md">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? "w-7 bg-white shadow-md" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
            title={`Diapositiva ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
