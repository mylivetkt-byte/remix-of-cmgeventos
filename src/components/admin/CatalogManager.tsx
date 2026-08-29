import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText, Heart, User, Home, Network, MapPin, ListFilter } from "lucide-react";

type CatalogTable = "catalog_tipo_documento" | "catalog_estado_civil" | "catalog_sexo" | "catalog_cdp" | "catalog_red" | "catalog_barrio";

const CATALOGS: { table: CatalogTable; label: string; icon: React.ReactNode }[] = [
  { table: "catalog_tipo_documento", label: "Tipo de Documento", icon: <FileText className="w-3.5 h-3.5" /> },
  { table: "catalog_estado_civil", label: "Estado Civil", icon: <Heart className="w-3.5 h-3.5" /> },
  { table: "catalog_sexo", label: "Sexo", icon: <User className="w-3.5 h-3.5" /> },
  { table: "catalog_cdp", label: "Casa de Paz (CDP)", icon: <Home className="w-3.5 h-3.5" /> },
  { table: "catalog_red", label: "RED Ministerial", icon: <Network className="w-3.5 h-3.5" /> },
  { table: "catalog_barrio", label: "Barrio", icon: <MapPin className="w-3.5 h-3.5" /> },
];

interface CatalogItem {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
  red_id?: string | null;
}

export function CatalogManager() {
  const [selected, setSelected] = useState<CatalogTable>("catalog_tipo_documento");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formOrden, setFormOrden] = useState(0);
  const [formActivo, setFormActivo] = useState(true);
  const [formRedId, setFormRedId] = useState<string>("");
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [selected, "admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from(selected).select("*").order("orden");
      if (error) throw error;
      return data as CatalogItem[];
    },
  });

  const redQuery = useQuery({
    queryKey: ["catalog_red", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_red").select("*").order("orden");
      if (error) throw error;
      return data as CatalogItem[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload: any = { nombre: formName, orden: formOrden, activo: formActivo };
      if (selected === "catalog_cdp") {
        payload.red_id = formRedId || null;
      }
      if (editing) {
        const { error } = await supabase.from(selected).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(selected).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Actualizado correctamente" : "Creado correctamente");
      queryClient.invalidateQueries({ queryKey: [selected, "admin"] });
      queryClient.invalidateQueries({ queryKey: [selected] });
      if (selected === "catalog_cdp") {
        queryClient.invalidateQueries({ queryKey: ["catalog_cdp_with_red"] });
      }
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(selected).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: [selected, "admin"] });
      queryClient.invalidateQueries({ queryKey: [selected] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setFormName("");
    setFormOrden((query.data?.length || 0) + 1);
    setFormActivo(true);
    setFormRedId("");
    setDialogOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setFormName(item.nombre);
    setFormOrden(item.orden);
    setFormActivo(item.activo);
    setFormRedId(item.red_id || "");
    setDialogOpen(true);
  };

  const activeCatalogObj = CATALOGS.find((c) => c.table === selected);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 font-sans pb-8">
      {/* Selector de Catálogo estilo Menú Nav Sub-pestañas Limpias (iglesiacmg.lovable.app) */}
      <div className="bg-white border border-slate-200 p-1.5 rounded-2xl shadow-xs flex gap-1.5 flex-wrap">
        {CATALOGS.map((c) => {
          const isSelected = selected === c.table;
          return (
            <button
              key={c.table}
              onClick={() => setSelected(c.table)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isSelected
                  ? "bg-teal-100/90 text-teal-950 shadow-xs border border-teal-200/80 font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium"
              }`}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Cabecera y Botón Nuevo */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <ListFilter className="w-5 h-5 text-teal-700" />
          <h2 className="font-heading font-black text-lg text-slate-900">
            {activeCatalogObj?.label}
          </h2>
        </div>
        <Button size="sm" onClick={openNew} className="bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs">
          <Plus className="w-4 h-4 mr-1 text-teal-200" /> Agregar Registro
        </Button>
      </div>

      {/* Tabla con Estilo Blanco Pulcro y Gris Claro */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <TableRow className="border-slate-200 hover:bg-slate-50">
              <TableHead className="text-slate-800 font-extrabold text-xs">Nombre</TableHead>
              {selected === "catalog_cdp" && <TableHead className="text-teal-800 font-extrabold text-xs">RED Asociada</TableHead>}
              <TableHead className="text-slate-800 font-extrabold text-xs">Orden</TableHead>
              <TableHead className="text-slate-800 font-extrabold text-xs">Estado</TableHead>
              <TableHead className="text-slate-800 font-extrabold text-xs text-right pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.map((item) => (
              <TableRow key={item.id} className="hover:bg-emerald-50/60 border-emerald-100 transition-colors">
                <TableCell className="font-bold text-emerald-950 text-xs">{item.nombre}</TableCell>
                {selected === "catalog_cdp" && (
                  <TableCell className="text-emerald-800 font-medium text-xs">
                    {redQuery.data?.find((r) => r.id === item.red_id)?.nombre || "—"}
                  </TableCell>
                )}
                <TableCell className="text-emerald-900 font-semibold text-xs">{item.orden}</TableCell>
                <TableCell>
                  <Badge className={item.activo ? "bg-emerald-600 text-white font-bold text-[10px]" : "bg-slate-200 text-slate-700 font-bold text-[10px]"}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 text-emerald-800 hover:bg-emerald-100">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(item.id)} className="h-8 w-8 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {query.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={selected === "catalog_cdp" ? 5 : 4} className="text-center py-8 text-xs text-emerald-700 font-medium">
                  No hay registros creados en este catálogo todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Crear / Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-white border-emerald-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-extrabold text-emerald-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />
              {editing ? "Editar Registro" : "Nuevo Registro"} — {activeCatalogObj?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-emerald-950">Nombre *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: CÉDULA DE CIUDADANÍA / RED DE JÓVENES"
                className="bg-white border-emerald-300 text-xs font-semibold text-emerald-950"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-emerald-950">Orden de Visualización</Label>
              <Input
                type="number"
                value={formOrden}
                onChange={(e) => setFormOrden(Number(e.target.value))}
                className="bg-white border-emerald-300 text-xs font-semibold text-emerald-950"
              />
            </div>
            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <Label className="text-xs font-semibold text-emerald-950">Estado Activo</Label>
              <Switch checked={formActivo} onCheckedChange={setFormActivo} />
            </div>

            {selected === "catalog_cdp" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-emerald-950">RED Ministerial Asociada</Label>
                <Select value={formRedId} onValueChange={setFormRedId}>
                  <SelectTrigger className="bg-white border-emerald-300 text-xs font-semibold text-emerald-950">
                    <SelectValue placeholder="Seleccionar RED" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-emerald-200">
                    {redQuery.data?.filter((r) => r.activo).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-emerald-300 text-emerald-900">
              Cancelar
            </Button>
            <Button onClick={() => upsert.mutate()} disabled={!formName.trim()} className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold">
              {editing ? "Guardar Cambios" : "Crear Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
