import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

type CatalogTable = "catalog_tipo_documento" | "catalog_estado_civil" | "catalog_sexo" | "catalog_cdp" | "catalog_red" | "catalog_barrio";

const CATALOGS: { table: CatalogTable; label: string }[] = [
  { table: "catalog_tipo_documento", label: "Tipo de Documento" },
  { table: "catalog_estado_civil", label: "Estado Civil" },
  { table: "catalog_sexo", label: "Sexo" },
  { table: "catalog_cdp", label: "CDP" },
  { table: "catalog_red", label: "RED" },
  { table: "catalog_barrio", label: "Barrio" },
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
      toast.success(editing ? "Actualizado" : "Creado");
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
      toast.success("Eliminado");
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Catalog selector */}
      <div className="flex gap-2 flex-wrap">
        {CATALOGS.map((c) => (
          <button
            key={c.table}
            onClick={() => setSelected(c.table)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selected === c.table
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-lg">
          {CATALOGS.find((c) => c.table === selected)?.label}
        </h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Agregar
        </Button>
      </div>

      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              {selected === "catalog_cdp" && <TableHead>RED</TableHead>}
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nombre}</TableCell>
                {selected === "catalog_cdp" && (
                  <TableCell className="text-muted-foreground text-sm">
                    {redQuery.data?.find((r) => r.id === item.red_id)?.nombre || "—"}
                  </TableCell>
                )}
                <TableCell>{item.orden}</TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.activo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nuevo"} registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre del registro" />
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input type="number" value={formOrden} onChange={(e) => setFormOrden(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formActivo} onCheckedChange={setFormActivo} />
              <Label>Activo</Label>
            </div>
            {selected === "catalog_cdp" && (
              <div className="space-y-2">
                <Label>RED asociada</Label>
                <Select value={formRedId} onValueChange={setFormRedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar RED" />
                  </SelectTrigger>
                  <SelectContent>
                    {redQuery.data?.filter((r) => r.activo).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={!formName.trim()}>
              {editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
