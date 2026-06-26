"use client";

import { platformUi } from "@/lib/platform-ui";
import { usePlatformApi } from "@/lib/platform-api-context";
import { formatMoneyPEN } from "@kallpanexus/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type Props = {
  empresaId: string;
  empresa: Record<string, unknown>;
  onSaved: () => void;
};

function numField(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

export function EmpresaLimitesAdmin({ empresaId, empresa, onSaved }: Props) {
  const api = usePlatformApi();
  const qc = useQueryClient();

  const plan = (empresa.plan ?? empresa.Plan) as Record<string, unknown> | undefined;
  const limitesEf = (empresa.limitesEfectivos ?? empresa.LimitesEfectivos) as
    | Record<string, unknown>
    | undefined;
  const uso = (empresa.uso ?? empresa.Uso) as Record<string, unknown> | undefined;

  const [limSuc, setLimSuc] = useState("");
  const [limStaff, setLimStaff] = useState("");
  const [limCanchas, setLimCanchas] = useState("");
  const [precio, setPrecio] = useState("");
  const [webPlataforma, setWebPlataforma] = useState(true);

  useEffect(() => {
    setLimSuc(numField(empresa.limiteSucursalesOverride ?? empresa.LimiteSucursalesOverride));
    setLimStaff(numField(empresa.limiteUsuariosStaffOverride ?? empresa.LimiteUsuariosStaffOverride));
    setLimCanchas(numField(empresa.limiteCanchasOverride ?? empresa.LimiteCanchasOverride));
    setPrecio(numField(empresa.precioMensualAcordado ?? empresa.PrecioMensualAcordado));
    const rw = empresa.reservaWebPermitida ?? empresa.ReservaWebPermitida;
    setWebPlataforma(rw !== false);
  }, [empresa]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () =>
      api.empresas.actualizarLimites(empresaId, {
        limiteSucursalesOverride: limSuc.trim() === "" ? 0 : parseInt(limSuc, 10),
        limiteUsuariosStaffOverride: limStaff.trim() === "" ? 0 : parseInt(limStaff, 10),
        limiteCanchasOverride: limCanchas.trim() === "" ? 0 : parseInt(limCanchas, 10),
        precioMensualAcordado: precio.trim() === "" ? -1 : parseFloat(precio),
        reservaWebPermitida: webPlataforma,
      }),
    onSuccess: () => {
      setErrorMsg(null);
      void qc.invalidateQueries({ queryKey: ["platform-empresa", empresaId] });
      onSaved();
    },
    onError: (e: unknown) => {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo guardar. ¿Aplicaste la migración master?");
    },
  });

  const precioEf =
    (empresa.precioMensualEfectivo ?? empresa.PrecioMensualEfectivo) as number | undefined;
  const staffUso = (uso?.staffActivos ?? uso?.StaffActivos) as number | undefined;

  const planSport = Boolean(plan?.soportaModuloSport ?? plan?.SoportaModuloSport);
  const planLimCanchas = Number(plan?.limiteCanchas ?? plan?.LimiteCanchas ?? 0);

  const restablecerPlan = useMutation({
    mutationFn: () =>
      api.empresas.actualizarLimites(empresaId, {
        limiteSucursalesOverride: 0,
        limiteUsuariosStaffOverride: 0,
        limiteCanchasOverride: 0,
        precioMensualAcordado: -1,
        reservaWebPermitida: webPlataforma,
      }),
    onSuccess: () => {
      setLimSuc("");
      setLimStaff("");
      setLimCanchas("");
      setPrecio("");
      setErrorMsg(null);
      void qc.invalidateQueries({ queryKey: ["platform-empresa", empresaId] });
      onSaved();
    },
    onError: (e: unknown) => {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo restablecer.");
    },
  });

  return (
    <div className={`${platformUi.card} mt-6`}>
      <h2 className={`text-sm font-semibold uppercase tracking-wide ${platformUi.textMuted}`}>
        Cuotas, precio y web pública
      </h2>
      <p className={`mt-1 text-xs ${platformUi.textMuted}`}>
        Vacío = usar el plan actual (
        {String(plan?.limiteSucursales ?? plan?.LimiteSucursales ?? "—")} sucursales,{" "}
        {String(plan?.limiteUsuariosStaff ?? plan?.LimiteUsuariosStaff ?? "—")} staff
        {planSport && planLimCanchas > 0 && (
          <>, {planLimCanchas} canchas</>
        )}
        ). Al aprobar un cambio de plan se restablece automáticamente; usa el botón si quedaron
        overrides viejos (p. ej. 1/1 tras pasar a Sport Estándar).
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className={platformUi.textMuted}>Uso staff (empresa)</dt>
          <dd className="font-medium">
            {staffUso ?? "—"} / {String(limitesEf?.limiteUsuariosStaff ?? limitesEf?.LimiteUsuariosStaff ?? "∞")}
          </dd>
        </div>
        <div>
          <dt className={platformUi.textMuted}>Precio plan</dt>
          <dd>{formatMoneyPEN(Number(plan?.precioMensual ?? plan?.PrecioMensual ?? 0))}/mes</dd>
        </div>
        <div>
          <dt className={platformUi.textMuted}>Precio acordado (cobro)</dt>
          <dd className="font-semibold text-[var(--p-text)]">
            {precioEf != null ? `${formatMoneyPEN(precioEf)}/mes` : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs">
          <span className={platformUi.textMuted}>Máx. sucursales / negocio</span>
          <input
            className={`${platformUi.input} mt-1 w-full`}
            type="number"
            min={0}
            placeholder="Plan"
            value={limSuc}
            onChange={(e) => setLimSuc(e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className={platformUi.textMuted}>Máx. usuarios staff</span>
          <input
            className={`${platformUi.input} mt-1 w-full`}
            type="number"
            min={0}
            placeholder="Plan"
            value={limStaff}
            onChange={(e) => setLimStaff(e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className={platformUi.textMuted}>Máx. canchas / negocio</span>
          <input
            className={`${platformUi.input} mt-1 w-full`}
            type="number"
            min={0}
            placeholder="Sin tope"
            value={limCanchas}
            onChange={(e) => setLimCanchas(e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className={platformUi.textMuted}>Precio mensual (S/)</span>
          <input
            className={`${platformUi.input} mt-1 w-full`}
            type="number"
            min={0}
            step="0.01"
            placeholder="Precio plan"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </label>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={webPlataforma}
          onChange={(e) => setWebPlataforma(e.target.checked)}
        />
        Permitir reserva web pública (plataforma). Si desmarcas, /sports queda bloqueado aunque el
        tenant la active.
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${platformUi.btnPrimary}`}
          disabled={guardar.isPending || restablecerPlan.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? "Guardando…" : "Guardar cuotas y controles"}
        </button>
        <button
          type="button"
          className={platformUi.btnSecondary}
          disabled={guardar.isPending || restablecerPlan.isPending}
          onClick={() => restablecerPlan.mutate()}
        >
          {restablecerPlan.isPending ? "Aplicando…" : "Usar límites del plan"}
        </button>
      </div>
      {errorMsg && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
