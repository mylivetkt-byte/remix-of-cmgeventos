import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface CatalogItem {
  id: string;
  nombre: string;
}

interface Props {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  items: CatalogItem[] | undefined;
  isLoading: boolean;
  placeholder?: string;
  error?: string;
}

export function CatalogSelect({ label, required, value, onChange, items, isLoading, placeholder, error }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">{label}{required && " *"}</Label>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}{required && " *"}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="form-field-mobile">
          <SelectValue placeholder={placeholder || `Seleccionar ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {items?.map((item) => (
            <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
