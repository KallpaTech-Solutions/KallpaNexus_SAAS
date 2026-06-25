import type { DniConsultaResult } from "@kallpanexus/types";
import { publicSportApi } from "@/lib/public-api";
import { esDniClienteVarios } from "@kallpanexus/shared";

export type ConsultaDniOutcome =
  | { ok: true; data: DniConsultaResult }
  | { ok: false; mensaje: string };

export async function consultarDniPublico(
  slug: string,
  dni: string
): Promise<ConsultaDniOutcome> {
  const limpio = dni.replace(/\D/g, "");
  if (esDniClienteVarios(dni)) {
    return {
      ok: false,
      mensaje: "Usa tu DNI real para reservar en la web.",
    };
  }
  if (limpio.length < 8) {
    return { ok: false, mensaje: "Ingresa un DNI de 8 dígitos." };
  }
  try {
    const data = await publicSportApi.consultarDni(slug, limpio);
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo consultar el DNI.";
    return { ok: false, mensaje: msg };
  }
}
