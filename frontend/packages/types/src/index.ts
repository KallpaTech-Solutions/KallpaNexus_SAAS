export const PERMISOS_SPORT = {
  canchasVer: "sport:canchas:ver",
  canchasCrear: "sport:canchas:crear",
  canchasModificar: "sport:canchas:modificar",
  reservasVer: "sport:reservas:ver",
  reservasCrear: "sport:reservas:crear",
  reservasCancelar: "sport:reservas:cancelar",
  reportesFinancieros: "sport:reportes:financieros",
  reportesEliminar: "sport:reportes:eliminar",
  usuariosVer: "sport:usuarios:ver",
  usuariosCrear: "sport:usuarios:crear",
  usuariosActivar: "sport:usuarios:activar",
  usuariosEliminar: "sport:usuarios:eliminar",
  rolesVer: "sport:roles:ver",
  rolesGestionar: "sport:roles:gestionar",
  // Ventas / Punto de Venta
  ventasVer: "sport:ventas:ver",
  ventasCrear: "sport:ventas:crear",
  ventasProductosGestionar: "sport:ventas:productos",
  // Compras / Inventario
  comprasVer: "sport:compras:ver",
  comprasCrear: "sport:compras:crear",
  // Egresos / Gastos
  egresosVer: "sport:egresos:ver",
  egresosCrear: "sport:egresos:crear",
  egresosEliminar: "sport:egresos:eliminar",
} as const;

export type ProductoListItem = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  categoria: string;
  precio: number;
  activo: boolean;
  sucursalId: string;
  controlStock: boolean;
  stockActual: number;
  puntoAlerta?: number | null;
  visibleEnWeb?: boolean;
};

export type CompraListItem = {
  id: string;
  fechaHora: string;
  sucursalId: string;
  productoId: string;
  productoNombre: string;
  proveedor?: string | null;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  observaciones?: string | null;
  registradoPorNombre?: string | null;
};

export type EgresoListItem = {
  id: string;
  fechaHora: string;
  sucursalId: string;
  categoria: string;
  descripcion: string;
  monto: number;
  medioPagoId?: string | null;
  medioPagoNombre?: string | null;
  observaciones?: string | null;
  registradoPorNombre?: string | null;
};

export type VentaItemDetalle = {
  id?: string;
  productoId?: string | null;
  productoNombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
};

export type VentaListItem = {
  id: string;
  fechaHora: string;
  sucursalId: string;
  clienteNombre?: string | null;
  reservaId?: string | null;
  medioPagoId?: string | null;
  medioPagoNombre?: string | null;
  montoTotal: number;
  observaciones?: string | null;
  registradoPorNombre?: string | null;
  items: VentaItemDetalle[];
};

export type PagoReservaListItem = {
  id: string;
  reservaId: string;
  medioPagoId: string;
  medioPagoNombre: string;
  monto: number;
  codigoOperacion?: string | null;
  voucherUrl?: string | null;
  registradoSinVoucher: boolean;
  canal: string;
  estado: string;
};

export type PlanSaaSVitrina = {
  id: string;
  nombre: string;
  precioMensual: number;
  limiteSucursales: number;
  limiteUsuariosStaff: number;
  esActual?: boolean;
};

export type TenantSuscripcionResumen = {
  estado: string;
  proximoPago: string;
  diasRestantesCiclo?: number;
  tipoCiclo?: "Demo" | "Mensual" | string;
  cicloVencido?: boolean;
  accesoPanelCompleto?: boolean;
  cancelacionProgramada?: boolean;
  soloGestionPlan?: boolean;
  plan: {
    id: string;
    nombre: string;
    precioMensual: number;
    limiteSucursales: number;
    limiteUsuariosStaff: number;
  };
  uso: {
    sucursales: number;
    usuariosStaff: number;
  };
  planesDisponibles?: PlanSaaSVitrina[] | null;
  solicitudPendiente?: {
    id: string;
    createdAt: string;
    mensajeCliente?: string | null;
    plan: { id: string; nombre: string; precioMensual: number };
  } | null;
};

/** Resúmenes extra incluidos en los reportes generales archivados. */
export type ReporteVentasResumen = {
  total: number;
  cantidad: number;
  porMedio: { medio: string; monto: number; cantidad: number }[];
  topProductos: { nombre: string; cantidad: number; monto: number }[];
};

export type ReporteEgresosResumen = {
  total: number;
  cantidad: number;
  porCategoria: { categoria: string; total: number; cantidad: number }[];
};

export type ReporteInventarioResumen = {
  conControl: number;
  agotados: number;
  enAlerta: number;
  valorizado: number;
  productos: { nombre: string; categoria: string; stock: number; puntoAlerta?: number | null; precio: number }[];
};

export type ReporteFinanciero = {
  desdeUtc: string;
  hastaUtc: string;
  reservasActivas: number;
  totalMontoReservas: number;
  pagosConfirmados: number;
  reservasConAlMenosUnPago: number;
  totalCobradoConfirmado: number;
  pendienteCobroEstimado: number;
  porMedio: { medio: string; monto: number; cantidad: number }[];
  /** Presentes solo en reportes generales archivados (snapshots nuevos). */
  ventas?: ReporteVentasResumen | null;
  egresos?: ReporteEgresosResumen | null;
  inventario?: ReporteInventarioResumen | null;
};

export type ReporteFinancieroArchivadoListItem = {
  id: string;
  codigo: string;
  sucursalId: string;
  sucursalNombre?: string | null;
  ciudad?: string | null;
  desdeUtc: string;
  hastaUtc: string;
  generadoEnUtc: string;
  generadoPorNombre?: string | null;
};

export type ArchivarReporteFinancieroResponse = {
  codigo: string;
  archivoId: string;
  generadoEnUtc: string;
  datos: ReporteFinanciero;
};

export type TenantStaffListItem = {
  id: string;
  dni: string;
  nombreCompleto: string;
  email?: string | null;
  rol: string;
  nivel: number;
  activo: boolean;
  debeCambiarPassword?: boolean;
  accesoTodasSucursales?: boolean;
  sucursales?: { id: string; nombre: string }[];
};

export type TenantStaffNegocioOpcion = {
  id: string;
  subdomain: string;
  nombreComercial: string;
};

export type TenantRolListItem = {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  esSistema: boolean;
  permisos: string[];
};

export type TenantStaffLoginResponse = {
  mensaje: string;
  token?: string;
  tenantId?: string;
  id?: string;
  dni?: string;
  nombreCompleto?: string;
  email?: string | null;
  subdomain?: string;
  rol?: string;
  permisos?: string[];
  debeCambiarPassword?: boolean;
  requiereSeleccionNegocio?: boolean;
  negocios?: TenantStaffNegocioOpcion[];
  accesoTodasSucursales?: boolean;
  sucursales?: { id: string; nombre: string }[];
};

export type TenantStaffYo = {
  id: string;
  tenantId: string;
  dni: string;
  nombreCompleto: string;
  email?: string | null;
  debeCambiarPassword: boolean;
  rol: string;
  permisos: string[];
  accesoTodasSucursales?: boolean;
  sucursales?: { id: string; nombre: string }[];
};

export type SucursalListItem = {
  id: string;
  nombre: string;
  direccion: string;
  ciudad?: string | null;
  telefono: string;
  telefonoWhatsApp?: string | null;
  activa: boolean;
  totalCanchas: number;
  latitud?: number | null;
  longitud?: number | null;
  enlaceGoogleMaps?: string | null;
};

export type ConfiguracionNegocio = {
  nombreComercial: string;
  razonSocial?: string | null;
  telefonoWhatsAppNegocio: string;
  mensajeWhatsAppReserva: string;
  esValoresPorDefecto?: boolean;
  reservaWebActiva?: boolean;
  minutosHoldWeb?: number;
  maxReservasWebPorDniPorDia?: number;
  tituloWebLanding?: string | null;
  mensajeWebLanding?: string | null;
  imagenHeroUrl?: string | null;
};

export type MedioPagoListItem = {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  requiereVoucherOnline: boolean;
  permiteSinVoucherPresencial: boolean;
  esPasarelaExterna: boolean;
  visibleEnWeb?: boolean;
  qrUrl?: string | null;
  orden: number;
};

export type CanchaListItem = {
  id: string;
  nombre: string;
  tipoCancha: string;
  tieneIluminacion: boolean;
  estaActiva: boolean;
  nombreSucursal: string;
  sucursalId: string;
  imagenWebUrl?: string | null;
};

export type TarifaListItem = {
  id: string;
  sucursalId: string;
  nombre: string;
  horaInicio: number;
  horaFin: number;
  aplicaLunesAViernes: boolean;
  aplicaFinDeSemana: boolean;
  precioPorHora: number;
  activa: boolean;
  canchasAsignadas: number;
};

export type ReservaListItem = {
  id: string;
  canchaId: string;
  nombreCancha: string;
  sucursalId: string;
  clienteId: string;
  clienteDni: string;
  clienteNombre: string;
  clienteTelefono: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  montoTotal: number;
  /** Suma de pagos confirmados (adelanto u otros cobros). */
  montoConfirmado?: number;
  /** Saldo por cobrar (montoTotal − montoConfirmado). */
  montoPendiente?: number;
  /** Cobros confirmados por encima del total (bajar monto o anular cobros). */
  montoExcedente?: number;
  observaciones?: string | null;
  adelantoDevuelto?: boolean | null;
  canceladaEnUtc?: string | null;
  origen?: string;
  holdExpiraEnUtc?: string | null;
  cantidadProductosWeb?: number;
  grupoSolicitudWebId?: string | null;
  voucherWebPendiente?: string | null;
  medioPagoWebPendiente?: string | null;
  montoPagoWebPendiente?: number | null;
  /** Adelanto online del carrito (misma solicitud web con varios horarios). */
  montoAdelantoWebGrupoPendiente?: number | null;
  montoTotalGrupoWeb?: number | null;
};

export type PublicReservaSlot = {
  horaInicio: number;
  horarioTexto: string;
  estadoSlot: string;
  reservable: boolean;
  precio: number;
  tarifaAplicada: string;
  /** Solo si el DNI consultado coincide con la reserva en ese horario. */
  clienteNombre?: string | null;
  reservaEstado?: string | null;
  holdExpiraEnUtc?: string | null;
};

export type PublicNegocioInfo = {
  slug: string;
  nombreComercial: string;
  tituloLanding?: string;
  mensajeLanding?: string;
  imagenHeroUrl?: string | null;
  reservaWebActiva: boolean;
  minutosHoldWeb: number;
  maxReservasWebPorDniPorDia: number;
  sucursales: {
    id: string;
    slug: string;
    nombre: string;
    ciudad?: string | null;
    direccion: string;
    latitud?: number | null;
    longitud?: number | null;
  }[];
};

export type PublicHubSedeCard = {
  slug: string;
  nombreComercial: string;
  sucursalId: string;
  sucursalNombre: string;
  ciudad?: string | null;
  direccion: string;
  totalCanchas: number;
  tiposCancha: string[];
  sedeSlug?: string;
  urlReserva: string;
};

export type PublicHubResponse = {
  titulo: string;
  total: number;
  sedes: PublicHubSedeCard[];
};

export type PublicProductoWeb = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  categoria: string;
  precio: number;
  agotado: boolean;
};

export type SlotDisponibilidad = {
  horaInicio: number;
  horarioTexto: string;
  estaDisponible: boolean;
  precio: number;
  tarifaAplicada: string;
};

/** Resumen para formularios; datos RENIEC completos quedan en BD (tabla Personas). */
export type DniConsultaResult = {
  origen: string;
  documentNumber: string;
  fullName: string;
  telefono?: string;
  email?: string | null;
};

export type RucConsultaResult = {
  origen: string;
  numeroDocumento: string;
  razonSocial: string;
  estado: string;
  condicion: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  esCompleto: boolean;
};

export type TipoCambioConsultaResult = {
  origen: string;
  buyPrice: string;
  sellPrice: string;
  baseCurrency: string;
  quoteCurrency: string;
  date: string;
};

export type ApiErrorBody = {
  error?: string;
  mensaje?: string;
};
