import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
  FolderPlus,
  Folder,
  Check,
  Pencil,
  Cloud,
  CloudUpload as CloudCheck,
} from "lucide-react";

export interface StoredContact {
  id: string;
  nombre: string;
  telefono: string;
  correo?: string;
  categoria?: string;
  notas?: string;
  folderIds?: string[];
  createdAt: string;
}

export interface BroadcastFolder {
  id: string;
  nombre: string;
  descripcion?: string;
  contactIds: string[];
  createdAt: string;
}

const STORAGE_KEY = "cmg_whatsapp_contacts_v1";
const FOLDERS_KEY = "cmg_whatsapp_folders_v1";

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
    // Sincronizar en la nube en app_secrets de Supabase
    supabase
      .from("app_secrets")
      .upsert(
        { key: "WA_CLOUD_CONTACTS", value: JSON.stringify(list), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .then(({ error }) => {
        if (error) console.warn("Sync warning (contacts):", error);
      });
  } catch (err) {
    console.error("Error al guardar contactos:", err);
  }
}

export function loadStoredFolders(): BroadcastFolder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredFolders(folders: BroadcastFolder[]) {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    // Sincronizar en la nube en app_secrets de Supabase
    supabase
      .from("app_secrets")
      .upsert(
        { key: "WA_CLOUD_FOLDERS", value: JSON.stringify(folders), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .then(({ error }) => {
        if (error) console.warn("Sync warning (folders):", error);
      });
  } catch (err) {
    console.error("Error al guardar carpetas:", err);
  }
}

interface WhatsAppContactsProps {
  onOpenChatWithContact?: (contact: { name: string; phone: string }) => void;
  onSendContactsToCrm?: (contacts: StoredContact[]) => void;
}

export function WhatsAppContacts({ onOpenChatWithContact, onSendContactsToCrm }: WhatsAppContactsProps) {
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [folders, setFolders] = useState<BroadcastFolder[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [loadingFile, setLoadingFile] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modales CRUD
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<StoredContact | null>(null);

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<BroadcastFolder | null>(null);

  // Formulario nuevo / editar contacto
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualCategory, setManualCategory] = useState("General");
  const [manualNotes, setManualNotes] = useState("");
  const [selectedFolderForContact, setSelectedFolderForContact] = useState<string>("");

  // Formulario nueva / editar carpeta
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");

  // Sincronización Nube desde Supabase
  const syncFromCloud = async () => {
    setCloudSyncing(true);
    try {
      const { data } = await supabase
        .from("app_secrets")
        .select("key, value")
        .in("key", ["WA_CLOUD_CONTACTS", "WA_CLOUD_FOLDERS"]);

      const cloudC = data?.find((d) => d.key === "WA_CLOUD_CONTACTS")?.value;
      const cloudF = data?.find((d) => d.key === "WA_CLOUD_FOLDERS")?.value;

      if (cloudC) {
        const parsedC = JSON.parse(cloudC);
        setContacts(parsedC);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedC));
      } else {
        setContacts(loadStoredContacts());
      }

      if (cloudF) {
        const parsedF = JSON.parse(cloudF);
        setFolders(parsedF);
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(parsedF));
      } else {
        setFolders(loadStoredFolders());
      }
    } catch (err) {
      console.error("Error syncing contacts from cloud:", err);
      setContacts(loadStoredContacts());
      setFolders(loadStoredFolders());
    } finally {
      setCloudSyncing(false);
    }
  };

  useEffect(() => {
    syncFromCloud();
  }, []);

  // --- CRUD CONTACTOS ---

  const handleSaveContact = (newContact: StoredContact) => {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== newContact.id && c.telefono !== newContact.telefono);
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
      id: `contact-${Date.now()}`,
      nombre: manualName.trim(),
      telefono: cleanPhone,
      correo: manualEmail.trim() || undefined,
      categoria: manualCategory.trim() || "General",
      notas: manualNotes.trim() || undefined,
      folderIds: selectedFolderForContact ? [selectedFolderForContact] : [],
      createdAt: new Date().toISOString(),
    };

    handleSaveContact(newContact);

    if (selectedFolderForContact) {
      setFolders((prev) => {
        const updated = prev.map((f) =>
          f.id === selectedFolderForContact
            ? { ...f, contactIds: Array.from(new Set([...f.contactIds, newContact.id])) }
            : f
        );
        saveStoredFolders(updated);
        return updated;
      });
    }

    toast.success(`Contacto ${newContact.nombre} agregado`);

    setManualName("");
    setManualPhone("");
    setManualEmail("");
    setManualCategory("General");
    setManualNotes("");
    setSelectedFolderForContact("");
    setIsAddDialogOpen(false);
  };

  // Abrir Modal de Edición de Contacto
  const handleOpenEditContact = (contact: StoredContact) => {
    setEditingContact(contact);
    setManualName(contact.nombre);
    setManualPhone(contact.telefono);
    setManualEmail(contact.correo || "");
    setManualCategory(contact.categoria || "General");
    setManualNotes(contact.notas || "");
    setSelectedFolderForContact(contact.folderIds?.[0] || "");
    setIsEditDialogOpen(true);
  };

  // Guardar Cambios de Edición de Contacto (UPDATE)
  const handleEditContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !manualName.trim() || !manualPhone.trim()) return;

    const cleanPhone = normalizePhone(manualPhone);

    const updatedC: StoredContact = {
      ...editingContact,
      nombre: manualName.trim(),
      telefono: cleanPhone,
      correo: manualEmail.trim() || undefined,
      categoria: manualCategory.trim() || "General",
      notas: manualNotes.trim() || undefined,
      folderIds: selectedFolderForContact ? [selectedFolderForContact] : editingContact.folderIds || [],
    };

    handleSaveContact(updatedC);
    toast.success(`Contacto ${updatedC.nombre} modificado correctamente`);
    setIsEditDialogOpen(false);
    setEditingContact(null);
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar este contacto?")) {
      setContacts((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        saveStoredContacts(updated);
        return updated;
      });

      setFolders((prev) => {
        const updated = prev.map((f) => ({
          ...f,
          contactIds: f.contactIds.filter((cId) => cId !== id),
        }));
        saveStoredFolders(updated);
        return updated;
      });

      toast.info("Contacto eliminado correctamente");
    }
  };

  // --- CRUD CARPETAS ---

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    const newFolder: BroadcastFolder = {
      id: `folder-${Date.now()}`,
      nombre: folderName.trim(),
      descripcion: folderDesc.trim() || undefined,
      contactIds: [],
      createdAt: new Date().toISOString(),
    };

    setFolders((prev) => {
      const updated = [newFolder, ...prev];
      saveStoredFolders(updated);
      return updated;
    });

    toast.success(`Carpeta "${newFolder.nombre}" creada`);
    setFolderName("");
    setFolderDesc("");
    setIsFolderDialogOpen(false);
  };

  const handleOpenEditFolder = (folder: BroadcastFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.nombre);
    setFolderDesc(folder.descripcion || "");
    setIsEditFolderOpen(true);
  };

  const handleEditFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !folderName.trim()) return;

    const updatedF: BroadcastFolder = {
      ...editingFolder,
      nombre: folderName.trim(),
      descripcion: folderDesc.trim() || undefined,
    };

    setFolders((prev) => {
      const updated = prev.map((f) => (f.id === editingFolder.id ? updatedF : f));
      saveStoredFolders(updated);
      return updated;
    });

    toast.success(`Carpeta "${updatedF.nombre}" modificada`);
    setIsEditFolderOpen(false);
    setEditingFolder(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (window.confirm("¿Deseas eliminar esta carpeta de difusión?")) {
      setFolders((prev) => {
        const updated = prev.filter((f) => f.id !== folderId);
        saveStoredFolders(updated);
        return updated;
      });
      if (selectedFolderId === folderId) setSelectedFolderId("all");
      toast.info("Carpeta eliminada");
    }
  };

  const handleToggleContactFolder = (contactId: string, folderId: string) => {
    setFolders((prev) => {
      const updated = prev.map((f) => {
        if (f.id === folderId) {
          const exists = f.contactIds.includes(contactId);
          const newIds = exists ? f.contactIds.filter((id) => id !== contactId) : [...f.contactIds, contactId];
          return { ...f, contactIds: newIds };
        }
        return f;
      });
      saveStoredFolders(updated);
      return updated;
    });

    setContacts((prev) => {
      const updated = prev.map((c) => {
        if (c.id === contactId) {
          const currentFolders = c.folderIds || [];
          const exists = currentFolders.includes(folderId);
          const newF = exists ? currentFolders.filter((id) => id !== folderId) : [...currentFolders, folderId];
          return { ...c, folderIds: newF };
        }
        return c;
      });
      saveStoredContacts(updated);
      return updated;
    });
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

      toast.success(`${addedCount} contactos procesados e integrados`);
    } catch (err: any) {
      toast.error(err.message || "Error al leer el archivo de contactos");
    } finally {
      setLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono.includes(search) ||
      (c.correo && c.correo.toLowerCase().includes(search.toLowerCase()));

    if (selectedFolderId === "all") return matchesSearch;
    const targetFolder = folders.find((f) => f.id === selectedFolderId);
    const isInFolder = targetFolder?.contactIds.includes(c.id) || (c.folderIds || []).includes(selectedFolderId);
    return matchesSearch && isInFolder;
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
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                Agenda de Contactos & Grupos en la Nube
                {cloudSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                ) : (
                  <Badge className="bg-teal-50 text-teal-800 border-teal-200 font-bold text-[10px]">
                    <Cloud className="w-3 h-3 mr-1 text-teal-600" /> Sincronizado en Nube
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Gestión CRUD completa (Crear, Leer, Modificar y Eliminar) sincronizada con Supabase
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setIsFolderDialogOpen(true)}
              variant="outline"
              className="h-11 rounded-xl border-teal-200 text-teal-800 font-extrabold px-4"
            >
              <FolderPlus className="w-4 h-4 mr-2 text-teal-600" /> Nueva Carpeta
            </Button>

            <Button
              onClick={() => {
                setManualName("");
                setManualPhone("");
                setManualEmail("");
                setManualCategory("General");
                setManualNotes("");
                setSelectedFolderForContact("");
                setIsAddDialogOpen(true);
              }}
              className="h-11 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold px-4"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Agregar Contacto
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingFile}
              variant="outline"
              className="h-11 rounded-xl border-slate-300 font-bold"
            >
              {loadingFile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Importar Excel
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

      {/* Selector de Carpetas con opción de Edición */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-teal-600" /> Carpetas / Grupos de Difusión
          </p>
          {selectedFolderId !== "all" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const target = folders.find((f) => f.id === selectedFolderId);
                  if (target) handleOpenEditFolder(target);
                }}
                className="text-xs font-bold text-teal-800 hover:underline flex items-center gap-1"
              >
                <Pencil className="w-3.5 h-3.5" /> Modificar Nombre/Descripción
              </button>

              <button
                onClick={() => handleDeleteFolder(selectedFolderId)}
                className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar Carpeta
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedFolderId("all")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 border ${
              selectedFolderId === "all"
                ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            📁 Todos los Contactos ({contacts.length})
          </button>

          {folders.map((folder) => {
            const count = contacts.filter(
              (c) => folder.contactIds.includes(c.id) || (c.folderIds || []).includes(folder.id)
            ).length;
            const isSelected = selectedFolderId === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 border flex items-center gap-2 ${
                  isSelected
                    ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>📂 {folder.nombre}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected ? "bg-teal-900 text-teal-100" : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador de Contactos */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contacto por nombre, WhatsApp o correo..."
            className="pl-10 h-11 rounded-xl border-slate-200 text-sm font-semibold"
          />
        </div>
      </div>

      {/* Tabla de Contactos con Acciones de Edición (UPDATE) y Borrado (DELETE) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" /> Contactos en la Nube ({filteredContacts.length})
          </p>

          {contacts.length > 0 && onSendContactsToCrm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSendContactsToCrm(filteredContacts)}
              className="rounded-xl border-teal-200 text-teal-800 font-extrabold text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Enviar esta lista a CRM
            </Button>
          )}
        </div>

        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">No hay contactos en esta vista</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              Agrega nuevos contactos o edita los existentes para asignarlos a esta carpeta.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-extrabold">Nombre</TableHead>
                  <TableHead className="font-extrabold">WhatsApp</TableHead>
                  <TableHead className="font-extrabold">Carpetas Asignadas</TableHead>
                  <TableHead className="font-extrabold">Categoría</TableHead>
                  <TableHead className="font-extrabold text-right">Acciones (CRUD)</TableHead>
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
                      <div className="flex flex-wrap gap-1">
                        {folders.map((f) => {
                          const isIn = f.contactIds.includes(contact.id) || (contact.folderIds || []).includes(f.id);
                          return (
                            <button
                              key={f.id}
                              onClick={() => handleToggleContactFolder(contact.id, f.id)}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                                isIn
                                  ? "bg-teal-100 text-teal-900 border-teal-300"
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isIn && <Check className="w-3 h-3 text-teal-700" />}
                              {f.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-800 border-slate-300 font-extrabold">
                        <Tag className="w-3 h-3 mr-1 text-slate-500" /> {contact.categoria || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
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

                        {/* Botón MODIFICAR (EDIT) */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenEditContact(contact)}
                          className="h-8 w-8 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        {/* Botón ELIMINAR (DELETE) */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

      {/* Modal MODIFICAR CONTACTO (UPDATE) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-teal-600" /> Modificar Contacto
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditContactSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Nombre Completo *</Label>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                required
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Número WhatsApp *</Label>
              <Input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                required
                className="h-11 rounded-xl border-slate-300 font-semibold font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Categoría / Red</Label>
              <Input
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Correo Electrónico</Label>
              <Input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Notas</Label>
              <Input
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl border-slate-300 font-bold">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal MODIFICAR CARPETA */}
      <Dialog open={isEditFolderOpen} onOpenChange={setIsEditFolderOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-teal-600" /> Modificar Carpeta de Difusión
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditFolderSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Nombre de la Carpeta *</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                required
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Descripción</Label>
              <Input
                value={folderDesc}
                onChange={(e) => setFolderDesc(e.target.value)}
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsEditFolderOpen(false)} className="rounded-xl border-slate-300 font-bold">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold">
                Guardar Carpeta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal AGREGAR CONTACTO */}
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
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Número WhatsApp *</Label>
              <Input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="Ej. 3001234567 o 573001234567"
                required
                className="h-11 rounded-xl border-slate-300 font-semibold font-mono"
              />
            </div>

            {folders.length > 0 && (
              <div>
                <Label className="text-xs font-bold text-slate-900 mb-1 block">Asignar a Carpeta</Label>
                <select
                  value={selectedFolderForContact}
                  onChange={(e) => setSelectedFolderForContact(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold bg-white"
                >
                  <option value="">Sin carpeta (General)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

      {/* Modal CREAR CARPETA */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-teal-600" /> Crear Carpeta / Grupo de Difusión
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateFolder} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Nombre de la Carpeta *</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Ej. Líderes de Red, Servidores VIP..."
                required
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-900 mb-1 block">Descripción (Opcional)</Label>
              <Input
                value={folderDesc}
                onChange={(e) => setFolderDesc(e.target.value)}
                placeholder="Ej. Equipo encargado de logística de eventos"
                className="h-11 rounded-xl border-slate-300 font-semibold"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsFolderDialogOpen(false)} className="rounded-xl border-slate-300 font-bold">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold">
                Crear Carpeta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
