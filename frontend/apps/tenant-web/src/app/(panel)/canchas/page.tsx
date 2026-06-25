"use client";

import { PERMISOS_SPORT } from "@kallpanexus/types";
import type { CanchaListItem } from "@kallpanexus/types";
import { getApiErrorMessage } from "@kallpanexus/api-client";
import { useTenantApi } from "@/lib/api-context";
import { canAccess, useAuthStore } from "@/lib/auth-store";
import { panel } from "@/lib/panel-light";
import { useUiFeedback } from "@/components/ui-feedback-provider";
import { AvisoElegirSedeOperacion } from "@/components/aviso-elegir-sede-operacion";
import { useCanchasOperacion } from "@/lib/use-canchas-operacion";
import { useOperacionSucursal } from "@/lib/use-operacion-sucursal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { PUBLIC_CANCHA_IMAGE, resolveMediaUrl } from "@/lib/public-brand";

export default function CanchasPage() {
  const api = useTenantApi();
  const { confirmar, notificar } = useUiFeedback();
  const qc = useQueryClient();
  const permisos = useAuthStore((s) => s.session?.permisos ?? []);
  const puedeVer = canAccess(permisos, PERMISOS_SPORT.canchasVer);
  const puedeCrear = canAccess(permisos, PERMISOS_SPORT.canchasCrear);
  const puedeModificar = canAccess(permisos, PERMISOS_SPORT.canchasModificar);

  const { sucursalIdParaApi } = useOperacionSucursal();
  const { data: canchas = [], isLoading } = useCanchasOperacion(puedeVer);

  const { data: sucursales = [] } = useQuery({
    queryKey: ["sucursales"],
    queryFn: () => api.sucursales.list(),
    enabled: puedeVer,
  });

  const sucursalMap = useMemo(
    () => new Map(sucursales.map((s) => [s.id, s])),
    [sucursales]
  );

  const [nombre, setNombre] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [tipo, setTipo] = useState("Futbol_7");
  const [iluminacion, setIluminacion] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editImagenWebUrl, setEditImagenWebUrl] = useState<string | null>(null);
  const canchaImagenInputRef = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState({
    nombre: "",
    sucursalId: "",
    tipo: "Futbol_7",
    tieneIluminacion: true,
    estaActiva: true,
  });

  useEffect(() => {
    if (sucursalIdParaApi && !sucursalId) {
      setSucursalId(sucursalIdParaApi);
    }
  }, [sucursalIdParaApi, sucursalId]);

  const crear = useMutation({
    mutationFn: () =>
      api.canchas.crear({
        sucursalId,
        nombre,
        tipo,
        tieneIluminacion: iluminacion,
      }),
    onSuccess: () => {
      setNombre("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["canchas"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const guardar = useMutation({
    mutationFn: () => {
      if (!editId) throw new Error("Sin cancha");
      return api.canchas.actualizar(editId, {
        sucursalId: edit.sucursalId,
        nombre: edit.nombre,
        tipo: edit.tipo,
        tieneIluminacion: edit.tieneIluminacion,
        estaActiva: edit.estaActiva,
      });
    },
    onSuccess: () => {
      setEditId(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["canchas"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.canchas.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canchas"] }),
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const subirImagenCancha = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      api.canchas.subirImagenWeb(id, file),
    onSuccess: (res) => {
      setEditImagenWebUrl(res.imagenWebUrl);
      qc.invalidateQueries({ queryKey: ["canchas"] });
      notificar("Imagen de cancha actualizada.", "exito");
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const quitarImagenCancha = useMutation({
    mutationFn: (id: string) => api.canchas.quitarImagenWeb(id),
    onSuccess: () => {
      setEditImagenWebUrl(null);
      qc.invalidateQueries({ queryKey: ["canchas"] });
      notificar("Se usará la imagen por defecto en la web.", "exito");
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  function abrirEditar(c: CanchaListItem) {
    setEditId(c.id);
    setEditImagenWebUrl(c.imagenWebUrl ?? null);
    setEdit({
      nombre: c.nombre,
      sucursalId: c.sucursalId,
      tipo: c.tipoCancha,
      tieneIluminacion: c.tieneIluminacion,
      estaActiva: c.estaActiva,
    });
    setError(null);
  }

  const sucursalSeleccionada = sucursalId ? sucursalMap.get(sucursalId) : null;
  const sucursalEdit = edit.sucursalId ? sucursalMap.get(edit.sucursalId) : null;

  if (!puedeVer) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Sin permiso sport:canchas:ver
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className={panel.heading}>Canchas</h2>
        <p className={panel.subheading}>
          Cada cancha pertenece a una sucursal (dirección y teléfono del local).
        </p>
      </header>

      <AvisoElegirSedeOperacion />

      {puedeCrear && (
        <section className={panel.card + " p-4"}>
          <h3 className={panel.sectionTitle}>Nueva cancha</h3>
          <CanchaForm
            nombre={nombre}
            setNombre={setNombre}
            sucursalId={sucursalId}
            setSucursalId={setSucursalId}
            tipo={tipo}
            setTipo={setTipo}
            iluminacion={iluminacion}
            setIluminacion={setIluminacion}
            sucursales={sucursales}
          />
          {sucursalSeleccionada && (
            <SucursalDetalle sucursal={sucursalSeleccionada} />
          )}
          <button
            type="button"
            className={"mt-3 " + panel.btnPrimary}
            onClick={() => crear.mutate()}
            disabled={!nombre || !sucursalId}
          >
            Guardar cancha
          </button>
        </section>
      )}

      {editId && puedeModificar && (
        <section className={panel.cardAccent + " p-4"}>
          <h3 className={panel.sectionTitle}>Editar cancha</h3>
          <CanchaForm
            nombre={edit.nombre}
            setNombre={(v) => setEdit((x) => ({ ...x, nombre: v }))}
            sucursalId={edit.sucursalId}
            setSucursalId={(v) => setEdit((x) => ({ ...x, sucursalId: v }))}
            tipo={edit.tipo}
            setTipo={(v) => setEdit((x) => ({ ...x, tipo: v }))}
            iluminacion={edit.tieneIluminacion}
            setIluminacion={(v) => setEdit((x) => ({ ...x, tieneIluminacion: v }))}
            sucursales={sucursales}
            activa={edit.estaActiva}
            setActiva={(v) => setEdit((x) => ({ ...x, estaActiva: v }))}
          />
          {sucursalEdit && <SucursalDetalle sucursal={sucursalEdit} />}
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600">Foto en landing web</p>
            <div
              className="mt-2 h-28 rounded-lg bg-cover bg-center bg-slate-200"
              style={{
                backgroundImage: `url(${resolveMediaUrl(editImagenWebUrl, PUBLIC_CANCHA_IMAGE)})`,
              }}
            />
            <input
              ref={canchaImagenInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && editId) subirImagenCancha.mutate({ id: editId, file: f });
                e.target.value = "";
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={panel.btnSecondary + " text-xs"}
                disabled={subirImagenCancha.isPending}
                onClick={() => canchaImagenInputRef.current?.click()}
              >
                Subir imagen
              </button>
              {editImagenWebUrl && (
                <button
                  type="button"
                  className={panel.btnSecondary + " text-xs"}
                  disabled={quitarImagenCancha.isPending}
                  onClick={() => editId && quitarImagenCancha.mutate(editId)}
                >
                  Quitar (usar predeterminada)
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={panel.btnPrimary}
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending}
            >
              Guardar cambios
            </button>
            <button
              type="button"
              className={panel.btnSecondary}
              onClick={() => setEditId(null)}
            >
              Cerrar
            </button>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-slate-600">Cargando…</p>}
        {canchas.map((c) => {
          const suc = sucursalMap.get(c.sucursalId);
          return (
            <article key={c.id} className={panel.card + " overflow-hidden p-0"}>
              <div
                className="h-24 bg-cover bg-center bg-slate-200"
                style={{
                  backgroundImage: `url(${resolveMediaUrl(c.imagenWebUrl, PUBLIC_CANCHA_IMAGE)})`,
                }}
              />
              <div className="p-4">
              <h3 className="font-semibold text-slate-900">{c.nombre}</h3>
              <p className="text-sm text-slate-600">{c.nombreSucursal}</p>
              {suc && (
                <p className="mt-1 text-xs text-slate-500">
                  {suc.direccion} · {suc.telefono}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {c.tipoCancha} · {c.tieneIluminacion ? "Con luz" : "Sin luz"} ·{" "}
                {c.estaActiva ? "Activa" : "Inactiva"}
              </p>
              {puedeModificar && (
                <div className="mt-3 flex gap-3 text-xs">
                  <button
                    type="button"
                    className={panel.linkEdit}
                    onClick={() => abrirEditar(c)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={panel.linkDanger}
                    onClick={async () => {
                      const ok = await confirmar({
                        titulo: "Eliminar cancha",
                        mensaje: "Se borrará esta cancha del catálogo. ¿Continuar?",
                        confirmarTexto: "Eliminar",
                        variante: "peligro",
                      });
                      if (ok) eliminar.mutate(c.id);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SucursalDetalle({
  sucursal,
}: {
  sucursal: { nombre: string; direccion: string; telefono: string };
}) {
  return (
    <div className={"mt-2 " + panel.infoBox}>
      <span className="font-medium text-slate-800">{sucursal.nombre}</span>
      <br />
      {sucursal.direccion}
      <br />
      Tel: {sucursal.telefono}
    </div>
  );
}

function CanchaForm(props: {
  nombre: string;
  setNombre: (v: string) => void;
  sucursalId: string;
  setSucursalId: (v: string) => void;
  tipo: string;
  setTipo: (v: string) => void;
  iluminacion: boolean;
  setIluminacion: (v: boolean) => void;
  sucursales: { id: string; nombre: string }[];
  activa?: boolean;
  setActiva?: (v: boolean) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <select
        className={panel.input}
        value={props.sucursalId}
        onChange={(e) => props.setSucursalId(e.target.value)}
      >
        <option value="">Sucursal…</option>
        {props.sucursales.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
      <input
        className={panel.input}
        placeholder="Nombre de la cancha"
        value={props.nombre}
        onChange={(e) => props.setNombre(e.target.value)}
      />
      <select
        className={panel.input}
        value={props.tipo}
        onChange={(e) => props.setTipo(e.target.value)}
      >
        <option value="Futbol_7">Fútbol 7</option>
        <option value="Futbol_11">Fútbol 11</option>
        <option value="Futsal">Futsal</option>
        <option value="GrassSintetico">Grass sintético</option>
        <option value="Voley">Vóley</option>
        <option value="Tenis">Tenis</option>
        <option value="Basquet">Básquet</option>
      </select>
      <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
        <input
          type="checkbox"
          checked={props.iluminacion}
          onChange={(e) => props.setIluminacion(e.target.checked)}
        />
        Iluminación
      </label>
      {props.setActiva != null && (
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <input
            type="checkbox"
            checked={props.activa ?? true}
            onChange={(e) => props.setActiva!(e.target.checked)}
          />
          Activa
        </label>
      )}
    </div>
  );
}
