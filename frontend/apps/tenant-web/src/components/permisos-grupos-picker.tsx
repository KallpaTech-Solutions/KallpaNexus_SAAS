"use client";

import {
  groupPermisosCatalogo,
  permisosGrupoParcial,
  permisosGrupoSeleccionados,
  seleccionPermisosParcial,
  togglePermisoGrupo,
  toggleTodosPermisos,
  todosPermisosSeleccionados,
} from "@kallpanexus/shared";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  catalogo: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
};

export function PermisosGruposPicker({ catalogo, selected, onChange, className }: Props) {
  const grupos = useMemo(() => groupPermisosCatalogo(catalogo), [catalogo]);
  const allRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = allRef.current;
    if (!el) return;
    el.indeterminate = seleccionPermisosParcial(catalogo, selected);
  }, [catalogo, selected]);

  function toggleCodigo(c: string) {
    onChange(
      selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c].sort()
    );
  }

  if (catalogo.length === 0) {
    return <p className="text-xs text-slate-500">Sin permisos disponibles.</p>;
  }

  return (
    <div className={className}>
      <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900">
        <input
          ref={allRef}
          type="checkbox"
          checked={todosPermisosSeleccionados(catalogo, selected)}
          onChange={(e) => onChange(toggleTodosPermisos(catalogo, selected, e.target.checked))}
        />
        Seleccionar todos ({catalogo.length})
      </label>
      <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {grupos.map((g) => {
          const full = permisosGrupoSeleccionados(g, selected);
          const partial = permisosGrupoParcial(g, selected);
          return (
            <fieldset key={g.id} className="rounded-md border border-slate-200 bg-white p-2">
              <legend className="flex w-full items-center gap-2 px-1">
                <input
                  type="checkbox"
                  checked={full}
                  ref={(el) => {
                    if (el) el.indeterminate = partial;
                  }}
                  onChange={(e) => onChange(togglePermisoGrupo(selected, g, e.target.checked))}
                />
                <span className="text-xs font-semibold text-slate-900">
                  {g.label}{" "}
                  <span className="font-normal text-slate-500">({g.codigos.length})</span>
                </span>
              </legend>
              <ul className="mt-1 space-y-0.5 pl-1">
                {g.codigos.map((c) => (
                  <li key={c}>
                    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-slate-800">
                      <input
                        type="checkbox"
                        checked={selected.includes(c)}
                        onChange={() => toggleCodigo(c)}
                      />
                      <code className="font-mono text-[11px] font-medium text-slate-900">{c}</code>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
