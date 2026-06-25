"use client";

import { useEffect, useState } from "react";

type Props = {
  expiraEnUtc?: string | null;
  className?: string;
};

/** Tiempo restante antes de que venza el hold de una solicitud web. */
export function HoldExpiraCountdown({ expiraEnUtc, className }: Props) {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    if (!expiraEnUtc?.trim()) {
      setTexto(null);
      return;
    }

    const tick = () => {
      const fin = new Date(expiraEnUtc).getTime();
      if (Number.isNaN(fin)) {
        setTexto(null);
        return;
      }
      const ms = fin - Date.now();
      if (ms <= 0) {
        setTexto("Plazo vencido");
        return;
      }
      const min = Math.floor(ms / 60_000);
      const sec = Math.floor((ms % 60_000) / 1000);
      setTexto(`${min}:${String(sec).padStart(2, "0")} para confirmar`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiraEnUtc]);

  if (!texto) return null;

  const vencido = texto === "Plazo vencido";

  return (
    <span
      className={
        className ??
        `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          vencido ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
        }`
      }
    >
      {vencido ? "⏱ Plazo vencido" : `⏱ ${texto}`}
    </span>
  );
}
