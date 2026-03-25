import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}

export function FormField({ label, required, type = "text", value, onChange, placeholder, error }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}{required && " *"}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="form-field-mobile"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
