"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmd(value: string): Date {
  const [y, m, day] = value.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type Props = {
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
};

export function PublicMiniCalendario({ value, onChange, className }: Props) {
  const selected = parseYmd(value);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );

  const todayYmd = toYmd(startOfToday());

  const cells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const out: { ymd: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      out.push({ ymd: "", day: 0, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ ymd: toYmd(new Date(y, m, d)), day: d, inMonth: true });
    }
    return out;
  }, [viewMonth]);

  const tituloMes = viewMonth.toLocaleDateString("es-PE", { month: "long", year: "numeric" });

  return (
    <div className={className ?? ""}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          onClick={() =>
            setViewMonth((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-slate-800">{tituloMes}</p>
        <button
          type="button"
          aria-label="Mes siguiente"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
          onClick={() =>
            setViewMonth((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))
          }
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase text-slate-400">
        {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((c, i) => {
          if (!c.inMonth) {
            return <span key={`e-${i}`} className="aspect-square" />;
          }
          const isPast = c.ymd < todayYmd;
          const isSel = c.ymd === value;
          return (
            <button
              key={c.ymd}
              type="button"
              disabled={isPast}
              onClick={() => onChange(c.ymd)}
              className={`aspect-square rounded-lg text-xs font-medium transition ${
                isSel
                  ? "bg-emerald-600 text-white"
                  : isPast
                    ? "text-slate-300"
                    : "text-slate-700 hover:bg-emerald-50"
              }`}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function fechaHoyInput(): string {
  return toYmd(startOfToday());
}
