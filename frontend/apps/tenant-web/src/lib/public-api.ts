import type {
  PublicNegocioInfo,
  PublicProductoWeb,
  PublicReservaSlot,
} from "@kallpanexus/types";
import { getApiErrorMessage } from "@kallpanexus/api-client";

async function mensajeErrorRespuesta(res: Response): Promise<string> {
  let msg = res.statusText;
  try {
    const body = (await res.json()) as {
      mensaje?: string;
      title?: string;
      detail?: string;
      error?: string;
    };
    if (body.mensaje) msg = body.mensaje;
    else if (body.detail) msg = body.detail;
    else if (body.title && body.title !== "Bad Request") msg = body.title;
    else if (body.error) msg = body.error;
  } catch {
    /* ignore */
  }
  return msg;
}

async function publicJson<T>(slug: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/public/${encodeURIComponent(slug)}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(await mensajeErrorRespuesta(res));
  }
  return res.json() as Promise<T>;
}

async function publicHubJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/public/hub/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(await mensajeErrorRespuesta(res));
  }
  return res.json() as Promise<T>;
}

export const publicSportApi = {
  hubSedes: (q?: string) => {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    return publicHubJson<import("@kallpanexus/types").PublicHubResponse>(`sedes${qs}`);
  },
  negocio: (slug: string) => publicJson<PublicNegocioInfo>(slug, "negocio"),
  canchas: (slug: string, sucursalId?: string) =>
    publicJson<
      {
        id: string;
        nombre: string;
        sucursalId: string;
        nombreSucursal: string;
        tipoCancha: string;
        tieneIluminacion: boolean;
        imagenWebUrl?: string | null;
      }[]
    >(slug, `canchas${sucursalId ? `?sucursalId=${sucursalId}` : ""}`),
  productos: (slug: string, sucursalId: string) =>
    publicJson<PublicProductoWeb[]>(slug, `productos?sucursalId=${sucursalId}`),
  disponibilidad: (
    slug: string,
    canchaId: string,
    fecha: string,
    dni?: string,
    duracionHoras = 1
  ) => {
    const q = new URLSearchParams({ fecha, duracionHoras: String(duracionHoras) });
    if (dni?.trim()) q.set("dni", dni.trim());
    return publicJson<PublicReservaSlot[]>(
      slug,
      `canchas/${canchaId}/disponibilidad?${q.toString()}`
    );
  },
  solicitarReserva: (
    slug: string,
    body: {
      canchaId: string;
      horaInicio: string;
      duracionHoras: number;
      dniCliente: string;
      nombreCompletoCliente: string;
      telefonoCliente: string;
      sinTelefonoCliente?: boolean;
      observaciones?: string;
      medioPagoId?: string;
      codigoOperacion?: string;
      voucherUrl?: string;
      grupoSolicitudWebId?: string;
      registrarPagoEnEstaLinea?: boolean;
      montoPagoGrupo?: number;
      tipoAdelantoWeb?: "Total" | "Porcentaje30" | "SinAdelanto";
      productos?: { productoId: string; cantidad: number }[];
    }
  ) =>
    publicJson<{ mensaje: string; reservaId: string; montoTotal: number }>(
      slug,
      "reservas",
      { method: "POST", body: JSON.stringify(body) }
    ).catch((e) => {
      throw e instanceof Error ? e : new Error(getApiErrorMessage(e));
    }),
  mediosPago: (slug: string, sucursalId?: string) => {
    const q = sucursalId ? `?sucursalId=${encodeURIComponent(sucursalId)}` : "";
    return publicJson<
      {
        id: string;
        nombre: string;
        tipo: string;
        requiereVoucherOnline: boolean;
        qrUrl?: string | null;
        telefonoReferencia?: string | null;
      }[]
    >(slug, `medios-pago${q}`);
  },
  consultarDni: (slug: string, numero: string) =>
    publicJson<import("@kallpanexus/types").DniConsultaResult>(
      slug,
      `consultas/dni?numero=${encodeURIComponent(numero)}`
    ),
  subirVoucher: async (slug: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/public/${encodeURIComponent(slug)}/reservas/voucher`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      throw new Error(await mensajeErrorRespuesta(res));
    }
    return res.json() as Promise<{ voucherUrl: string }>;
  },
};
