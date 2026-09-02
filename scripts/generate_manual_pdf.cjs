const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

async function buildManualPdf() {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 40, bottom: 50, left: 40, right: 40 },
    autoFirstPage: false,
  });

  const outputDir = path.join(__dirname, "../public");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const pdfPath = path.join(outputDir, "MANUAL_USUARIO_DOXA_EVENTOS.pdf");
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Paleta de Colores Corporativos Doxa Eventos
  const C_DARK_GREEN = "#083E30";
  const C_TEAL_HEADER = "#0D5D4A";
  const C_GOLD_ACCENT = "#D4AF37";
  const C_BG_LIGHT = "#F4F8F6";
  const C_TEXT_DARK = "#1E293B";
  const C_TEXT_MUTED = "#64748B";
  const C_WHITE = "#FFFFFF";

  const logoPath = path.join(__dirname, "../public/images/logo-doxa.jpg");
  const hasLogo = fs.existsSync(logoPath);

  // Helper para Encabezado y Pie de página
  const addPageDecorations = (titlePage = false) => {
    if (titlePage) return;

    // Encabezado Superior
    doc.rect(0, 0, 612, 35).fill(C_DARK_GREEN);
    doc.fillColor(C_GOLD_ACCENT).fontSize(9).font("Helvetica-Bold").text("DOXA EVENTOS", 40, 12);
    doc.fillColor(C_WHITE).fontSize(8).font("Helvetica").text("Manual Oficial de Operación y Administración del Sistema", 135, 13);
    doc.fillColor(C_GOLD_ACCENT).fontSize(8).font("Helvetica-Bold").text("CENTRO MUNDIAL DE GLORIA", 450, 13, { align: "right" });

    // Pie de página
    doc.rect(0, 752, 612, 40).fill("#0F172A");
    doc.fillColor("#94A3B8").fontSize(8).font("Helvetica").text("Plataforma de Gestión Multi-Evento & Control de Accesos", 40, 765);
    doc.fillColor(C_GOLD_ACCENT).fontSize(8).font("Helvetica-Bold").text("CMG © 2026", 500, 765, { align: "right" });
  };

  // =========================================================================
  // PORTADA / COVER PAGE
  // =========================================================================
  doc.addPage();
  // Fondo de portada elegante
  doc.rect(0, 0, 612, 792).fill(C_DARK_GREEN);

  // Marco de oro
  doc.rect(20, 20, 572, 752).strokeColor(C_GOLD_ACCENT).lineWidth(2).stroke();
  doc.rect(24, 24, 564, 744).strokeColor(C_GOLD_ACCENT).lineWidth(0.5).stroke();

  if (hasLogo) {
    try {
      doc.image(logoPath, 226, 80, { width: 160 });
    } catch (_) {}
  }

  doc.y = 260;
  doc.fillColor(C_GOLD_ACCENT).fontSize(28).font("Helvetica-Bold").text("MANUAL DE USUARIO Y GUÍA COMPLETA DE PLATAFORMA", { align: "center" });
  doc.moveDown(0.5);
  doc.fillColor(C_WHITE).fontSize(18).font("Helvetica").text("SISTEMA INTEGRAL DE GESTIÓN MULTI-EVENTO, TICKET VIP Y CHECK-IN", { align: "center" });

  doc.moveDown(1.5);
  doc.rect(150, doc.y, 312, 2).fill(C_GOLD_ACCENT);
  doc.moveDown(2);

  doc.fillColor("#E2E8F0").fontSize(11).font("Helvetica").text("Desarrollado para:", { align: "center" });
  doc.fillColor(C_GOLD_ACCENT).fontSize(16).font("Helvetica-Bold").text("CENTRO MUNDIAL DE GLORIA / DOXA EVENTOS", { align: "center" });

  doc.y = 650;
  doc.fillColor(C_WHITE).fontSize(10).font("Helvetica").text("Versión del Sistema: 2.5 Enterprise Edition", { align: "center" });
  doc.fillColor("#94A3B8").fontSize(9).font("Helvetica").text("Actualización: Septiembre 2026 • Documento Oficial de Capacitación", { align: "center" });

  // =========================================================================
  // PÁGINA 2: INTRODUCCIÓN Y ARQUITECTURA
  // =========================================================================
  doc.addPage();
  addPageDecorations();
  doc.y = 55;

  doc.fillColor(C_DARK_GREEN).fontSize(18).font("Helvetica-Bold").text("1. Introducción y Arquitectura del Sistema");
  doc.moveDown(0.3);
  doc.rect(40, doc.y, 532, 2).fill(C_GOLD_ACCENT);
  doc.moveDown(0.8);

  doc.fillColor(C_TEXT_DARK).fontSize(10).font("Helvetica").text(
    "La plataforma DOXA EVENTOS ha sido concebida como un ecosistema empresarial y ministerial para la gestión integral de eventos masivos, conferencias, seminarios y retiros de la iglesia Centro Mundial de Gloria. El sistema abarca desde la difusión pública del catálogo hasta el control en puerta con código QR y la automatización financiera."
  );

  doc.moveDown(1);
  doc.fillColor(C_TEAL_HEADER).fontSize(12).font("Helvetica-Bold").text("Puntos de Acceso Principales:");
  doc.moveDown(0.5);

  const puntosAcceso = [
    { titulo: "🌐 Sitio Público y Catálogo (/eventos)", desc: "Página principal con banner dinámico, tarjetas con imágenes oficiales de cada evento, precios, estado (Gratis o Pago) y botón directo de inscripción." },
    { titulo: "📝 Formularios Personalizados", desc: "Pantalla con intro animada 3D metálica de DOXA EVENTOS, reordenamiento dinámico de campos, selección de RED/CDP e inscripción en tiempo real." },
    { titulo: "🎟️ Pase VIP e Invitación PDF", desc: "Generación de boleto de lujo formato VIP con código QR individual, badge de estado financiero, marca de agua y diseño de alta seguridad." },
    { titulo: "🔐 Panel Administrador (/admin)", desc: "Consola de mando con Sub-Módulos aislados por evento en el menú lateral, gestión de catálogo, roles, reportes y control de pagos." },
    { titulo: "📲 Escáner de Entrada en Puerta (/checkin)", desc: "Punto de control mediante cámara de celular/tablet para validación de pases QR e ingreso manual por número de documento." },
  ];

  puntosAcceso.forEach((item) => {
    doc.rect(40, doc.y, 532, 42).fill(C_BG_LIGHT);
    doc.rect(40, doc.y - 42, 4, 42).fill(C_DARK_GREEN);
    doc.fillColor(C_DARK_GREEN).fontSize(10).font("Helvetica-Bold").text(item.titulo, 50, doc.y - 36);
    doc.fillColor(C_TEXT_DARK).fontSize(8.5).font("Helvetica").text(item.desc, 50, doc.y - 23, { width: 510 });
    doc.moveDown(0.6);
  });

  // =========================================================================
  // PÁGINA 3: CATÁLOGO, INSCRIPCIÓN Y TICKET VIP
  // =========================================================================
  doc.addPage();
  addPageDecorations();
  doc.y = 55;

  doc.fillColor(C_DARK_GREEN).fontSize(18).font("Helvetica-Bold").text("2. Registro de Participantes y Ticket VIP");
  doc.moveDown(0.3);
  doc.rect(40, doc.y, 532, 2).fill(C_GOLD_ACCENT);
  doc.moveDown(0.8);

  doc.fillColor(C_TEAL_HEADER).fontSize(12).font("Helvetica-Bold").text("Experiencia de Inscripción Visual y Animada:");
  doc.moveDown(0.4);
  doc.fillColor(C_TEXT_DARK).fontSize(9.5).font("Helvetica").text(
    "Al ingresar a cualquier formulario de registro, el usuario es recibido por una pantalla de introducción (Splash Screen) con el logo metálico 3D de DOXA EVENTOS, efectos de destello de luz (Shimmer) y una barra de progreso que brinda una bienvenida interactiva y elegante."
  );

  doc.moveDown(1);
  doc.fillColor(C_TEAL_HEADER).fontSize(12).font("Helvetica-Bold").text("Características del Boleto/Invitación PDF VIP:");

  const ticketFeatures = [
    "✅ Encabezado dinámico con el Logo Oficial y Colores de Marca del evento específico.",
    "✅ Formato ticket VIP de lujo con línea punteada de desprendimiento y muecas laterales.",
    "✅ Marco especial de código QR para lectura ultrarrápida en la entrada con lectores ópticos.",
    "✅ Distintivo Financiero en tiempo real (PAGO COMPLETO, ABONADO PARCIAL, BECADO o PENDIENTE).",
    "✅ Marca de agua institucional y pie de página de seguridad con código único de registro.",
  ];

  ticketFeatures.forEach((feat) => {
    doc.fillColor(C_TEXT_DARK).fontSize(9).font("Helvetica").text(feat, 50, doc.y + 2);
    doc.moveDown(0.4);
  });

  doc.moveDown(1);
  doc.rect(40, doc.y, 532, 80).fill("#FFFBEB");
  doc.rect(40, doc.y - 80, 4, 80).fill(C_GOLD_ACCENT);
  doc.fillColor("#92400E").fontSize(10).font("Helvetica-Bold").text("💡 Nota Importante sobre Multi-Inscripción:", 50, doc.y - 72);
  doc.fillColor("#78350F").fontSize(8.5).font("Helvetica").text(
    "El sistema permite que un mismo participante (mismo número de documento) se inscriba en múltiples eventos distintos sin conflicto. Sin embargo, en un mismo evento no se permite la duplicidad de cédula para garantizar el cupo.",
    50, doc.y - 56, { width: 510 }
  );

  // =========================================================================
  // PÁGINA 4: CONTROL FINANCIERO Y ABONOS
  // =========================================================================
  doc.addPage();
  addPageDecorations();
  doc.y = 55;

  doc.fillColor(C_DARK_GREEN).fontSize(18).font("Helvetica-Bold").text("3. Control Financiero, Abonos y Becas");
  doc.moveDown(0.3);
  doc.rect(40, doc.y, 532, 2).fill(C_GOLD_ACCENT);
  doc.moveDown(0.8);

  doc.fillColor(C_TEXT_DARK).fontSize(9.5).font("Helvetica").text(
    "Para eventos de pago o seminarios con costo de entrada, el sistema incluye un módulo completo de seguimiento contable que permite registrar abonos parciales, exenciones (becas) y visualizar saldos pendientes."
  );

  doc.moveDown(1);
  doc.fillColor(C_TEAL_HEADER).fontSize(12).font("Helvetica-Bold").text("Estados Financieros Disponibles:");
  doc.moveDown(0.5);

  const estadosFinancieros = [
    { badge: "🟢 Pagado Completo", desc: "El participante ha cancelado la totalidad del valor de la entrada (100%)." },
    { badge: "🟡 Abonado (Parcial)", desc: "Ha realizado un abono inicial. El sistema calcula automáticamente el saldo pendiente." },
    { badge: "🔴 Pendiente de Pago", desc: "Registrado pero no ha realizado ningún pago inicial." },
    { badge: "🎓 Becado / Exento", desc: "Invitado de honor o participante becado exento de pago." },
  ];

  estadosFinancieros.forEach((est) => {
    doc.rect(40, doc.y, 532, 32).fill(C_BG_LIGHT);
    doc.fillColor(C_DARK_GREEN).fontSize(9.5).font("Helvetica-Bold").text(est.badge, 50, doc.y - 24);
    doc.fillColor(C_TEXT_DARK).fontSize(8.5).font("Helvetica").text(est.desc, 180, doc.y - 24, { width: 380 });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);
  doc.fillColor(C_TEAL_HEADER).fontSize(12).font("Helvetica-Bold").text("Modal '💰 Control de Pago' en el Administrador:");
  doc.moveDown(0.4);
  doc.fillColor(C_TEXT_DARK).fontSize(9).font("Helvetica").text(
    "Al presionar el botón 💰 Pago en la lista de registros, se despliega una ventana donde el administrador puede:\n" +
    "• Modificar el estado de pago del participante.\n" +
    "• Digitar el monto pagado (el saldo pendiente se calcula solo).\n" +
    "• Ver la imagen del comprobante de pago subido por el participante.\n" +
    "• Agregar notas internas sobre la transacción."
  );

  // =========================================================================
  // PÁGINA 5: SUB-MÓDULOS DELBAR Y ESCÁNER PUERTA
  // =========================================================================
  doc.addPage();
  addPageDecorations();
  doc.y = 55;

  doc.fillColor(C_DARK_GREEN).fontSize(18).font("Helvetica-Bold").text("4. Sub-Módulos Lateral y Escáner QR");
  doc.moveDown(0.3);
  doc.rect(40, doc.y, 532, 2).fill(C_GOLD_ACCENT);
  doc.moveDown(0.8);

  doc.fillColor(C_TEAL_HEADER).fontSize(12).font("Helvetica-Bold").text("Sub-Menús Desplegables por Evento en la Barra Lateral:");
  doc.moveDown(0.4);
  doc.fillColor(C_TEXT_DARK).fontSize(9.5).font("Helvetica").text(
    "Para evitar confusiones al gestionar múltiples actividades simultáneas, los módulos de Registros y Asistencias se dividen en sub-menús dentro de la barra lateral (Sidebar). Al hacer clic en un evento específico:"
  );

  doc.moveDown(0.5);
  const subMenuFeatures = [
    "📌 La pantalla conmuta al MÓDULO AISLADO del evento seleccionado.",
    "📌 Las estadísticas, totales y filtros muestran únicamente los datos de ese evento.",
    "📌 El botón de eliminación se transforma en 'Eliminar registros de [Evento]', garantizando que un borrado NO afecte a los demás eventos del sistema.",
  ];

  subMenuFeatures.forEach((f) => {
    doc.fillColor(C_DARK_GREEN).fontSize(9).font("Helvetica-Bold").text(f, 50, doc.y);
    doc.moveDown(0.5);
  });

  doc.moveDown(1);
  doc.fillColor(C_TEAL_HEADER).fontSize(12).font("Helvetica-Bold").text("Escáner de Puerta (/checkin) para Validación:");
  doc.moveDown(0.4);
  doc.fillColor(C_TEXT_DARK).fontSize(9).font("Helvetica").text(
    "El punto de control en la puerta de la iglesia o auditorio funciona mediante una aplicación optimizada para móviles con cámara frontal/trasera:\n\n" +
    "1. **Lectura Óptica:** Al escanear el QR del pase VIP, el sistema verifica validez y estado.\n" +
    "2. **Alertas Visuales y Sonoras:** Muestra tarjetas en verde (Acceso Permitido), amarillo (Pase Ya Utilizado) o rojo (Evento Incorrecto).\n" +
    "3. **Búsqueda Manual:** Si la persona no lleva su celular, se digita su número de cédula para autorizar el ingreso."
  );

  // =========================================================================
  // PÁGINA 6: CHECK-IN WHATSAPP CON PDF ADJUNTO
  // =========================================================================
  doc.addPage();
  addPageDecorations();
  doc.y = 55;

  doc.fillColor(C_DARK_GREEN).fontSize(18).font("Helvetica-Bold").text("5. WhatsApp en Check-in con PDF Adjunto");
  doc.moveDown(0.3);
  doc.rect(40, doc.y, 532, 2).fill(C_GOLD_ACCENT);
  doc.moveDown(0.8);

  doc.fillColor(C_TEXT_DARK).fontSize(9.5).font("Helvetica").text(
    "Una de las funciones más potentes es el envío automático de notificaciones por WhatsApp con documentos PDF adjuntos justo en el instante en que la persona realiza su Check-in en la entrada."
  );

  doc.moveDown(1);
  doc.fillColor(C_TEAL_HEADER).fontSize(12).font("Helvetica-Bold").text("Pasos para Configurar en cada Evento:");
  doc.moveDown(0.5);

  const pasosWhatsApp = [
    { paso: "PASO 1", titulo: "Abrir la Configuración del Evento", desc: "En el panel admin, ve a Eventos y presiona 'Configurar' en el evento deseado." },
    { paso: "PASO 2", titulo: "Pestaña '4. Mensajes & Sistema'", desc: "En la cuarta pestaña del modal, localiza la tarjeta de WhatsApp en Check-in." },
    { paso: "PASO 3", titulo: "Activar el Switch y Redactar Mensaje", desc: "Activa la casilla 'Enviar WhatsApp automático en Check-in' y edita la bienvenida usando {nombres} y {evento}." },
    { paso: "PASO 4", titulo: "Cargar Archivo PDF desde la Computadora", desc: "Presiona el botón de carga y selecciona el archivo PDF (Guía del Evento, Programa o Libro). El sistema lo subirá automáticamente." },
    { paso: "PASO 5", titulo: "Guardar Cambios", desc: "Presiona 'Guardar Cambios'. Al escanear la entrada de un participante, este recibirá inmediatamente su mensaje y su archivo PDF en WhatsApp." },
  ];

  pasosWhatsApp.forEach((p) => {
    doc.rect(40, doc.y, 532, 38).fill(C_BG_LIGHT);
    doc.fillColor(C_GOLD_ACCENT).fontSize(9).font("Helvetica-Bold").text(p.paso, 48, doc.y - 30);
    doc.fillColor(C_DARK_GREEN).fontSize(9.5).font("Helvetica-Bold").text(p.titulo, 100, doc.y - 30);
    doc.fillColor(C_TEXT_DARK).fontSize(8.5).font("Helvetica").text(p.desc, 100, doc.y - 17, { width: 460 });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);
  doc.rect(40, doc.y, 532, 45).fill("#EFF6FF");
  doc.rect(40, doc.y - 45, 4, 45).fill("#2563EB");
  doc.fillColor("#1E40AF").fontSize(9.5).font("Helvetica-Bold").text("🤖 Chatbot IA y Respuestas Automáticas:", 50, doc.y - 38);
  doc.fillColor("#1E3A8A").fontSize(8.5).font("Helvetica").text(
    "El chatbot inteligente atiende 24/7. Si los participantes responden '1' confirman su asistencia (RSVP), si responden '2' declinan, y si preguntan por la fecha o ubicación, la IA les responde al instante.",
    50, doc.y - 24, { width: 510 }
  );

  // Finalizar el documento
  doc.end();

  return new Promise((resolve) => {
    writeStream.on("finish", () => {
      console.log("PDF generado en:", pdfPath);
      resolve(pdfPath);
    });
  });
}

buildManualPdf().catch(console.error);
