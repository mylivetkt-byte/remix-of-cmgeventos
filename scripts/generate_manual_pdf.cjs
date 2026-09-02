const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

async function buildManualPdf() {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 50, left: 45, right: 45 },
    autoFirstPage: false,
  });

  const outputDir = path.join(__dirname, "../public");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const pdfPath = path.join(outputDir, "MANUAL_USUARIO_DOXA_EVENTOS.pdf");
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Paleta de Colores
  const C_DARK_GREEN  = "#083E30";
  const C_TEAL_HEADER = "#0D5D4A";
  const C_GOLD_ACCENT = "#D4AF37";
  const C_BG_CARD     = "#F8FAFC";
  const C_BORDER_CARD = "#E2E8F0";
  const C_TEXT_DARK   = "#1E293B";
  const C_TEXT_MUTED  = "#475569";
  const C_WHITE       = "#FFFFFF";

  const logoPath = path.join(__dirname, "../public/images/logo-doxa.jpg");
  const hasLogo = fs.existsSync(logoPath);

  // Helper para Encabezado y Pie de página en cada página
  const addHeaderFooter = () => {
    // Encabezado
    doc.rect(0, 0, 612, 36).fill(C_DARK_GREEN);
    doc.fillColor(C_GOLD_ACCENT).fontSize(10).font("Helvetica-Bold").text("DOXA EVENTOS", 45, 12);
    doc.fillColor(C_WHITE).fontSize(8.5).font("Helvetica").text("Manual Oficial de Operación y Administración del Sistema", 140, 13);
    doc.fillColor(C_GOLD_ACCENT).fontSize(8.5).font("Helvetica-Bold").text("CENTRO MUNDIAL DE GLORIA", 420, 13, { align: "right" });

    // Pie de página
    doc.rect(0, 752, 612, 40).fill("#0F172A");
    doc.fillColor("#94A3B8").fontSize(8.5).font("Helvetica").text("Plataforma de Gestión Multi-Evento & Control de Accesos", 45, 766);
    doc.fillColor(C_GOLD_ACCENT).fontSize(8.5).font("Helvetica-Bold").text("CMG © 2026", 480, 766, { align: "right" });

    doc.y = 55;
  };

  const checkPageOverflow = (neededHeight) => {
    if (doc.y + neededHeight > 730) {
      doc.addPage();
      addHeaderFooter();
    }
  };

  const drawSectionHeader = (title) => {
    checkPageOverflow(50);
    doc.fillColor(C_DARK_GREEN).fontSize(16).font("Helvetica-Bold").text(title);
    doc.moveDown(0.2);
    doc.rect(45, doc.y, 522, 2.5).fill(C_GOLD_ACCENT);
    doc.moveDown(0.8);
  };

  const drawCardBlock = (title, text, badgeText = null) => {
    const textWidth = 490;
    const fontTitleSize = 10.5;
    const fontBodySize = 8.5;

    // Calcular altura estimada
    doc.fontSize(fontBodySize).font("Helvetica");
    const bodyHeight = doc.heightOfString(text, { width: textWidth });
    const cardHeight = bodyHeight + 28 + (badgeText ? 14 : 0);

    checkPageOverflow(cardHeight + 10);

    const startY = doc.y;
    doc.rect(45, startY, 522, cardHeight).fillAndStroke(C_BG_CARD, C_BORDER_CARD);
    doc.rect(45, startY, 4.5, cardHeight).fill(C_DARK_GREEN);

    let currentY = startY + 8;
    if (badgeText) {
      doc.fillColor(C_GOLD_ACCENT).fontSize(8).font("Helvetica-Bold").text(badgeText.toUpperCase(), 58, currentY);
      currentY += 12;
    }

    doc.fillColor(C_DARK_GREEN).fontSize(fontTitleSize).font("Helvetica-Bold").text(title, 58, currentY);
    currentY += 15;

    doc.fillColor(C_TEXT_DARK).fontSize(fontBodySize).font("Helvetica").text(text, 58, currentY, { width: textWidth, lineGap: 2 });

    doc.y = startY + cardHeight + 8;
  };

  // =========================================================================
  // PORTADA / COVER PAGE
  // =========================================================================
  doc.addPage();
  doc.rect(0, 0, 612, 792).fill(C_DARK_GREEN);
  doc.rect(18, 18, 576, 756).strokeColor(C_GOLD_ACCENT).lineWidth(2).stroke();
  doc.rect(22, 22, 568, 748).strokeColor(C_GOLD_ACCENT).lineWidth(0.5).stroke();

  if (hasLogo) {
    try {
      doc.image(logoPath, 226, 75, { width: 160 });
    } catch (_) {}
  }

  doc.y = 250;
  doc.fillColor(C_GOLD_ACCENT).fontSize(26).font("Helvetica-Bold").text("MANUAL DE USUARIO Y GUÍA DE PLATAFORMA", { align: "center" });
  doc.moveDown(0.4);
  doc.fillColor(C_WHITE).fontSize(16).font("Helvetica").text("SISTEMA INTEGRAL DE GESTIÓN MULTI-EVENTO, FINANZAS Y CHECK-IN", { align: "center" });

  doc.moveDown(1.5);
  doc.rect(140, doc.y, 332, 2).fill(C_GOLD_ACCENT);
  doc.moveDown(2);

  doc.fillColor("#E2E8F0").fontSize(10.5).font("Helvetica").text("Documentación Oficial Operativa para:", { align: "center" });
  doc.fillColor(C_GOLD_ACCENT).fontSize(16).font("Helvetica-Bold").text("CENTRO MUNDIAL DE GLORIA / DOXA EVENTOS", { align: "center" });

  doc.y = 660;
  doc.fillColor(C_WHITE).fontSize(10).font("Helvetica").text("Versión del Sistema: 2.5 Enterprise Edition", { align: "center" });
  doc.fillColor("#94A3B8").fontSize(8.5).font("Helvetica").text("Actualización: Septiembre 2026 • Guía de Operación y Administración", { align: "center" });

  // =========================================================================
  // PÁGINA 2: INTRODUCCIÓN Y PUNTOS DE ACCESO
  // =========================================================================
  doc.addPage();
  addHeaderFooter();

  drawSectionHeader("1. Introducción y Arquitectura del Sistema");

  doc.fillColor(C_TEXT_DARK).fontSize(9.5).font("Helvetica").text(
    "La plataforma DOXA EVENTOS ha sido desarrollada como una solución integral para la organización de eventos masivos, conferencias, seminarios y retiros de la iglesia Centro Mundial de Gloria. Integra módulos de registro del público, control financiero de abonos, boletaje VIP con código QR, validación en puerta y notificaciones inteligentes por WhatsApp con archivos adjuntos.",
    { lineGap: 3 }
  );
  doc.moveDown(1);

  drawCardBlock(
    "🌐 Sitio Público y Catálogo (/eventos)",
    "Página principal accesible para todos los asistentes. Muestra banners dinámicos, tarjetas ilustradas con imágenes de cada evento, fechas, ubicación, precio (Gratis o Pago) y botón directo de inscripción.",
    "Punto de Acceso 1"
  );

  drawCardBlock(
    "📝 Formularios Dinámicos con Intro 3D",
    "Pantalla de bienvenida con logo metálico 3D animado de DOXA EVENTOS, efectos de destello (Shimmer) e inscripción con selección de RED, CDP y campos dinámicos reordenables.",
    "Punto de Acceso 2"
  );

  drawCardBlock(
    "🎟️ Boleto VIP / Invitación PDF",
    "Pase individual de lujo generado dinámicamente con los colores oficiales del evento, marco de código QR para lectura óptica, badge de estado de pago y marca de agua de seguridad.",
    "Punto de Acceso 3"
  );

  drawCardBlock(
    "🔐 Panel Administrador (/admin)",
    "Consola de control principal con sub-menús desplegables por evento en la barra lateral (Sidebar), gestión de usuarios, roles, reportes contables y borrado delimitado por evento.",
    "Punto de Acceso 4"
  );

  drawCardBlock(
    "📲 Escáner de Puerta (/checkin)",
    "Punto de control optimizado para móviles y tablets en la entrada del auditorio. Permite escanear el código QR con la cámara o buscar al asistente por su número de cédula.",
    "Punto de Acceso 5"
  );

  // =========================================================================
  // PÁGINA 3: INSCRIPCIÓN Y FINANZAS
  // =========================================================================
  doc.addPage();
  addHeaderFooter();

  drawSectionHeader("2. Registro de Participantes y Control Financiero");

  drawCardBlock(
    "💡 Multi-Inscripción de Participantes",
    "Un participante puede inscribirse libremente en múltiples eventos distintos con su mismo número de documento sin conflicto. En un mismo evento se previene la duplicidad para asegurar el cupo."
  );

  drawCardBlock(
    "🟢 Estado: Pagado Completo (100%)",
    "El participante ha cancelado la totalidad del valor de la entrada. Su ticket VIP reflejará el sello verde de Pago Completo."
  );

  drawCardBlock(
    "🟡 Estado: Abonado (Parcial)",
    "Registra un abono inicial. El panel administrador calcula automáticamente el saldo pendiente y lo muestra en el pase VIP."
  );

  drawCardBlock(
    "🔴 Estado: Pendiente de Pago",
    "Participante inscrito en evento de pago que aún no ha abonado ni adjuntado su comprobante."
  );

  drawCardBlock(
    "🎓 Estado: Becado / Exento",
    "Participante invitado de honor o exento de pago autorizado por la coordinación."
  );

  drawCardBlock(
    "💰 Modal 'Control de Pago' en el Panel Admin",
    "Permite al administrador seleccionar a un participante, actualizar su estado de pago, ingresar el monto abonado, ver la imagen del comprobante de transferencia y guardar notas internas."
  );

  // =========================================================================
  // PÁGINA 4: SUB-MÓDULOS AISLADOS Y ESCÁNER EN PUERTA
  // =========================================================================
  doc.addPage();
  addHeaderFooter();

  drawSectionHeader("3. Sub-Módulos del Sidebar y Escáner de Entrada");

  drawCardBlock(
    "📌 Sub-Menús Desplegables por Evento",
    "En la barra lateral izquierda (Sidebar), al hacer clic en Registros o Asistencia, se despliega la lista de eventos activos. Al seleccionar un evento, la pantalla muestra únicamente los datos, métricas y reportes aislados de dicho evento.",
    "Navegación Aislada"
  );

  drawCardBlock(
    "🛡️ Eliminación Segura Delimitada por Evento",
    "Cuando un evento está seleccionado en el sub-menú, el botón de borrado se transforma en 'Eliminar registros de [Evento]', garantizando que la limpieza de un evento NO afecte a los demás eventos del sistema.",
    "Protección de Datos"
  );

  drawCardBlock(
    "📷 Operación del Escáner QR en Puerta (/checkin)",
    "1. Lectura Óptica: Apunta la cámara del celular al código QR de la invitación.\n2. Alertas Visuales y Sonoras: Pantalla verde (Acceso Permitido), amarilla (Pase Ya Usado) o roja (Evento Incorrecto).\n3. Búsqueda Manual: Si el asistente no lleva su celular, digita su número de cédula para validar el ingreso.",
    "Control de Acceso"
  );

  // =========================================================================
  // PÁGINA 5: WHATSAPP EN CHECK-IN Y PDF ADJUNTO
  // =========================================================================
  doc.addPage();
  addHeaderFooter();

  drawSectionHeader("4. WhatsApp Automático en Check-in con PDF Adjunto");

  doc.fillColor(C_TEXT_DARK).fontSize(9.5).font("Helvetica").text(
    "Esta función permite enviar automáticamente un mensaje de bienvenida por WhatsApp con un archivo PDF adjunto (Guía del Evento, Programa, Libro o Material) en el instante en que el escaner en puerta valida la entrada del participante.",
    { lineGap: 3 }
  );
  doc.moveDown(0.8);

  drawCardBlock(
    "PASO 1: Ingresar a la Configuración del Evento",
    "En el panel admin, ve a la pestaña Eventos y haz clic en el botón 'Configurar' del evento correspondiente.",
    "Guía Paso a Paso"
  );

  drawCardBlock(
    "PASO 2: Pestaña '4. Mensajes & Sistema'",
    "En el modal ampliado de edición, dirígete a la cuarta pestaña. Allí encontrarás el cuadro 'Enviar WhatsApp automático al hacer Check-in en Puerta'.",
    "Guía Paso a Paso"
  );

  drawCardBlock(
    "PASO 3: Activar el Switch y Personalizar el Mensaje",
    "Activa el interruptor y redacta el texto de bienvenida. Puedes usar variables como {nombres}, {apellidos} y {evento} para que se reemplacen solo.",
    "Guía Paso a Paso"
  );

  drawCardBlock(
    "PASO 4: Cargar el Archivo PDF desde tu Dispositivo",
    "Haz clic en la casilla de carga '📄 Haz clic aquí para seleccionar y cargar el archivo PDF'. Selecciona el documento PDF desde tu computador o celular. El sistema lo subirá automáticamente al servidor.",
    "Guía Paso a Paso"
  );

  drawCardBlock(
    "PASO 5: Presionar 'Guardar Cambios'",
    "Haz clic en el botón verde 'Guardar Cambios' al fondo del modal. La configuración quedará guardada y lista para funcionar en puerta.",
    "Guía Paso a Paso"
  );

  // Finalizar y guardar PDF
  doc.end();

  return new Promise((resolve) => {
    writeStream.on("finish", () => {
      console.log("PDF perfecto generado en:", pdfPath);
      resolve(pdfPath);
    });
  });
}

buildManualPdf().catch(console.error);
