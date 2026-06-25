"use client";

import { ApiConexionAnimada } from "@/components/api-conexion-animada";
import { CuentaDesactivadaAviso } from "@/components/cuenta-desactivada-aviso";

type Props = {
  esperandoApi?: boolean;
  error?: string | null;
  cuentaDesactivada?: string | null;
};

export function ApiErrorPresentacion({ esperandoApi, error, cuentaDesactivada }: Props) {
  if (cuentaDesactivada) {
    return <CuentaDesactivadaAviso mensaje={cuentaDesactivada} className="mt-2" />;
  }
  if (esperandoApi) {
    return <ApiConexionAnimada className="mt-2" />;
  }
  if (!error) return null;
  return (
    <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
  );
}
