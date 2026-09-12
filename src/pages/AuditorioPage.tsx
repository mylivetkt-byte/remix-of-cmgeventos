import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, Users, Tag, MapPin, Phone, Mail, CheckCircle2, Loader2, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuditorioConfig, formatPrecio } from "@/hooks/useAuditorio";

const inputClass =
  "w-full h-12 px-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:border-teal-600 transition-all";

export const AuditorioPage = () => {
  const { data: config, isLoading } = useAuditorioConfig();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    correo: "",
    organizacion: "",
    tipo_evento: "",
    fecha_evento: "",
    hora_inicio: "",
    hora_fin: "",
    num_asistentes: "",
    mensaje: "",
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim()) {
      toast.error("Por favor ingresa tu nombre y tu teléfono");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.from("auditorio_solicitudes").insert([
        {
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim(),
          correo: form.correo.trim() || null,
          organizacion: form.organizacion.trim() || null,
          tipo_evento: form.tipo_evento.trim() || null,
          fecha_evento: form.fecha_evento || null,
          hora_inicio: form.hora_inicio || null,
          hora_fin: form.hora_fin || null,
          num_asistentes: form.num_asistentes ? Number(form.num_asistentes) : null,
          mensaje: form.mensaje.trim() || null,
        },
      ]);
      if (error) throw error;
      setEnviado(true);
      toast.success("¡Solicitud enviada!", { description: "Te contactaremos muy pronto." });
    } catch (err: any) {
      console.error(err);
      toast.error("No pudimos enviar tu solicitud", { description: "Intenta nuevamente en unos minutos." });
    } finally {
      setEnviando(false);
    }
  };

  const precio = config?.mostrar_precio ? formatPrecio(config?.precio, config?.moneda) : null;
  const fotos = config?.fotos || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-teal-700">
            <ArrowLeft className="w-4 h-4" />
            Volver a eventos
          </Link>
          <span className="inline-flex items-center gap-2 text-xs font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl">
            <Building2 className="w-4 h-4" />
            Auditorio
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {isLoading ? (
          <div className="h-64 bg-white border border-slate-200 rounded-3xl animate-pulse" />
        ) : (
          <>
            <section className="space-y-4">
              <h1 className="text-3xl sm:text-4xl font-black font-heading text-slate-900 leading-tight">
                {config?.titulo || "Alquiler del Auditorio"}
              </h1>
              {config?.subtitulo && (
                <p className="text-slate-600 text-base font-medium">{config.subtitulo}</p>
              )}
              {config?.descripcion && (
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed max-w-3xl whitespace-pre-line">
                  {config.descripcion}
                </p>
              )}

              <div className="flex flex-wrap gap-2.5 text-xs sm:text-sm font-bold text-slate-700 pt-1">
                {config?.capacidad && (
                  <span className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                    <Users className="w-4 h-4 text-teal-700" /> Capacidad: {config.capacidad}
                  </span>
                )}
                {precio && (
                  <span className="inline-flex items-center gap-2 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 text-amber-900">
                    <Tag className="w-4 h-4" /> Desde {precio}
                  </span>
                )}
                {config?.direccion && (
                  <span className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                    <MapPin className="w-4 h-4 text-teal-700" /> {config.direccion}
                  </span>
                )}
                {config?.telefono_contacto && (
                  <span className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                    <Phone className="w-4 h-4 text-teal-700" /> {config.telefono_contacto}
                  </span>
                )}
                {config?.correo_contacto && (
                  <span className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                    <Mail className="w-4 h-4 text-teal-700" /> {config.correo_contacto}
                  </span>
                )}
              </div>

              {config?.texto_tarifas && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-3xl">
                  <h2 className="text-sm font-black text-slate-900 mb-1.5">Tarifas</h2>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{config.texto_tarifas}</p>
                </div>
              )}
            </section>

            {fotos.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-black font-heading text-slate-900">Fotos del auditorio</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {fotos.map((url, i) => (
                    <button
                      key={url + i}
                      type="button"
                      onClick={() => setLightbox(url)}
                      className="aspect-4/3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 hover:opacity-90 transition"
                    >
                      <img
                        src={url}
                        alt={`Auditorio foto ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section id="solicitud" className="scroll-mt-24">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs max-w-3xl">
                <div className="flex items-center gap-2 mb-5">
                  <CalendarDays className="w-5 h-5 text-teal-700" />
                  <h2 className="text-xl font-black font-heading text-slate-900">
                    Formulario de solicitud de alquiler
                  </h2>
                </div>

                {enviado ? (
                  <div className="text-center space-y-4 py-6">
                    <CheckCircle2 className="w-14 h-14 text-teal-600 mx-auto" />
                    <h3 className="text-xl font-black text-slate-900">¡Gracias por tu solicitud!</h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      Hemos recibido tus datos. Nos comunicaremos contigo para confirmar disponibilidad y valores.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEnviado(false);
                        setForm({
                          nombre: "", telefono: "", correo: "", organizacion: "", tipo_evento: "",
                          fecha_evento: "", hora_inicio: "", hora_fin: "", num_asistentes: "", mensaje: "",
                        });
                      }}
                    >
                      Enviar otra solicitud
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Nombre completo *</label>
                        <input name="nombre" value={form.nombre} onChange={onChange} required placeholder="Tu nombre" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Teléfono *</label>
                        <input name="telefono" type="tel" value={form.telefono} onChange={onChange} required placeholder="Celular o WhatsApp" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Correo electrónico</label>
                        <input name="correo" type="email" value={form.correo} onChange={onChange} placeholder="ejemplo@correo.com" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Organización o iglesia</label>
                        <input name="organizacion" value={form.organizacion} onChange={onChange} placeholder="Opcional" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Tipo de evento</label>
                        <input name="tipo_evento" value={form.tipo_evento} onChange={onChange} placeholder="Conferencia, celebración, capacitación..." className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Fecha del evento</label>
                        <input name="fecha_evento" type="date" value={form.fecha_evento} onChange={onChange} className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Hora de inicio</label>
                        <input name="hora_inicio" type="time" value={form.hora_inicio} onChange={onChange} className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Hora de finalización</label>
                        <input name="hora_fin" type="time" value={form.hora_fin} onChange={onChange} className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-800">Número de asistentes</label>
                        <input name="num_asistentes" type="number" min={1} value={form.num_asistentes} onChange={onChange} placeholder="Ej: 120" className={inputClass} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-800">Propósito o detalles del evento</label>
                      <textarea
                        name="mensaje"
                        value={form.mensaje}
                        onChange={onChange}
                        rows={5}
                        placeholder="Cuéntanos qué necesitas (sonido, sillas, transmisión, etc.)"
                        className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-teal-600 transition-all"
                      />
                    </div>

                    {config?.condiciones && (
                      <p className="text-xs text-slate-500 whitespace-pre-line bg-slate-50 border border-slate-200 rounded-xl p-3">
                        {config.condiciones}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={enviando}
                      className="w-full h-14 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-base rounded-2xl"
                    >
                      {enviando ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Enviando solicitud...
                        </>
                      ) : (
                        "Enviar solicitud de alquiler"
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Auditorio" className="max-h-full max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default AuditorioPage;
