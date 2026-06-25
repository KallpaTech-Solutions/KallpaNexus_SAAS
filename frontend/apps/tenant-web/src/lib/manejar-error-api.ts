import {
  getApiErrorMessage,
  getCuentaDesactivadaMessage,
  isApiUnreachableError,
  isCuentaDesactivadaError,
} from "@kallpanexus/api-client";

type Opciones = {
  setError?: (msg: string | null) => void;
  setEsperandoApi?: (v: boolean) => void;
  setCuentaDesactivada?: (msg: string | null) => void;
  notificarConexion?: () => void;
};

/** Errores de red/API caída → animación; cuenta desactivada → aviso; el resto → mensaje de texto. */
export function manejarErrorApi(err: unknown, opts: Opciones): boolean {
  opts.setCuentaDesactivada?.(null);

  if (isCuentaDesactivadaError(err)) {
    opts.setEsperandoApi?.(false);
    opts.setError?.(null);
    opts.setCuentaDesactivada?.(getCuentaDesactivadaMessage(err));
    return true;
  }

  if (isApiUnreachableError(err)) {
    opts.setError?.(null);
    opts.setEsperandoApi?.(true);
    opts.notificarConexion?.();
    return true;
  }

  opts.setEsperandoApi?.(false);
  const msg = getApiErrorMessage(err);
  opts.setError?.(msg || "No se pudo completar la operación.");
  return false;
}
