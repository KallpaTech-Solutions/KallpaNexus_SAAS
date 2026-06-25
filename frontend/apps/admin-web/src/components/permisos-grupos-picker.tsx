"use client";

import { platformUi } from "@/lib/platform-ui";
import {
  groupPermisosCatalogo,
  permisosGrupoParcial,
  permisosGrupoSeleccionados,
  seleccionPermisosParcial,
  togglePermisoGrupo,
  toggleTodosPermisos,
  todosPermisosSeleccionados,
} from "@kallpanexus/shared";
import { useMemo, useRef, useEffect } from "react";

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
    return <p className={`text-xs ${platformUi.textMuted}`}>Sin permisos disponibles.</p>;
  }

  return (
    <div className={className}>
      <label className={`mb-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--p-text)]`}>
        <input
          ref={allRef}
          type="checkbox"
          checked={todosPermisosSeleccionados(catalogo, selected)}
          onChange={(e) => onChange(toggleTodosPermisos(catalogo, selected, e.target.checked))}
        />
        Seleccionar todos ({catalogo.length})
      </label>
      <div className="space-y-3">
        {grupos.map((g) => {
          const full = permisosGrupoSeleccionados(g, selected);
          const partial = permisosGrupoParcial(g, selected);
          return (
            <fieldset key={g.id} className={platformUi.fieldset}>
              <legend className="flex w-full items-center gap-2">
                <input
                  type="checkbox"
                  checked={full}
                  ref={(el) => {
                    if (el) el.indeterminate = partial;
                  }}
                  onChange={(e) => onChange(togglePermisoGrupo(selected, g, e.target.checked))}
                />
                <span className="text-sm font-semibold text-[var(--p-text)]">
                  {g.label}{" "}
                  <span className={`font-normal ${platformUi.textMuted}`}>({g.codigos.length})</span>
                </span>
              </legend>
              <ul className="mt-2 space-y-1 pl-1">
                {g.codigos.map((c) => (
                  <li key={c}>
                    <label className={`flex cursor-pointer items-center gap-2 text-xs ${platformUi.textBody}`}>
                      <input
                        type="checkbox"
                        checked={selected.includes(c)}
                        onChange={() => toggleCodigo(c)}
                      />
                      <code className="font-mono">{c}</code>
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
