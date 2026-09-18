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
    // 1. Caso: Solo fecha YYYY-MM-DD (sin hora específica)
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 17, 0, 0)); // 12:00 mediodía en Colombia
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
      return {
        eventDate: formattedDate,
        eventTime: "",
        fullDateText: formattedDate,
      };
    }

    // 2. Caso: Fecha con hora
    // Si viene sin offset de zona horaria (ej: "2026-09-20T17:00" o "2026-09-20 17:00"), asumimos hora Colombia (-05:00)
    let parseable = clean;
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(clean)) {
      parseable = clean.replace(" ", "T");
      if (!clean.includes("Z") && !clean.includes("+") && !clean.includes("-", 10)) {
        parseable = `${parseable.length === 16 ? parseable + ":00" : parseable}-05:00`;
      }
    }

    const dateObj = new Date(parseable);
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

    // Formato de hora en español (America/Bogota)
    const timeFormatter = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const formattedTime = timeFormatter.format(dateObj).replace(/\u00a0/g, " ");

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
 * Convierte cualquier fecha a valor válido para un <input type="datetime-local"> en hora Colombia (America/Bogota).
 * Evita corrupciones por desfase de zona horaria del navegador local.
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

    let parseable = clean;
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(clean)) {
      parseable = clean.replace(" ", "T");
      if (!clean.includes("Z") && !clean.includes("+") && !clean.includes("-", 10)) {
        parseable = `${parseable.length === 16 ? parseable + ":00" : parseable}-05:00`;
      }
    }

    const d = new Date(parseable);
    if (isNaN(d.getTime())) return "";

    // Extraer partes exactas en America/Bogota
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

    const year = getPart("year");
    const month = getPart("month");
    const day = getPart("day");
    let hour = getPart("hour");
    if (hour === "24") hour = "00";
    const minute = getPart("minute");

    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch {
    return "";
  }
}

/**
 * Convierte el valor de un <input type="datetime-local"> a ISO UTC preservando exactamente la hora de Colombia (-05:00).
 */
export function toColombiaISO(dtStr?: string | null): string | null {
  if (!dtStr) return null;
  const clean = dtStr.trim();
  if (!clean) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(clean)) {
    const formatted = clean.replace(" ", "T");
    const full = formatted.length === 16 ? `${formatted}:00` : formatted;
    return new Date(`${full}-05:00`).toISOString();
  }

  const d = new Date(clean);
  return isNaN(d.getTime()) ? clean : d.toISOString();
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
