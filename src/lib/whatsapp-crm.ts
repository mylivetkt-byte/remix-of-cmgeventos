export type CrmContact = {
  id: string;
  nombre: string;
  telefono: string;
  telefonoRaw: string;
  extra: Record<string, string>;
  status: "pending" | "sending" | "sent" | "error";
  error?: string;
};

const NAME_HEADERS = ["nombre", "nombres", "name", "nombre completo", "nombre_completo", "full name"];
const PHONE_HEADERS = ["whatsapp", "telefono", "teléfono", "celular", "phone", "numero", "número", "movil", "móvil"];

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const first = lines[0];
  const delimiter = (first.split(";").length > first.split(",").length) ? ";" : ",";
  return lines.map((line) => splitCsvLine(line, delimiter));
}

export function normalizePhone(raw: string): string {
  let digits = String(raw || "").replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("57") && digits.length >= 12) return digits;
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`;
  if (digits.length === 11 && digits.startsWith("03")) return `57${digits.slice(1)}`;
  return digits;
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx >= 0) return idx;
  }
  for (let i = 0; i < normalized.length; i++) {
    if (candidates.some((c) => normalized[i].includes(c))) return i;
  }
  return -1;
}

export function rowsToContacts(rows: string[][]): CrmContact[] {
  if (!rows.length) return [];

  const headers = rows[0].map((h) => String(h || "").trim());
  const nameIdx = findColumn(headers, NAME_HEADERS);
  const phoneIdx = findColumn(headers, PHONE_HEADERS);

  if (nameIdx < 0 || phoneIdx < 0) {
    throw new Error("La plantilla debe tener columnas de Nombre y WhatsApp/Teléfono");
  }

  const seen = new Set<string>();
  const contacts: CrmContact[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = String(row[nameIdx] || "").trim();
    const telefonoRaw = String(row[phoneIdx] || "").trim();
    const telefono = normalizePhone(telefonoRaw);
    if (!nombre || !telefono) continue;
    if (seen.has(telefono)) continue;
    seen.add(telefono);

    const extra: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      extra[normalizeHeader(header)] = String(row[idx] || "").trim();
    });

    contacts.push({
      id: `${telefono}-${i}`,
      nombre,
      telefono,
      telefonoRaw,
      extra,
      status: "pending",
    });
  }

  return contacts;
}

export function personalizeMessage(template: string, contact: CrmContact): string {
  const values: Record<string, string> = {
    nombre: contact.nombre,
    nombres: contact.nombre,
    name: contact.nombre,
    telefono: contact.telefono,
    telefono_raw: contact.telefonoRaw,
    whatsapp: contact.telefono,
    celular: contact.telefono,
    ...contact.extra,
  };

  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key: string) => {
    const normalized = normalizeHeader(key);
    return values[normalized] ?? "";
  });
}

export function sampleCsv(): string {
  return [
    "nombre;whatsapp",
    "Juan Pérez;3001234567",
    "María Gómez;3109876543",
    "Carlos Delgado;3205551122",
  ].join("\n");
}

export async function parseSpreadsheetFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCsv(await file.text());
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("El archivo de Excel no tiene hojas");
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as string[][];
  }

  throw new Error("Formato no soportado. Usa .xlsx o .csv");
}
