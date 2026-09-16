/**
 * Utilidades para formateo robusto de fechas y nombres de eventos en Colombia (America/Bogota)
 */

export interface FormattedEventDateTime {
  eventDate: string;      // Ej: "Sábado, 25 de octubre de 2026"
  eventTime: string;      // Ej: "7:00 p. m." o "" si no tiene hora específica
  fullDateText: string;   // Ej: "Sábado, 25 de octubre de 2026 • 7:00 p. m."
}

/**
 * Formatea una fecha/hora de evento en zona horaria de Colombia con nombres en español y mayúscula inicial.
 */
export function formatEventDateTime(fechaStr?: string | null): FormattedEventDateTime {
  if (!fechaStr || typeof fechaStr !== "string" || !fechaStr.trim()) {
    return { eventDate: "", eventTime: "", fullDateText: "" };
  }

  const clean = fechaStr.trim();

  try {
    // Si viene solo como YYYY-MM-DD (longitud 10, sin hora)
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0); // 12:00 mediodía local para evitar cualquier salto
      let formatted = dateObj.toLocaleDateString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (formatted) {
        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
      return {
        eventDate: formatted,
        eventTime: "",
        fullDateText: formatted,
      };
    }

    const dateObj = new Date(clean);
    if (isNaN(dateObj.getTime())) {
      return { eventDate: clean, eventTime: "", fullDateText: clean };
    }

    // Formato de fecha en español (America/Bogota)
    let formattedDate = dateObj.toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (formattedDate) {
      formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

    // Formato de hora
    let formattedTime = "";
    // Verificamos si la fecha original contenía especificación de hora
    const hasTimeComponent =
      clean.includes("T") &&
      !clean.endsWith("T00:00:00.000Z") &&
      !clean.endsWith("T00:00:00Z") &&
      !clean.endsWith("T00:00");

    if (hasTimeComponent) {
      formattedTime = dateObj.toLocaleTimeString("es-CO", {
        timeZone: "America/Bogota",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    const fullDateText = formattedTime
      ? `${formattedDate} • ${formattedTime}`
      : formattedDate;

    return {
      eventDate: formattedDate,
      eventTime: formattedTime,
      fullDateText,
    };
  } catch {
    return { eventDate: clean, eventTime: "", fullDateText: clean };
  }
}

/**
 * Convierte cualquier fecha a valor válido para un <input type="datetime-local">
 * Evita corrupciones por desfase de zona horaria al cargar para editar.
 */
export function toDateTimeLocalInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return `${clean}T00:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) {
      return clean;
    }
    const d = new Date(clean);
    if (isNaN(d.getTime())) return "";

    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

/**
 * Une nombres y apellidos de forma limpia, evitando "null" o "undefined"
 */
export function formatFullName(nombres?: string | null, apellidos?: string | null): string {
  const parts = [nombres, apellidos]
    .map((s) => (s ? String(s).trim() : ""))
    .filter((s) => s.length > 0 && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined");
  
  return parts.join(" ") || "Asistente";
}
