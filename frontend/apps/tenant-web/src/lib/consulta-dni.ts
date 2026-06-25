import { getApiErrorMessage, type TenantSportApi } from "@kallpanexus/api-client";
import type { DniConsultaResult } from "@kallpanexus/types";
import { DNI_CLIENTE_VARIOS, esDniClienteVarios } from "@kallpanexus/shared";

export type ConsultaDniOutcome =
  | { ok: true; data: DniConsultaResult }
  | { ok: false; mensaje: string };

export async function consultarDniParaFormulario(
  api: TenantSportApi,
  dni: string
): Promise<ConsultaDniOutcome> {
  const limpio = dni.replace(/\D/g, "");
  if (esDniClienteVarios(dni)) {
    return {
      ok: true,
      data: {
        origen: "varios",
        documentNumber: DNI_CLIENTE_VARIOS,
        fullName: "",
      },
    };
  }
  if (limpio.length < 8) {
    return { ok: false, mensaje: "Ingresa un DNI de 8 dígitos o 123 (cliente varios)." };
  }
  try {
    const data = await api.consultas.dni(limpio);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, mensaje: getApiErrorMessage(err) };
  }
}
