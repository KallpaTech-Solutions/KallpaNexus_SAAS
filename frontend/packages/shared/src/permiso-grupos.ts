export type PermisoGrupo = {
  id: string;
  label: string;
  codigos: string[];
};

const MODULO_LABEL: Record<string, string> = {
  sport: "Sport",
  stay: "Stay",
  care: "Care",
  platform: "Plataforma",
};

const RECURSO_LABEL: Record<string, string> = {
  canchas: "Canchas",
  reservas: "Reservas",
  clientes: "Clientes",
  usuarios: "Usuarios",
  roles: "Roles",
  empresas: "Empresas",
  tenants: "Tenants",
  planes: "Planes",
};

function tituloSegmento(seg: string): string {
  if (RECURSO_LABEL[seg]) return RECURSO_LABEL[seg];
  if (MODULO_LABEL[seg]) return MODULO_LABEL[seg];
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

/** Agrupa códigos tipo `modulo:recurso:accion` por `modulo:recurso`. */
export function groupPermisosCatalogo(codigos: string[]): PermisoGrupo[] {
  const map = new Map<string, string[]>();
  for (const c of codigos) {
    const parts = c.split(":");
    const id = parts.length >= 3 ? `${parts[0]}:${parts[1]}` : parts.length === 2 ? parts[0] : c;
    const list = map.get(id) ?? [];
    list.push(c);
    map.set(id, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, list]) => {
      const [mod, rec] = id.split(":");
      const label =
        rec != null
          ? `${tituloSegmento(mod)} · ${tituloSegmento(rec)}`
          : tituloSegmento(mod);
      return {
        id,
        label,
        codigos: [...list].sort(),
      };
    });
}

export function permisosGrupoSeleccionados(grupo: PermisoGrupo, selected: string[]): boolean {
  return grupo.codigos.length > 0 && grupo.codigos.every((c) => selected.includes(c));
}

export function permisosGrupoParcial(grupo: PermisoGrupo, selected: string[]): boolean {
  const n = grupo.codigos.filter((c) => selected.includes(c)).length;
  return n > 0 && n < grupo.codigos.length;
}

export function togglePermisoGrupo(selected: string[], grupo: PermisoGrupo, on: boolean): string[] {
  const set = new Set(selected);
  for (const c of grupo.codigos) {
    if (on) set.add(c);
    else set.delete(c);
  }
  return [...set].sort();
}

export function toggleTodosPermisos(catalogo: string[], selected: string[], on: boolean): string[] {
  if (!on) return [];
  return [...catalogo].sort();
}

export function todosPermisosSeleccionados(catalogo: string[], selected: string[]): boolean {
  return catalogo.length > 0 && catalogo.every((c) => selected.includes(c));
}

export function seleccionPermisosParcial(catalogo: string[], selected: string[]): boolean {
  const n = catalogo.filter((c) => selected.includes(c)).length;
  return n > 0 && n < catalogo.length;
}
