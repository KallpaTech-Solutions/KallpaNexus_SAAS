"use client";

import {
  joinDateTimeLocalValue,
  splitDateTimeLocalValue,
} from "@kallpanexus/shared";
import { HoraSelector } from "@/components/hora-selector";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function ReservaFechaHora({ value, onChange, className = "" }: Props) {
  const { fecha, hora } = splitDateTimeLocalValue(value);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="date"
        className="panel-input h-10 min-w-[9.5rem] flex-1"
        value={fecha}
        onChange={(e) => onChange(joinDateTimeLocalValue(e.target.value, hora))}
      />
      <HoraSelector
        inline
        className="min-w-[10.5rem] flex-1"
        value={hora}
        onChange={(h) => onChange(joinDateTimeLocalValue(fecha, h))}
      />
    </div>
  );
}
