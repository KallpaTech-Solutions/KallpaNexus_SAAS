"use client";

type SucursalOpt = { id: string; nombre: string; activa?: boolean };

type Props = {
  rolCodigo: string;
  sucursalIds: string[];
  onChange: (ids: string[]) => void;
  sucursales: SucursalOpt[];
};

/** Cajero: una sola sede (radio). Otros roles operativos: varias (checkbox). */
export function SucursalesStaffPicker({
  rolCodigo,
  sucursalIds,
  onChange,
  sucursales,
}: Props) {
  const lista = sucursales.filter((s) => s.activa !== false);
  const esCajero = rolCodigo === "Cajero";
  const inputType = esCajero ? "radio" : "checkbox";

  return (
    <div className="mt-3 rounded-lg border border-slate-800 p-3">
      <p className="mb-2 text-xs text-slate-400">
        Sucursales
        {esCajero && (
          <span className="ml-1 text-slate-500">· el cajero trabaja en una sola sede</span>
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        {lista.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type={inputType}
              name={esCajero ? "sucursal-staff" : undefined}
              checked={sucursalIds.includes(s.id)}
              onChange={(e) => {
                if (esCajero) {
                  onChange(e.target.checked ? [s.id] : []);
                  return;
                }
                onChange(
                  e.target.checked
                    ? [...sucursalIds, s.id]
                    : sucursalIds.filter((id) => id !== s.id)
                );
              }}
            />
            {s.nombre}
          </label>
        ))}
      </div>
      {lista.length === 0 && (
        <p className="text-xs text-amber-200/90">Crea sucursales antes de dar de alta staff.</p>
      )}
    </div>
  );
}
