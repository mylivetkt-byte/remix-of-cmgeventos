import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Props {
  day: string;
  month: string;
  year: string;
  age: number | null;
  onDayChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  error?: string;
}

function getDaysInMonth(month: number, year: number) {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

export function DateOfBirthPicker({ day, month, year, age, onDayChange, onMonthChange, onYearChange, error }: Props) {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 120;
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => currentYear - i);
  const maxDays = getDaysInMonth(Number(month), Number(year));
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">Fecha de Nacimiento *</Label>
      <div className="grid grid-cols-3 gap-2">
        <Select value={day} onValueChange={onDayChange}>
          <SelectTrigger className="form-field-mobile">
            <SelectValue placeholder="Día" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={String(d)}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger className="form-field-mobile">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={onYearChange}>
          <SelectTrigger className="form-field-mobile">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground">Edad</Label>
        <Input
          readOnly
          value={age !== null ? `${age} años` : ""}
          placeholder="Se calcula automáticamente"
          className="form-field-mobile bg-muted cursor-not-allowed"
        />
      </div>
      {age !== null && age < 12 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Este evento está diseñado principalmente para personas desde los 12 años en adelante.
          <br /><br />
          Sin embargo, los más pequeños también son bienvenidos a acompañarnos y disfrutar del evento, sin necesidad de realizar registro.
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
