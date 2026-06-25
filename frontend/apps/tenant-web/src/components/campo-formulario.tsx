"use client";

import { panel } from "@/lib/panel-light";
import type { ReactNode } from "react";

const inputClass = panel.input + " h-10 w-full";

type Props = {
  label: string;
  children: ReactNode;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

export function CampoFormulario({
  label,
  children,
  hint,
  disabled,
  className = "",
}: Props) {
  return (
    <div
      className={`${className} ${disabled ? "pointer-events-none opacity-45" : ""}`}
    >
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      <div className="[&_input:not([type=checkbox])]:h-10 [&_select:not([class*='bg-transparent'])]:h-10">
        {children}
      </div>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export { inputClass };
