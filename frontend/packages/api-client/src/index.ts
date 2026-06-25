import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import type {
  ApiErrorBody,
  CanchaListItem,
  ReservaListItem,
  SlotDisponibilidad,
  SucursalListItem,
  MedioPagoListItem,
  DniConsultaResult,
  RucConsultaResult,
  TipoCambioConsultaResult,
  TarifaListItem,
  ConfiguracionNegocio,
  PagoReservaListItem,
  ReporteFinanciero,
  ArchivarReporteFinancieroResponse,
  ReporteFinancieroArchivadoListItem,
  TenantRolListItem,
  TenantStaffListItem,
  TenantStaffLoginResponse,
  TenantStaffYo,
  TenantSuscripcionResumen,
  ProductoListItem,
  VentaListItem,
  CompraListItem,
  EgresoListItem,
} from "@kallpanexus/types";

export type ApiClientConfig = {
  baseURL: string;
  getToken: () => string | null;
  getTenantSubdomain: () => string | null;
  /** Si la API responde 401 con token presente (p. ej. JWT expirado), limpia sesión y redirige. */
  onSessionExpired?: () => void;
};

function isTenantAuthRequest(url: string): boolean {
  return (
    url.includes("/api/tenant/auth/login-global") ||
    url.includes("/api/tenant/auth/login")
  );
}

let handlingSessionExpired = false;

function attachSessionExpiredInterceptor(
  client: AxiosInstance,
  config: {
    getToken: () => string | null;
    onSessionExpired: () => void;
    skipAuthUrl: (url: string) => boolean;
  }
): void {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        return Promise.reject(error);
      }
      const url = error.config?.url ?? "";
      if (config.skipAuthUrl(url) || !config.getToken()) {
        return Promise.reject(error);
      }
      if (handlingSessionExpired) {
        return Promise.reject(error);
      }
      handlingSessionExpired = true;
      config.onSessionExpired();
      globalThis.setTimeout(() => {
        handlingSessionExpired = false;
      }, 5000);
      return Promise.reject(error);
    }
  );
}

export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL.replace(/\/$/, ""),
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const token = config.getToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    const sub = config.getTenantSubdomain();
    const path = req.url ?? "";
    const esLoginStaff =
      path.includes("/api/tenant/auth/login-global") ||
      path.includes("/api/tenant/auth/login");
    if (sub && !esLoginStaff) {
      req.headers["X-Tenant-Subdomain"] = sub;
    }
    if (req.data instanceof FormData) {
      delete req.headers["Content-Type"];
    }
    return req;
  });

  if (config.onSessionExpired) {
    attachSessionExpiredInterceptor(client, {
      getToken: config.getToken,
      onSessionExpired: config.onSessionExpired,
      skipAuthUrl: isTenantAuthRequest,
    });
  }

  return client;
}

const CODIGOS_CUENTA_DESACTIVADA = new Set([
  "tenantinactivo",
  "suscripcionsuspendida",
  "usuariodesactivado",
  "usuarioinactivo",
  "cuentainactiva",
  "suscripcioncancelada",
]);

function codigoErrorApi(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const data = err.response?.data as ApiErrorBody | undefined;
  if (typeof data?.error !== "string") return null;
  return data.error.trim().toLowerCase();
}

export function isCuentaDesactivadaError(err: unknown): boolean {
  const codigo = codigoErrorApi(err);
  if (codigo && CODIGOS_CUENTA_DESACTIVADA.has(codigo)) return true;
  if (!axios.isAxiosError(err)) return false;
  const data = err.response?.data as ApiErrorBody | undefined;
  const msg = (data?.mensaje ?? "").toLowerCase();
  return (
    msg.includes("desactivad") ||
    msg.includes("suspendid") ||
    msg.includes("no está activo") ||
    msg.includes("no esta activo")
  );
}

export function getCuentaDesactivadaMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    if (data?.mensaje?.trim()) return data.mensaje.trim();
  }
  return "Su cuenta o el acceso a este negocio no está disponible en este momento.";
}

export function isApiUnreachableError(err: unknown): boolean {
  if (isCuentaDesactivadaError(err)) return false;
  if (!axios.isAxiosError(err)) return false;
  if (err.code === "ERR_NETWORK" || err.message.includes("Network Error")) return true;
  if (!err.response) return true;
  const data = err.response.data as ApiErrorBody | undefined;
  if (err.response.status >= 500 && !data?.mensaje) return true;
  return false;
}

export function getApiErrorMessage(err: unknown): string {
  if (isApiUnreachableError(err)) {
    return "";
  }
  if (isCuentaDesactivadaError(err)) {
    return getCuentaDesactivadaMessage(err);
  }
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    if (data?.mensaje) return data.mensaje;
    if (typeof data?.error === "string") return data.error;
    if (err.response?.status === 403) return "No tienes permiso para esta acción.";
    if (err.response?.status === 401) return "Sesión expirada o credenciales inválidas.";
  }
  return "No se pudo completar la operación.";
}

export function createTenantSportApi(client: AxiosInstance) {
  return {
    auth: {
      login: (dni: string, password: string, tenantId?: string) =>
        client
          .post<TenantStaffLoginResponse>("/api/tenant/auth/login", {
            dni,
            password,
            tenantId,
          })
          .then((r) => r.data),
      loginGlobal: (dni: string, password: string, tenantId?: string) =>
        client
          .post<TenantStaffLoginResponse>("/api/tenant/auth/login-global", {
            dni,
            password,
            tenantId,
          })
          .then((r) => r.data),
      cambiarPassword: (passwordActual: string, nuevaPassword: string) =>
        client
          .post<{ mensaje: string; debeCambiarPassword: boolean }>(
            "/api/tenant/auth/cambiar-password",
            { passwordActual, nuevaPassword }
          )
          .then((r) => r.data),
      yo: () => client.get<TenantStaffYo>("/api/tenant/auth/yo").then((r) => r.data),
    },
    sucursales: {
      list: () => client.get<SucursalListItem[]>("/api/Sucursales").then((r) => r.data),
      obtener: (sucursalId: string) =>
        client.get(`/api/Sucursales/${sucursalId}`).then((r) => r.data),
      crear: (body: {
        nombre: string;
        direccion: string;
        ciudad?: string;
        telefono: string;
        telefonoWhatsApp?: string;
        latitud?: number;
        longitud?: number;
        enlaceGoogleMaps?: string;
      }) => client.post("/api/Sucursales", body).then((r) => r.data),
      actualizar: (
        sucursalId: string,
        body: {
          nombre?: string;
          direccion?: string;
          ciudad?: string | null;
          telefono?: string;
          telefonoWhatsApp?: string;
          activa?: boolean;
          latitud?: number;
          longitud?: number;
          enlaceGoogleMaps?: string | null;
        }
      ) => client.put(`/api/Sucursales/${sucursalId}`, body).then((r) => r.data),
      eliminar: (sucursalId: string) =>
        client.delete(`/api/Sucursales/${sucursalId}`).then((r) => r.data),
    },
    canchas: {
      list: (params?: { sucursalId?: string }) =>
        client.get<CanchaListItem[]>("/api/Canchas", { params }).then((r) => r.data),
      disponibilidad: (canchaId: string, fecha: string) =>
        client
          .get<SlotDisponibilidad[]>(`/api/Canchas/${canchaId}/disponibilidad`, {
            params: { fecha },
          })
          .then((r) => r.data),
      crear: (body: {
        sucursalId: string;
        nombre: string;
        tipo: string;
        tieneIluminacion: boolean;
      }) => client.post("/api/Canchas", body).then((r) => r.data),
      actualizar: (
        canchaId: string,
        body: {
          sucursalId?: string;
          nombre?: string;
          tipo?: string;
          tieneIluminacion?: boolean;
          estaActiva?: boolean;
        }
      ) => client.put(`/api/Canchas/${canchaId}`, body).then((r) => r.data),
      eliminar: (canchaId: string) =>
        client.delete(`/api/Canchas/${canchaId}`).then((r) => r.data),
      subirImagenWeb: (canchaId: string, file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        return client
          .post<{ imagenWebUrl: string; canchaId: string }>(
            `/api/Canchas/${canchaId}/imagen-web`,
            fd
          )
          .then((r) => r.data);
      },
      quitarImagenWeb: (canchaId: string) =>
        client.delete(`/api/Canchas/${canchaId}/imagen-web`).then((r) => r.data),
    },
    consultas: {
      dni: (numero: string) =>
        client
          .get<DniConsultaResult>("/api/Consultas/dni", { params: { numero } })
          .then((r) => r.data),
      ruc: (numero: string, completo?: boolean) =>
        client
          .get<RucConsultaResult>("/api/Consultas/ruc", {
            params: { numero, completo },
          })
          .then((r) => r.data),
      tipoCambioSunat: (params?: {
        date?: string;
        month?: number;
        year?: number;
      }) =>
        client
          .get<TipoCambioConsultaResult>("/api/Consultas/tipo-cambio/sunat", {
            params,
          })
          .then((r) => r.data),
    },
    configuracionNegocio: {
      obtener: () =>
        client
          .get<ConfiguracionNegocio>("/api/ConfiguracionNegocio")
          .then((r) => r.data),
      guardar: (body: {
        nombreComercial: string;
        razonSocial?: string;
        telefonoWhatsAppNegocio?: string;
        mensajeWhatsAppReserva: string;
        reservaWebActiva?: boolean;
        minutosHoldWeb?: number;
        maxReservasWebPorDniPorDia?: number;
        tituloWebLanding?: string | null;
        mensajeWebLanding?: string | null;
      }) => client.put("/api/ConfiguracionNegocio", body).then((r) => r.data),
      subirImagenHero: (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        return client
          .post<{ imagenHeroUrl: string; configuracion: ConfiguracionNegocio }>(
            "/api/ConfiguracionNegocio/imagen-hero",
            fd
          )
          .then((r) => r.data);
      },
      quitarImagenHero: () =>
        client
          .delete<{ configuracion: ConfiguracionNegocio }>(
            "/api/ConfiguracionNegocio/imagen-hero"
          )
          .then((r) => r.data),
    },
    mediosPago: {
      list: () =>
        client.get<MedioPagoListItem[]>("/api/MediosPago").then((r) => r.data),
      crear: (body: {
        nombre: string;
        tipo: string;
        requiereVoucherOnline?: boolean;
        permiteSinVoucherPresencial?: boolean;
        esPasarelaExterna?: boolean;
        configuracionIntegracionJson?: string;
        orden?: number;
      }) => client.post("/api/MediosPago", body).then((r) => r.data),
      actualizar: (
        id: string,
        body: {
          nombre?: string;
          tipo?: string;
          activo?: boolean;
          requiereVoucherOnline?: boolean;
          permiteSinVoucherPresencial?: boolean;
          esPasarelaExterna?: boolean;
          visibleEnWeb?: boolean;
          configuracionIntegracionJson?: string;
          orden?: number;
        }
      ) => client.put(`/api/MediosPago/${id}`, body).then((r) => r.data),
      subirQrWeb: (id: string, file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        return client
          .post<{ mensaje: string; qrUrl: string; medioPagoId: string }>(
            `/api/MediosPago/${id}/qr-web`,
            fd
          )
          .then((r) => r.data);
      },
      eliminar: (id: string) =>
        client.delete(`/api/MediosPago/${id}`).then((r) => r.data),
    },
    tarifas: {
      list: (sucursalId?: string) =>
        client
          .get<TarifaListItem[]>("/api/Tarifas", {
            params: sucursalId ? { sucursalId } : undefined,
          })
          .then((r) => r.data),
      crear: (body: {
        sucursalId: string;
        nombre: string;
        horaInicio: number;
        horaFin: number;
        aplicaLunesAViernes: boolean;
        aplicaFinDeSemana: boolean;
        precioPorHora: number;
      }) => client.post("/api/Tarifas", body).then((r) => r.data),
      actualizar: (
        tarifaId: string,
        body: {
          nombre?: string;
          horaInicio?: number;
          horaFin?: number;
          aplicaLunesAViernes?: boolean;
          aplicaFinDeSemana?: boolean;
          precioPorHora?: number;
          activa?: boolean;
        }
      ) => client.put(`/api/Tarifas/${tarifaId}`, body).then((r) => r.data),
      eliminar: (tarifaId: string) =>
        client.delete(`/api/Tarifas/${tarifaId}`).then((r) => r.data),
      asignarCancha: (
        canchaId: string,
        tarifaCanchaId: string,
        opts?: { reemplazarTodasEnCancha?: boolean }
      ) =>
        client
          .post("/api/Tarifas/asignar", {
            canchaId,
            tarifaCanchaId,
            reemplazarTodasEnCancha: opts?.reemplazarTodasEnCancha ?? false,
          })
          .then((r) => r.data as { mensaje?: string; Mensaje?: string }),
      desasignarCancha: (canchaId: string, tarifaCanchaId: string) =>
        client
          .delete("/api/Tarifas/asignar", {
            params: { canchaId, tarifaCanchaId },
          })
          .then((r) => r.data),
    },
    reservas: {
      list: (params?: {
        canchaId?: string;
        sucursalId?: string;
        desde?: string;
        hasta?: string;
        estado?: string;
        dniCliente?: string;
      }) =>
        client.get<ReservaListItem[]>("/api/Reservas", { params }).then((r) => r.data),
      cotizar: (params: {
        canchaId: string;
        /** Hora civil Lima, sin Z: 2026-06-08T16:00 */
        horaInicio: string;
        duracionHoras: number;
      }) => {
        const [fechaPart, horaPart] = params.horaInicio.includes("T")
          ? params.horaInicio.split("T")
          : ["", ""];
        const horaLocal = Number.parseInt(
          (horaPart || "12").split(":")[0] ?? "12",
          10
        );
        const duracion = Math.max(
          1,
          Math.floor(Number(params.duracionHoras)) || 1
        );
        return client
          .get<{
            montoTotal: number;
            detalle: {
              horaLocal: number;
              tarifaNombre: string;
              precioPorHora: number;
            }[];
          }>("/api/Reservas/cotizar", {
            params: {
              canchaId: params.canchaId,
              fecha: fechaPart,
              horaLocal: Number.isNaN(horaLocal) ? 12 : horaLocal,
              duracionHoras: duracion,
            },
          })
          .then((r) => r.data);
      },
      crear: (body: {
        canchaId: string;
        dniCliente: string;
        nombreCompletoCliente: string;
        telefonoCliente: string;
        sinTelefonoCliente?: boolean;
        emailCliente?: string;
        /** Hora civil Lima, sin Z: 2026-06-08T16:00 */
        horaInicio: string;
        duracionHoras: number;
        observaciones?: string;
        montoTotalCobrado?: number;
        estado?: string;
      }) => client.post("/api/Reservas", body).then((r) => r.data),
      cancelar: (reservaId: string, opts?: { adelantoDevuelto?: boolean }) =>
        client
          .delete(`/api/Reservas/${reservaId}`, {
            params: { adelantoDevuelto: opts?.adelantoDevuelto ?? false },
          })
          .then((r) => r.data),
      confirmarSolicitudWeb: (
        reservaId: string,
        body?: { modoCobro?: string }
      ) =>
        client
          .post(`/api/Reservas/${reservaId}/confirmar-solicitud-web`, body ?? {})
          .then((r) => r.data),
      rechazarSolicitudWeb: (reservaId: string, body?: { motivo?: string }) =>
        client
          .post(`/api/Reservas/${reservaId}/rechazar-solicitud-web`, body ?? {})
          .then((r) => r.data),
      eliminarPermanente: (reservaId: string) =>
        client
          .delete(`/api/Reservas/${reservaId}`, { params: { permanente: true } })
          .then((r) => r.data),
      actualizar: (
        reservaId: string,
        body: {
          horaInicio?: string;
          duracionHoras?: number;
          nombreCompletoCliente?: string;
          telefonoCliente?: string;
          sinTelefonoCliente?: boolean;
          emailCliente?: string;
          observaciones?: string;
          estado?: string;
          montoTotalCobrado?: number;
        }
      ) => client.put(`/api/Reservas/${reservaId}`, body).then((r) => r.data),
    },
    pagosReserva: {
      listar: (reservaId: string) =>
        client
          .get<PagoReservaListItem[]>(`/api/Reservas/${reservaId}/pagos`)
          .then((r) => r.data),
      registrar: (
        reservaId: string,
        body: {
          medioPagoId: string;
          monto: number;
          codigoOperacion?: string;
          voucherUrl?: string;
          registradoSinVoucher?: boolean;
        }
      ) => client.post(`/api/Reservas/${reservaId}/pagos`, body).then((r) => r.data),
      anular: (reservaId: string, pagoId: string) =>
        client
          .post<{
            mensaje: string;
            totalConfirmado: number;
            pendiente: number;
            excedente: number;
            reservaEstado: string;
          }>(`/api/Reservas/${reservaId}/pagos/${pagoId}/anular`)
          .then((r) => r.data),
    },
    reportes: {
      financieros: (params?: {
        desde?: string;
        hasta?: string;
        sucursalId?: string;
      }) =>
        client
          .get<ReporteFinanciero>("/api/Reportes/financieros", { params })
          .then((r) => r.data),
      archivarFinanciero: (
        params: { desde?: string; hasta?: string; sucursalId: string },
        meta?: { sucursalNombre?: string; ciudad?: string; generadoPorNombre?: string }
      ) =>
        client
          .post<ArchivarReporteFinancieroResponse>(
            "/api/Reportes/financieros/archivar",
            meta ?? {},
            { params }
          )
          .then((r) => r.data),
      listarArchivados: (limite = 20) =>
        client
          .get<ReporteFinancieroArchivadoListItem[]>("/api/Reportes/financieros/archivados", {
            params: { limite },
          })
          .then((r) => r.data),
      obtenerArchivado: (codigo: string) =>
        client
          .get<{
            codigo: string;
            sucursalNombre?: string | null;
            ciudad?: string | null;
            generadoEnUtc: string;
            datos: ReporteFinanciero;
          }>(`/api/Reportes/financieros/archivados/${encodeURIComponent(codigo)}`)
          .then((r) => r.data),
      eliminarArchivado: (codigo: string) =>
        client
          .delete<{ mensaje: string; codigo: string }>(
            `/api/Reportes/financieros/archivados/${encodeURIComponent(codigo)}`
          )
          .then((r) => r.data),
    },
    suscripcion: {
      resumen: () =>
        client
          .get<TenantSuscripcionResumen>("/api/tenant/suscripcion")
          .then((r) => r.data),
      cambiarPlan: (planSaaSId: string) =>
        client
          .put("/api/tenant/suscripcion/plan", { planSaaSId })
          .then((r) => r.data),
      solicitarPlan: (planSaaSId: string, mensaje?: string) =>
        client
          .post<{ mensaje: string; solicitudId: string; planSolicitado: string }>(
            "/api/tenant/suscripcion/solicitar-plan",
            { planSaaSId, mensaje }
          )
          .then((r) => r.data),
      suscribir: () =>
        client.post("/api/tenant/suscripcion/suscribir").then((r) => r.data),
      cancelar: () =>
        client.post("/api/tenant/suscripcion/cancelar").then((r) => r.data),
    },
    equipo: {
      usuarios: {
        list: () =>
          client.get<TenantStaffListItem[]>("/api/tenant/usuarios").then((r) => r.data),
        crear: (body: {
          dni: string;
          nombreCompleto: string;
          email?: string;
          rolTenantId: string;
          sucursalIds?: string[];
        }) => client.post("/api/tenant/usuarios", body).then((r) => r.data),
        actualizar: (
          usuarioId: string,
          body: {
            nombreCompleto?: string;
            activo?: boolean;
            email?: string | null;
            rolTenantId?: string;
            sucursalIds?: string[];
          }
        ) => client.put(`/api/tenant/usuarios/${usuarioId}`, body).then((r) => r.data),
        restablecerPassword: (usuarioId: string) =>
          client
            .post(`/api/tenant/usuarios/${usuarioId}/restablecer-password`)
            .then((r) => r.data),
        eliminar: (usuarioId: string) =>
          client.delete(`/api/tenant/usuarios/${usuarioId}`).then((r) => r.data),
      },
      roles: {
        list: () =>
          client.get<TenantRolListItem[]>("/api/tenant/roles").then((r) => r.data),
        catalogoPermisos: () =>
          client
            .get<{ codigo?: string; Codigo?: string }[]>("/api/tenant/permisos-catalogo")
            .then((r) =>
              r.data
                .map((x) => x.codigo ?? x.Codigo ?? "")
                .filter((c) => c.length > 0)
            ),
        actualizarPermisos: (rolId: string, permisoCodigos: string[]) =>
          client
            .put(`/api/tenant/roles/${rolId}/permisos`, { permisoCodigos })
            .then((r) => r.data),
        crear: (body: {
          nombre: string;
          codigo?: string;
          nivel?: number;
          permisoCodigos: string[];
        }) => client.post("/api/tenant/roles", body).then((r) => r.data),
        eliminar: (rolId: string) =>
          client.delete(`/api/tenant/roles/${rolId}`).then((r) => r.data),
      },
    },
    productos: {
      list: (sucursalId?: string) =>
        client
          .get<ProductoListItem[]>("/api/Productos", {
            params: sucursalId ? { sucursalId } : undefined,
          })
          .then((r) => r.data),
      listTodos: (sucursalId?: string) =>
        client
          .get<ProductoListItem[]>("/api/Productos/todos", {
            params: sucursalId ? { sucursalId } : undefined,
          })
          .then((r) => r.data),
      crear: (body: {
        sucursalId: string;
        nombre: string;
        descripcion?: string;
        categoria?: string;
        precio: number;
        controlStock?: boolean;
        stockInicial?: number;
        puntoAlerta?: number;
        visibleEnWeb?: boolean;
      }) => client.post("/api/Productos", body).then((r) => r.data),
      actualizar: (
        id: string,
        body: {
          nombre?: string;
          descripcion?: string;
          categoria?: string;
          precio?: number;
          activo?: boolean;
          controlStock?: boolean;
          stockActual?: number;
          /** -1 para quitar el punto de alerta */
          puntoAlerta?: number;
          visibleEnWeb?: boolean;
        }
      ) => client.put(`/api/Productos/${id}`, body).then((r) => r.data),
      eliminar: (id: string) =>
        client.delete(`/api/Productos/${id}`).then((r) => r.data),
    },
    ventas: {
      list: (params: { desde?: string; hasta?: string; sucursalId?: string }) =>
        client
          .get<VentaListItem[]>("/api/Ventas", { params })
          .then((r) => r.data),
      crear: (body: {
        sucursalId: string;
        clienteNombre?: string;
        reservaId?: string;
        medioPagoId?: string;
        observaciones?: string;
        items: {
          productoId?: string;
          productoNombre: string;
          precioUnitario: number;
          cantidad: number;
        }[];
      }) =>
        client
          .post<{ mensaje: string; ventaId: string; montoTotal: number }>("/api/Ventas", body)
          .then((r) => r.data),
      anular: (id: string) =>
        client.delete(`/api/Ventas/${id}`).then((r) => r.data),
    },
    compras: {
      list: (params?: {
        sucursalId?: string;
        productoId?: string;
        desde?: string;
        hasta?: string;
      }) =>
        client
          .get<CompraListItem[]>("/api/Compras", { params })
          .then((r) => r.data),
      registrar: (body: {
        productoId: string;
        proveedor?: string;
        cantidad: number;
        costoUnitario: number;
        observaciones?: string;
      }) =>
        client
          .post<{ mensaje: string; compraId: string; stockActual?: number | null }>(
            "/api/Compras",
            body
          )
          .then((r) => r.data),
      anular: (compraId: string) =>
        client.delete(`/api/Compras/${compraId}`).then((r) => r.data),
    },
    egresos: {
      list: (params?: {
        sucursalId?: string;
        categoria?: string;
        desde?: string;
        hasta?: string;
      }) =>
        client
          .get<EgresoListItem[]>("/api/Egresos", { params })
          .then((r) => r.data),
      resumen: (params?: {
        sucursalId?: string;
        desde?: string;
        hasta?: string;
      }) =>
        client
          .get<{
            totalGeneral: number;
            porCategoria: { categoria: string; total: number; cantidad: number }[];
          }>("/api/Egresos/resumen", { params })
          .then((r) => r.data),
      registrar: (body: {
        sucursalId: string;
        categoria?: string;
        descripcion: string;
        monto: number;
        medioPagoId?: string;
        observaciones?: string;
      }) =>
        client
          .post<{ mensaje: string; egresoId: string }>("/api/Egresos", body)
          .then((r) => r.data),
      eliminar: (egresoId: string) =>
        client.delete(`/api/Egresos/${egresoId}`).then((r) => r.data),
    },
  };
}

export type TenantSportApi = ReturnType<typeof createTenantSportApi>;

export type PlatformLoginResponse = {
  token: string;
  id?: string;
  nombreCompleto?: string;
  email?: string;
  rol?: string;
  permisos?: string[];
};

export type PlatformDashboardResumen = {
  totalEmpresasPagadoras?: number;
  TotalEmpresasPagadoras?: number;
  totalTenantsActivos?: number;
  TotalTenantsActivos?: number;
  totalPlanesActivos?: number;
  TotalPlanesActivos?: number;
  totalReservasSport_Global?: number;
  TotalReservasSport_Global?: number;
};

export type PlatformEmpresaListItem = {
  id: string;
  Id?: string;
  documentoFiscal?: string;
  DocumentoFiscal?: string;
  nombreComercial?: string;
  NombreComercial?: string;
  razonSocial?: string;
  RazonSocial?: string;
  emailFacturacion?: string;
  EmailFacturacion?: string;
  telefono?: string;
  Telefono?: string;
  estado?: string;
  Estado?: string;
  planNombre?: string;
  PlanNombre?: string;
  totalTenants?: number;
  TotalTenants?: number;
};

export type PlatformTenantListItem = {
  id: string;
  Id?: string;
  subdomain?: string;
  Subdomain?: string;
  nombreComercialNegocio?: string;
  NombreComercialNegocio?: string;
  isActive?: boolean;
  IsActive?: boolean;
  clienteEmpresaId?: string;
  ClienteEmpresaId?: string;
  empresa?: string;
  Empresa?: string;
};

export type PlatformPlanListItem = {
  id: string;
  Id?: string;
  nombre?: string;
  Nombre?: string;
  precioMensual?: number;
  PrecioMensual?: number;
  limiteSucursales?: number;
  LimiteSucursales?: number;
  limiteUsuariosStaff?: number;
  LimiteUsuariosStaff?: number;
  activo?: boolean;
  Activo?: boolean;
};

export type PlatformUsuarioListItem = {
  id: string;
  Id?: string;
  nombreCompleto?: string;
  NombreCompleto?: string;
  email?: string;
  Email?: string;
  activo?: boolean;
  Activo?: boolean;
  rol?: string;
  Rol?: string;
};

export type PlatformApiConfig = {
  baseURL: string;
  getToken: () => string | null;
  onSessionExpired?: () => void;
};

function isPlatformAuthRequest(url: string): boolean {
  return url.includes("/api/platform/auth/login");
}

export function createPlatformApi(config: PlatformApiConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL.replace(/\/$/, ""),
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const token = config.getToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  });

  if (config.onSessionExpired) {
    attachSessionExpiredInterceptor(client, {
      getToken: config.getToken,
      onSessionExpired: config.onSessionExpired,
      skipAuthUrl: isPlatformAuthRequest,
    });
  }

  return client;
}

function pick<T>(row: Record<string, unknown>, camel: string, pascal: string): T | undefined {
  return (row[camel] ?? row[pascal]) as T | undefined;
}

export function normalizePlatformEmpresa(row: PlatformEmpresaListItem) {
  const r = row as Record<string, unknown>;
  return {
    id: String(pick<string>(r, "id", "Id") ?? ""),
    documentoFiscal: pick<string>(r, "documentoFiscal", "DocumentoFiscal") ?? "",
    nombreComercial: pick<string>(r, "nombreComercial", "NombreComercial") ?? "",
    razonSocial: pick<string>(r, "razonSocial", "RazonSocial") ?? "",
    emailFacturacion: pick<string>(r, "emailFacturacion", "EmailFacturacion") ?? "",
    telefono: pick<string>(r, "telefono", "Telefono") ?? "",
    estado: pick<string>(r, "estado", "Estado") ?? "",
    planNombre: pick<string>(r, "planNombre", "PlanNombre") ?? "",
    totalTenants: pick<number>(r, "totalTenants", "TotalTenants") ?? 0,
  };
}

export function normalizePlatformTenant(row: PlatformTenantListItem) {
  const r = row as Record<string, unknown>;
  return {
    id: String(pick<string>(r, "id", "Id") ?? ""),
    subdomain: pick<string>(r, "subdomain", "Subdomain") ?? "",
    nombreComercialNegocio:
      pick<string>(r, "nombreComercialNegocio", "NombreComercialNegocio") ?? "",
    isActive: pick<boolean>(r, "isActive", "IsActive") ?? false,
    clienteEmpresaId: String(pick<string>(r, "clienteEmpresaId", "ClienteEmpresaId") ?? ""),
    empresa: pick<string>(r, "empresa", "Empresa") ?? "",
  };
}

export function createPlatformServices(client: AxiosInstance) {
  return {
    auth: {
      login: (email: string, password: string) =>
        client
          .post<PlatformLoginResponse>("/api/platform/auth/login", { email, password })
          .then((r) => r.data),
      yo: () => client.get("/api/platform/auth/yo").then((r) => r.data),
      logout: () => client.post("/api/platform/auth/logout").then((r) => r.data),
    },
    dashboard: {
      resumen: () =>
        client.get<PlatformDashboardResumen>("/api/platform/dashboard/resumen").then((r) => r.data),
      empresas: () => client.get("/api/platform/dashboard/empresas").then((r) => r.data),
    },
    operaciones: {
      staffNegocios: (params?: {
        q?: string;
        tenantId?: string;
        clienteEmpresaId?: string;
        soloActivos?: boolean;
      }) =>
        client.get("/api/platform/operaciones/staff-negocios", { params }).then((r) => r.data),
      actualizarStaffNegocio: (staffId: string, body: { activo?: boolean }) =>
        client
          .put(`/api/platform/operaciones/staff-negocios/${staffId}`, body)
          .then((r) => r.data),
      eliminarStaffNegocio: (staffId: string) =>
        client.delete(`/api/platform/operaciones/staff-negocios/${staffId}`).then((r) => r.data),
      permisosSportCatalogo: () =>
        client.get<{ codigo?: string; Codigo?: string }[]>("/api/platform/operaciones/permisos-sport-catalogo").then((r) => r.data),
      sucursalesTenant: (tenantId: string) =>
        client.get(`/api/platform/operaciones/tenants/${tenantId}/sucursales`).then((r) => r.data),
      rolesTenant: (tenantId: string) =>
        client.get(`/api/platform/operaciones/tenants/${tenantId}/roles`).then((r) => r.data),
      crearRolTenant: (
        tenantId: string,
        body: { nombre: string; codigo?: string; nivel?: number; permisoCodigos: string[] }
      ) => client.post(`/api/platform/operaciones/tenants/${tenantId}/roles`, body).then((r) => r.data),
      actualizarPermisosRolTenant: (tenantId: string, rolId: string, permisoCodigos: string[]) =>
        client
          .put(`/api/platform/operaciones/tenants/${tenantId}/roles/${rolId}/permisos`, {
            permisoCodigos,
          })
          .then((r) => r.data),
      crearStaffNegocio: (body: {
        tenantId: string;
        dni: string;
        nombreCompleto: string;
        email?: string;
        rolTenantId: string;
        sucursalIds?: string[];
      }) => client.post("/api/platform/operaciones/staff-negocios", body).then((r) => r.data),
    },
    empresas: {
      list: (estado?: string) =>
        client
          .get<PlatformEmpresaListItem[]>("/api/platform/empresas", {
            params: estado ? { estado } : undefined,
          })
          .then((r) => r.data),
      get: (id: string) => client.get(`/api/platform/empresas/${id}`).then((r) => r.data),
      actualizar: (
        id: string,
        body: {
          razonSocial?: string;
          nombreComercial?: string;
          emailFacturacion?: string;
          telefono?: string;
          estado?: string;
        }
      ) => client.put(`/api/platform/empresas/${id}`, body).then((r) => r.data),
      cancelar: (id: string) => client.delete(`/api/platform/empresas/${id}`).then((r) => r.data),
    },
    tenants: {
      list: (params?: { clienteEmpresaId?: string; soloActivos?: boolean }) =>
        client
          .get<PlatformTenantListItem[]>("/api/platform/tenants", { params })
          .then((r) => r.data),
      get: (id: string) => client.get(`/api/platform/tenants/${id}`).then((r) => r.data),
      crear: (body: {
        clienteEmpresaId: string;
        subdomain: string;
        nombreComercialNegocio: string;
        nombreSucursalPrincipal?: string;
        direccionSucursal?: string;
      }) => client.post("/api/platform/tenants", body).then((r) => r.data),
    },
    planes: {
      list: (params?: { soloActivos?: boolean }) =>
        client
          .get<PlatformPlanListItem[]>("/api/platform/planes", {
            params: params?.soloActivos !== undefined ? { soloActivos: params.soloActivos } : undefined,
          })
          .then((r) => r.data),
      get: (id: string) => client.get(`/api/platform/planes/${id}`).then((r) => r.data),
      actualizar: (
        id: string,
        body: {
          nombre?: string;
          precioMensual?: number;
          limiteSucursales?: number;
          limiteUsuariosStaff?: number;
          soportaModuloSport?: boolean;
          soportaModuloStay?: boolean;
          soportaModuloCare?: boolean;
          soportaFidelizacionPuntos?: boolean;
          activo?: boolean;
          diasDuracionDemo?: number | null;
        }
      ) => client.put(`/api/platform/planes/${id}`, body).then((r) => r.data),
    },
    solicitudesContrato: {
      list: (estado?: string) =>
        client
          .get("/api/platform/solicitudes-contrato", {
            params: estado ? { estado } : undefined,
          })
          .then((r) => r.data),
      get: (id: string) =>
        client.get(`/api/platform/solicitudes-contrato/${id}`).then((r) => r.data),
      actualizarNotas: (id: string, notasPlataforma: string) =>
        client
          .put(`/api/platform/solicitudes-contrato/${id}/notas`, { notasPlataforma })
          .then((r) => r.data),
      aprobar: (id: string, notasPlataforma?: string) =>
        client
          .post(`/api/platform/solicitudes-contrato/${id}/aprobar`, { notasPlataforma })
          .then((r) => r.data),
      rechazar: (id: string, motivo?: string) =>
        client
          .post(`/api/platform/solicitudes-contrato/${id}/rechazar`, { motivo })
          .then((r) => r.data),
    },
    usuarios: {
      list: () =>
        client.get<PlatformUsuarioListItem[]>("/api/platform/usuarios").then((r) => r.data),
      get: (id: string) => client.get(`/api/platform/usuarios/${id}`).then((r) => r.data),
      actualizar: (id: string, body: { activo?: boolean; nombreCompleto?: string }) =>
        client.put(`/api/platform/usuarios/${id}`, body).then((r) => r.data),
      desactivar: (id: string) =>
        client.post(`/api/platform/usuarios/${id}/desactivar`).then((r) => r.data),
      eliminar: (id: string) => client.delete(`/api/platform/usuarios/${id}`).then((r) => r.data),
      crear: (body: {
        nombreCompleto: string;
        email: string;
        password: string;
        rolPlataformaId: string;
        activo?: boolean;
      }) => client.post("/api/platform/usuarios", body).then((r) => r.data),
    },
    roles: {
      list: () => client.get("/api/platform/roles").then((r) => r.data),
      permisosCatalogo: () =>
        client
          .get<
            {
              id?: string;
              Id?: string;
              codigo?: string;
              Codigo?: string;
              modulo?: string;
              Modulo?: string;
              descripcion?: string;
              Descripcion?: string;
            }[]
          >("/api/platform/permisos")
          .then((r) => r.data),
      crear: (body: {
        codigo: string;
        nombre: string;
        nivel: number;
        permisoIds: string[];
      }) => client.post("/api/platform/roles", body).then((r) => r.data),
      actualizar: (rolId: string, body: { nombre?: string; nivel?: number }) =>
        client.put(`/api/platform/roles/${rolId}`, body).then((r) => r.data),
      actualizarPermisos: (rolId: string, permisoIds: string[]) =>
        client
          .put(`/api/platform/roles/${rolId}/permisos`, { permisoIds })
          .then((r) => r.data),
      eliminar: (rolId: string) => client.delete(`/api/platform/roles/${rolId}`).then((r) => r.data),
    },
  };
}

export type PlatformServices = ReturnType<typeof createPlatformServices>;
