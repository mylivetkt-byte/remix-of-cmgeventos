import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseSpreadsheetFile, rowsToContacts, sampleCsv, normalizePhone } from "@/lib/whatsapp-crm";
import {
  Users,
  UserPlus,
  Upload,
  Download,
  Search,
  MessageCircle,
  Trash2,
  FileSpreadsheet,
  Loader2,
  Mail,
  Phone,
  Tag,
  Send,
} from "lucide-react";

export interface StoredContact {
  id: string;
  nombre: string;
  telefono: string;
  correo?: string;
  categoria?: string;
  notas?: string;
  createdAt: string;
}

const STORAGE_KEY = "cmg_whatsapp_contacts_v1";

export function loadStoredContacts(): StoredContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredContacts(list: StoredContact[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Error al guardar contactos en localStorage:", err);
  }
}

interface WhatsAppContactsProps {
  onOpenChatWithContact?: (contact: { name: string; phone: string }) => void;
  onSendContactsToCrm?: (contacts: StoredContact[]) => void;
}

export function WhatsAppContacts({ onOpenChatWithContact, onSendContactsToCrm }: WhatsAppContactsProps) {
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loadingFile, setLoadingFile] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario de nuevo contacto manual
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualCategory, setManualCategory] = useState("General");
  const [manualNotes, setManualNotes] = useState("");

  useEffect(() => {
    setContacts(loadStoredContacts());
  }, []);

  const handleSaveContact = (newContact: StoredContact) => {
    setContacts((prev) => {
      // Evitar duplicados por teléfono
      const filtered = prev.filter((c) => c.telefono !== newContact.telefono);
      const updated = [newContact, ...filtered];
      saveStoredContacts(updated);
      return updated;
    });
  };

  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) {
      toast.error("El nombre y el teléfono son obligatorios");
      return;
    }

    const cleanPhone = normalizePhone(manualPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("Ingresa un número de teléfono de WhatsApp válido");
      return;
    }

    const newContact: StoredContact = {
      id: `manual-${Date.now()}`,
      nombre: manualName.trim(),
      telefono: cleanPhone,
      correo: manualEmail.trim() || undefined,
      categoria: manualCategory.trim() || "General",
      notas: manualNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    handleSaveContact(newContact);
    toast.success(`Contacto ${newContact.nombre} agregado`);

    // Limpiar formulario y cerrar
    setManualName("");
    setManualPhone("");
    setManualEmail("");
    setManualCategory("General");
    setManualNotes("");
    setIsAddDialogOpen(false);
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setLoadingFile(true);
    try {
      const rows = await parseSpreadsheetFile(file);
      const parsed = rowsToContacts(rows);

      if (parsed.length === 0) {
        toast.error("No se encontraron contactos válidos en el archivo");
        return;
      }

      let addedCount = 0;
      setContacts((prev) => {
        const phoneMap = new Map<string, StoredContact>();
        prev.forEach((c) => phoneMap.set(c.telefono, c));

        parsed.forEach((p, idx) => {
          const newC: StoredContact = {
            id: `import-${Date.now()}-${idx}`,
            nombre: p.nombre,
            telefono: p.telefono,
            categoria: p.extra?.["categoria"] || p.extra?.["red"] || "Importado Excel",
            correo: p.extra?.["correo"] || p.extra?.["email"] || undefined,
            createdAt: new Date().toISOString(),
          };
          if (!phoneMap.has(p.telefono)) addedCount++;
          phoneMap.set(p.telefono, newC);
        });

        const updated = Array.from(phoneMap.values());
        saveStoredContacts(updated);
        return updated;
      });

      toast.success(`${addedCount} contactos procesados correctamente`);
    } catch (err: any) {
      toast.error(err.message || "Error al leer el archivo de contactos");
    } finally {
      setLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveStoredContacts(updated);
      return updated;
    });
    toast.info("Contacto eliminado");
  };

  const handleClearAll = () => {
    if (window.confirm("¿Seguro que deseas eliminar todos los contactos de la lista local?")) {
      setContacts([]);
      saveStoredContacts([]);
      toast.success("Agenda de contactos limpiada");
    }
  };

  const handleExportCsv = () => {
    if (contacts.length === 0) {
      toast.error("No hay contactos para exportar");
      return;
    }
    const headers = ["Nombre", "WhatsApp", "Correo", "Categoria", "Notas"];
    const rows = contacts.map((c) => [
      `"${c.nombre.replace(/"/g, '""')}"`,
      `"${c.telefono}"`,
      `"${c.correo || ""}"`,
      `"${c.categoria || ""}"`,
      `"${(c.notas || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactos-whatsapp-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = Array.from(new Set(contacts.map((c) => c.categoria || "General")));

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono.includes(search) ||
      (c.correo && c.correo.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === "all" || c.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 font-sans pb-8">
      {/* Cabecera del Módulo */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 text-teal-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Agenda y Contactos de WhatsApp</h2>
              <p className="text-sm text-slate-500 font-medium">
                Administra tus contactos para chats directos y campañas CRM
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="h-11 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold px-4"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Agregar Manual
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingFile}
              variant="outline"
              className="h-11 rounded-xl border-slate-300 font-bold"
            >
              {loadingFile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Importar Excel / CSV
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />

            <Button
              onClick={handleExportCsv}
              variant="outline"
              disabled={contacts.length === 0}
              className="h-11 rounded-xl border-slate-300 font-bold"
            >
              <Download className="w-4 h-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtro */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, WhatsApp o correo..."
            className="pl-10 h-11 rounded-xl border-slate-300 text-sm font-semibold"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <span className="text-xs font-extrabold text-slate-500 uppercase shrink-0">Categoría:</span>
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors shrink-0 ${
              selectedCategory === "all"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Todas ({contacts.length})
          </button>

          {categories.map((cat) => {
            const count = contacts.filter((c) => c.categoria === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors shrink-0 ${
                  isSelected
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla de Contactos */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" /> Contactos Filtrados ({filteredContacts.length})
          </p>

          {contacts.length > 0 && (
            <div className="flex items-center gap-3">
              {onSendContactsToCrm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSendContactsToCrm(filteredContacts)}
                  className="rounded-xl border-teal-200 text-teal-800 font-extrabold text-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Enviar lista a CRM
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearAll}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar todo
              </Button>
            </div>
          )}
        </div>

        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">No se encontraron contactos en esta vista</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              Usa el botón "Agregar Manual" o importa un archivo de Excel/CSV para poblar tu agenda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-extrabold">Nombre</TableHead>
                  <TableHead className="font-extrabold">WhatsApp</TableHead>
                  <TableHead className="font-extrabold">Categoría / Red</TableHead>
                  <TableHead className="font-extrabold">Correo</TableHead>
                  <TableHead className="font-extrabold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="font-bold text-slate-900">{contact.nombre}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                        <Phone className="w-3 h-3 text-emerald-600" /> +{contact.telefono}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-800 border-slate-300 font-extrabold">
                        <Tag className="w-3 h-3 mr-1 text-slate-500" /> {contact.categoria || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">
                      {contact.correo ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {contact.correo}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onOpenChatWithContact && (
                          <Button
                            size="sm"
                            onClick={() =>
                              onOpenChatWithContact({ name: contact.nombre, phone: contact.telefono })
                            }
                            className="h-8 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chatear
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal para Agregar Contacto Manualmente */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-600" /> Agregar Nuevo Contacto
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddManualSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Nombre Completo *</Label>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                required
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Número WhatsApp (Celular) *</Label>
              <Input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="Ej. 3001234567 o 573001234567"
                required
                className="h-11 rounded-xl border-slate-300 font-semibold font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Se antepondrá el código 57 automáticamente si es de 10 dígitos</p>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Categoría / Red</Label>
              <Input
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                placeholder="Ej. VIP, Lideres, General"
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Correo Electrónico (Opcional)</Label>
              <Input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Notas (Opcional)</Label>
              <Input
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Ej. Confirmó asistencia..."
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl border-slate-300 font-bold">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold">
                Guardar Contacto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
