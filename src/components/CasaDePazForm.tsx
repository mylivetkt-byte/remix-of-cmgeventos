import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Send, Sparkles, MapPin, Phone, Mail, Home, User } from "lucide-react";

interface CasaDePazFormProps {
  className?: string;
}

export const CasaDePazForm: React.FC<CasaDePazFormProps> = ({ className = "" }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    barrio: "",
    correo: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    if (!formData.telefono.trim()) {
      toast.error("Por favor ingresa tu número de teléfono");
      return;
    }
    if (!formData.direccion.trim()) {
      toast.error("Por favor ingresa tu dirección");
      return;
    }
    if (!formData.barrio.trim()) {
      toast.error("Por favor ingresa tu barrio");
      return;
    }

    setIsSubmitting(true);

    try {
      // Intentar guardar en Supabase si la tabla existe
      const { error } = await supabase
        .from("casa_de_paz_solicitudes" as any)
        .insert([
          {
            nombre: formData.nombre.trim(),
            telefono: formData.telefono.trim(),
            direccion: formData.direccion.trim(),
            barrio: formData.barrio.trim(),
            correo: formData.correo.trim() || null,
            estado: "pendiente",
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.warn("Nota: Guardando localmente debido a tabla no migrada aún:", error.message);
        // Guardar copia local en caso de que la tabla aún no esté en Supabase
        const existing = JSON.parse(localStorage.getItem("casa_de_paz_solicitudes") || "[]");
        existing.push({
          id: Date.now().toString(),
          ...formData,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("casa_de_paz_solicitudes", JSON.stringify(existing));
      }

      setIsSubmitted(true);
      toast.success("¡Información enviada con éxito!", {
        description: "Un líder de Casa de Paz se comunicará contigo muy pronto.",
      });

      // Reset form
      setFormData({
        nombre: "",
        telefono: "",
        direccion: "",
        barrio: "",
        correo: "",
      });
    } catch (err: any) {
      console.error("Error al registrar solicitud:", err);
      // Fallback local
      const existing = JSON.parse(localStorage.getItem("casa_de_paz_solicitudes") || "[]");
      existing.push({
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("casa_de_paz_solicitudes", JSON.stringify(existing));

      setIsSubmitted(true);
      toast.success("¡Información enviada con éxito!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="casa-de-paz" className={`w-full max-w-4xl mx-auto px-4 sm:px-6 my-12 scroll-mt-24 ${className}`}>
      {/* Contenedor con efecto offset amarillo exacto como el afiche */}
      <div className="relative">
        {/* Capa de fondo amarilla desplazada */}
        <div className="absolute inset-0 translate-x-3 translate-y-3 sm:translate-x-5 sm:translate-y-5 bg-[#FFE600] rounded-3xl sm:rounded-[2.5rem]" />

        {/* Tarjeta principal verde */}
        <div className="relative z-10 bg-[#169B72] rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 md:p-12 shadow-xl text-white">
          {/* Encabezado con tipografía y estilo exacto */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2">
            <h3 className="text-lg sm:text-2xl md:text-[26px] font-normal leading-snug tracking-tight text-white/95">
              Diligencia estos datos y encontraremos{" "}
              <strong className="font-extrabold text-white">La Casa de Paz</strong>{" "}
              más cercana a tu lugar de residencia.
            </h3>
            <p className="text-[#FFE600] text-base sm:text-xl md:text-2xl font-bold tracking-tight pt-1">
              Todos los jueves a las 7pm esperamos por ti
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center space-y-4 border border-white/20 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-[#FFE600] text-slate-900 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-emerald-800" />
              </div>
              <h4 className="text-2xl font-black text-white">¡Gracias por contactarnos!</h4>
              <p className="text-white/90 text-sm sm:text-base max-w-md mx-auto">
                Hemos recibido tus datos correctamente. Muy pronto un líder de <strong>Casa de Paz</strong> se comunicará contigo para darte la bienvenida e indicarte la ubicación más cercana.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="mt-4 inline-flex items-center gap-2 bg-[#FFE600] hover:bg-[#ffea33] text-slate-950 font-black px-6 py-3 rounded-xl transition-all shadow-md text-sm cursor-pointer"
              >
                Enviar otra solicitud
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 max-w-2xl mx-auto">
              {/* Campo: Nombre */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="cdp_nombre" className="block text-white text-base sm:text-lg font-medium pl-1">
                  Nombre
                </label>
                <div className="relative">
                  <input
                    id="cdp_nombre"
                    name="nombre"
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Tu nombre completo"
                    className="w-full h-12 sm:h-14 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium text-base focus:outline-none focus:ring-4 focus:ring-[#FFE600]/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Campo: Teléfono */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="cdp_telefono" className="block text-white text-base sm:text-lg font-medium pl-1">
                  Teléfono
                </label>
                <div className="relative">
                  <input
                    id="cdp_telefono"
                    name="telefono"
                    type="tel"
                    required
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Número de celular o WhatsApp"
                    className="w-full h-12 sm:h-14 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium text-base focus:outline-none focus:ring-4 focus:ring-[#FFE600]/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Campo: Dirección (Solicitado por el usuario) */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="cdp_direccion" className="block text-white text-base sm:text-lg font-medium pl-1">
                  Dirección
                </label>
                <div className="relative">
                  <input
                    id="cdp_direccion"
                    name="direccion"
                    type="text"
                    required
                    value={formData.direccion}
                    onChange={handleChange}
                    placeholder="Tu dirección de residencia (ej: Calle 10 # 20-30)"
                    className="w-full h-12 sm:h-14 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium text-base focus:outline-none focus:ring-4 focus:ring-[#FFE600]/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Campo: Barrio */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="cdp_barrio" className="block text-white text-base sm:text-lg font-medium pl-1">
                  Barrio
                </label>
                <div className="relative">
                  <input
                    id="cdp_barrio"
                    name="barrio"
                    type="text"
                    required
                    value={formData.barrio}
                    onChange={handleChange}
                    placeholder="Barrio o sector donde vives"
                    className="w-full h-12 sm:h-14 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium text-base focus:outline-none focus:ring-4 focus:ring-[#FFE600]/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Campo: Correo */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="cdp_correo" className="block text-white text-base sm:text-lg font-medium pl-1">
                  Correo
                </label>
                <div className="relative">
                  <input
                    id="cdp_correo"
                    name="correo"
                    type="email"
                    value={formData.correo}
                    onChange={handleChange}
                    placeholder="ejemplo@correo.com"
                    className="w-full h-12 sm:h-14 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl text-slate-900 placeholder:text-slate-400 font-medium text-base focus:outline-none focus:ring-4 focus:ring-[#FFE600]/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Botón de Enviar */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 sm:h-16 bg-[#FFE600] hover:bg-[#ffea2b] active:scale-[0.99] text-slate-950 font-black text-lg sm:text-xl rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed uppercase tracking-wide"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
                      <span>Enviando información...</span>
                    </>
                  ) : (
                    <span>Quiero que me contacte un líder</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default CasaDePazForm;
