import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDateTime, formatFullName } from "@/lib/date-utils";

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  try {
    let clean = hex.replace("#", "").trim();
    if (clean.length === 3) clean = clean.split("").map((c) => c + c).join("");
    if (clean.length !== 6) return fallback;
    const n = parseInt(clean, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } catch {
    return fallback;
  }
}

function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD" | "DF" = "F"
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

function drawChurchIcon(doc: jsPDF, cx: number, cy: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  doc.rect(cx - size * 0.4, cy - size * 0.1, size * 0.8, size * 0.6, "F");
  doc.triangle(cx - size * 0.45, cy - size * 0.1, cx + size * 0.45, cy - size * 0.1, cx, cy - size * 0.5, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cx - size * 0.12, cy + size * 0.15, size * 0.24, size * 0.35, 1, 1, "F");
  doc.setFillColor(...color);
  doc.rect(cx - 0.7, cy - size * 0.72, 1.4, size * 0.3, "F");
  doc.rect(cx - size * 0.15, cy - size * 0.63, size * 0.3, 1.4, "F");
}

export interface GeneratePdfResult {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

/**
 * Genera y sube el pase PDF oficial directamente con los datos actualizados del evento en base de datos.
 */
export async function generateAndUploadInvitationPdf(registrationId: string): Promise<GeneratePdfResult> {
  try {
    // 1. Obtener datos del registro
    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (regErr || !reg) {
      throw new Error("Registro no encontrado");
    }

    // 2. Obtener datos del evento o de event_config
    let eventName = "Evento CMG";
    let eventPlace = "";
    let eventDate = "";
    let eventTime = "";
    let eventImage: string | null = null;
    let primaryHex = "#0B4A34";
    let secondaryHex = "#D4AF37";
    let isPaidEvent = false;

    if (reg.event_id) {
      const { data: evt } = await supabase
        .from("events")
        .select("*")
        .eq("id", reg.event_id)
        .maybeSingle();

      if (evt) {
        eventName = evt.nombre || eventName;
        eventPlace = evt.lugar_evento || "";
        eventImage = evt.banner_url || evt.logo_url || null;
        primaryHex = evt.color_primario || primaryHex;
        secondaryHex = evt.color_secundario || secondaryHex;
        isPaidEvent = Boolean(evt.es_de_pago && Number(evt.precio || 0) > 0);

        if (evt.fecha_evento) {
          const dt = formatEventDateTime(evt.fecha_evento);
          eventDate = dt.eventDate;
          eventTime = dt.eventTime;
        }
      }
    }

    if (!reg.event_id || !eventName) {
      const { data: config } = await supabase.from("event_config").select("*").limit(1).maybeSingle();
      if (config) {
        eventName = config.nombre_evento || eventName;
        eventPlace = config.lugar_evento || eventPlace;
        eventImage = config.logo_url || eventImage;
        if (config.fecha_evento) {
          const dt = formatEventDateTime(config.fecha_evento);
          eventDate = dt.eventDate;
          eventTime = dt.eventTime;
        }
      }
    }

    const GREEN = hexToRgb(primaryHex, [11, 74, 52]);
    const GOLD = hexToRgb(secondaryHex, [212, 175, 55]);
    const WHITE: [number, number, number] = [255, 255, 255];
    const INK: [number, number, number] = [38, 38, 38];
    const GRAY: [number, number, number] = [110, 110, 110];
    const LINE: [number, number, number] = [210, 210, 210];

    // 3. Generar QR Code
    const qrDataUrl = await QRCode.toDataURL(registrationId, {
      width: 500,
      margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });

    // 4. Descargar imagen del evento si existe
    let eventImgDataUrl: string | null = null;
    let eventImgFormat: "PNG" | "JPEG" = "PNG";
    if (eventImage) {
      try {
        const imgRes = await fetch(eventImage);
        if (imgRes.ok) {
          const blob = await imgRes.blob();
          const reader = new FileReader();
          eventImgDataUrl = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const ct = imgRes.headers.get("content-type") || "image/png";
          eventImgFormat = ct.includes("png") ? "PNG" : "JPEG";
        }
      } catch (_) {}
    }

    // 5. Construir PDF en tamaño A5
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
    const W = doc.internal.pageSize.getWidth(); // 148
    const H = doc.internal.pageSize.getHeight(); // 210
    const CX = W / 2;

    // Fondo gris muy claro de la página
    doc.setFillColor(244, 245, 244);
    doc.rect(0, 0, W, H, "F");

    // Tarjeta del ticket (120 x 186 mm)
    const TX = 14, TY = 12, TW = W - 28, TH = H - 24;
    doc.setFillColor(...WHITE);
    roundedRect(doc, TX, TY, TW, TH, 8, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    roundedRect(doc, TX, TY, TW, TH, 8, "S");

    // Cabecera dinámica
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const titleLines = doc.splitTextToSize(eventName.toUpperCase(), TW - 16);
    const titleBlockH = (titleLines.length - 1) * 5.5 + 5;
    const imgBlockH = eventImgDataUrl ? 24 : 16;
    const dateBlockH = eventDate ? 9 : 2;
    const headerH = 24 + titleBlockH + imgBlockH + dateBlockH + 5;

    // Fondo cabecera verde
    doc.setFillColor(...GREEN);
    roundedRect(doc, TX, TY, TW, headerH, 8, "F");
    doc.rect(TX, TY + headerH / 2, TW, headerH / 2, "F");

    // Badge dorado: ENTRADA OFICIAL • PASE VIP
    const badgeW = 74, badgeH = 9;
    doc.setFillColor(...GOLD);
    roundedRect(doc, CX - badgeW / 2, TY + 6, badgeW, badgeH, 4.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text("ENTRADA OFICIAL  •  PASE VIP", CX, TY + 12.3, { align: "center" });

    // Nombre del evento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...GOLD);
    const titleY = TY + 24;
    doc.text(titleLines, CX, titleY, { align: "center" });
    let headerCurY = titleY + titleBlockH;

    // Imagen o ícono de iglesia
    if (eventImgDataUrl) {
      const imgSize = 24;
      const imgX = CX - imgSize / 2;
      const imgY = headerCurY;
      doc.setFillColor(...GOLD);
      roundedRect(doc, imgX - 1.5, imgY - 1.5, imgSize + 3, imgSize + 3, 4, "F");
      doc.setFillColor(...WHITE);
      roundedRect(doc, imgX - 0.5, imgY - 0.5, imgSize + 1, imgSize + 1, 3.5, "F");
      doc.addImage(eventImgDataUrl, eventImgFormat, imgX, imgY, imgSize, imgSize);
      headerCurY += imgSize + 1;
    } else {
      drawChurchIcon(doc, CX, headerCurY + 8, 16, GOLD);
      headerCurY += 16;
    }

    // Fecha y hora del evento en la cabecera
    if (eventDate) {
      const dateStr = eventDate.charAt(0).toUpperCase() + eventDate.slice(1);
      const full = eventTime ? `${dateStr} • ${eventTime}` : dateStr;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...WHITE);
      doc.text(doc.splitTextToSize(full, TW - 20), CX, headerCurY + 7, { align: "center" });
    }

    // Línea dorada separadora
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.7);
    doc.line(TX + 30, TY + headerH - 3, TX + TW - 30, TY + headerH - 3);

    // Nombre del asistente
    let curY = TY + headerH + 11;
    const fullName = formatFullName(reg.nombres, reg.apellidos).toUpperCase();
    doc.setFont("times", "bold");
    doc.setTextColor(...GREEN);
    let fontSize = 24;
    doc.setFontSize(fontSize);
    let nameLines = doc.splitTextToSize(fullName, TW - 18);
    while (nameLines.length > 2 && fontSize > 14) {
      fontSize -= 2;
      doc.setFontSize(fontSize);
      nameLines = doc.splitTextToSize(fullName, TW - 18);
    }
    doc.text(nameLines, CX, curY, { align: "center" });
    curY += nameLines.length * (fontSize * 0.4) + 5;

    // Lugar del evento
    if (eventPlace) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      const pLines = doc.splitTextToSize(eventPlace, TW - 16);
      doc.text(pLines, CX, curY, { align: "center" });
      curY += pLines.length * 4.4 + 4;
    } else {
      curY += 4;
    }

    // Estado de pago (SOLO SI EL EVENTO ES DE PAGO)
    if (isPaidEvent) {
      const payState = reg.estado_pago || "Pendiente";
      let payText = "PAGO PENDIENTE";
      let payBg: [number, number, number] = [254, 242, 242];
      let payFg: [number, number, number] = [220, 38, 38];

      if (payState === "Pagado Completo" || payState === "pagado") {
        payText = "PAGO COMPLETO";
        payBg = [236, 253, 245];
        payFg = [5, 150, 105];
      } else if (payState === "Abonado") {
        const pend = Number(reg.monto_pendiente || 0);
        payText = `ABONO PARCIAL${pend > 0 ? " · SALDO: $" + pend.toLocaleString("es-CO") : ""}`;
        payBg = [254, 243, 199];
        payFg = [180, 100, 6];
      } else if (payState === "Becado") {
        payText = "ENTRADA BECADA";
        payBg = [243, 232, 255];
        payFg = [147, 51, 234];
      }

      curY += 1;
      const payW = 60;
      doc.setFillColor(...payBg);
      roundedRect(doc, CX - payW / 2, curY, payW, 6, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...payFg);
      doc.text(payText, CX, curY + 4.2, { align: "center" });
      curY += 9;
    }

    // Línea perforada con muescas laterales
    const stubY = curY + 4;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([2.5, 2.5], 0);
    doc.line(TX + 8, stubY, TX + TW - 8, stubY);
    doc.setLineDashPattern([], 0);

    doc.setFillColor(244, 245, 244);
    doc.circle(TX, stubY, 4.5, "F");
    doc.circle(TX + TW, stubY, 4.5, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.circle(TX, stubY, 4.5, "S");
    doc.circle(TX + TW, stubY, 4.5, "S");

    // QR y Badge ID
    const footerH = 14;
    const footerY = TY + TH - footerH;
    const badgeBoxW = 46, badgeBoxH = 12;
    const stubSpaceTop = stubY + 5;
    const stubSpaceBottom = footerY - 3;
    const avail = stubSpaceBottom - stubSpaceTop;
    let qrSize = Math.min(40, avail - 3 - badgeBoxH - 5);
    qrSize = Math.max(28, qrSize);
    const groupH = qrSize + 3 + badgeBoxH + 5;
    const qrX = CX - qrSize / 2;
    const qrY = stubSpaceTop + Math.max(0, (avail - groupH) / 2);

    doc.setFillColor(...GOLD);
    roundedRect(doc, qrX - 2.5, qrY - 2.5, qrSize + 5, qrSize + 5, 4, "F");
    doc.setFillColor(...WHITE);
    roundedRect(doc, qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 3, "F");
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    const badgeX = CX - badgeBoxW / 2;
    const badgeY = qrY + qrSize + 3;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.setFillColor(...WHITE);
    roundedRect(doc, badgeX, badgeY, badgeBoxW, badgeBoxH, 3, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.text("Ticket badge ID:", CX, badgeY + 4.8, { align: "center" });
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`#${registrationId.slice(0, 8).toUpperCase()}`, CX, badgeY + 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text("Presenta este código QR al ingresar al evento", CX, badgeY + badgeBoxH + 4.5, { align: "center" });

    // Pie de página verde
    doc.setFillColor(...GREEN);
    roundedRect(doc, TX, footerY, TW, footerH, 8, "F");
    doc.rect(TX, footerY, TW, footerH / 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("Centro Mundial de Gloria  •  Doxa Eventos", CX, footerY + footerH / 2 + 2.5, { align: "center" });

    // 6. Subir PDF generado a Supabase Storage
    const pdfBlob = doc.output("blob");
    const fileName = `invitation_${registrationId}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("invitations")
      .upload(fileName, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      throw uploadErr;
    }

    const { data: urlData } = supabase.storage.from("invitations").getPublicUrl(fileName);
    const pdfUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("registrations")
      .update({ pdf_url: pdfUrl, qr_code: registrationId })
      .eq("id", registrationId);

    return { success: true, pdfUrl };
  } catch (err: any) {
    console.error("Error al generar PDF:", err);
    return { success: false, error: err.message || "Error desconocido" };
  }
}
