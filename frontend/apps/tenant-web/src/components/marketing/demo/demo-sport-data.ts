export type DemoPeriodo = "7d" | "30d";

/** Misma ruta que el panel real, sin la barra inicial: dashboard, reservas, … */
export type DemoSeccion = string;

export function demoIdFromPanelHref(href: string): DemoSeccion {
  return href.replace(/^\//, "");
}

export const DEMO_NEGOCIO = {
  marca: "Complejo La Cancha Demo",
  sede: "Sede Miraflores",
  gerente: "María Demo",
};

export const DEMO_SUCURSALES = [
  { id: "s1", nombre: "Miraflores" },
  { id: "s2", nombre: "Surco" },
] as const;

export type DemoEstadoReserva =
  | "Pendiente"
  | "Confirmada"
  | "Completada"
  | "Cancelada";

export type DemoReserva = {
  id: string;
  cliente: string;
  cancha: string;
  sucursalId: string;
  fecha: string;
  hora: string;
  monto: number;
  estado: DemoEstadoReserva;
  origen: "Web" | "Panel";
};

export const DEMO_RESERVAS: DemoReserva[] = [
  {
    id: "r1",
    cliente: "Carlos Mendoza",
    cancha: "Fútbol 7 — A",
    sucursalId: "s1",
    fecha: "2026-06-11",
    hora: "18:00",
    monto: 120,
    estado: "Confirmada",
    origen: "Web",
  },
  {
    id: "r2",
    cliente: "Ana Torres",
    cancha: "Vóley — 1",
    sucursalId: "s1",
    fecha: "2026-06-11",
    hora: "19:30",
    monto: 80,
    estado: "Pendiente",
    origen: "Web",
  },
  {
    id: "r3",
    cliente: "Luis Paredes",
    cancha: "Fútbol 7 — B",
    sucursalId: "s2",
    fecha: "2026-06-11",
    hora: "20:00",
    monto: 120,
    estado: "Confirmada",
    origen: "Panel",
  },
  {
    id: "r4",
    cliente: "Grupo Universitario",
    cancha: "Fútbol 11",
    sucursalId: "s2",
    fecha: "2026-06-10",
    hora: "16:00",
    monto: 200,
    estado: "Completada",
    origen: "Panel",
  },
  {
    id: "r5",
    cliente: "Pedro Rojas",
    cancha: "Fútbol 7 — A",
    sucursalId: "s1",
    fecha: "2026-06-10",
    hora: "21:00",
    monto: 120,
    estado: "Cancelada",
    origen: "Web",
  },
  {
    id: "r6",
    cliente: "Valeria Soto",
    cancha: "Vóley — 1",
    sucursalId: "s1",
    fecha: "2026-06-09",
    hora: "17:00",
    monto: 80,
    estado: "Completada",
    origen: "Web",
  },
  {
    id: "r7",
    cliente: "Diego Flores",
    cancha: "Fútbol 7 — B",
    sucursalId: "s2",
    fecha: "2026-06-09",
    hora: "19:00",
    monto: 120,
    estado: "Completada",
    origen: "Panel",
  },
  {
    id: "r8",
    cliente: "Empresa Tech SAC",
    cancha: "Fútbol 11",
    sucursalId: "s1",
    fecha: "2026-06-08",
    hora: "18:30",
    monto: 220,
    estado: "Confirmada",
    origen: "Panel",
  },
  {
    id: "r9",
    cliente: "Walk-in",
    cancha: "Fútbol 7 — A",
    sucursalId: "s1",
    fecha: "2026-06-08",
    hora: "15:00",
    monto: 100,
    estado: "Completada",
    origen: "Panel",
  },
  {
    id: "r10",
    cliente: "Jorge Vargas",
    cancha: "Vóley — 1",
    sucursalId: "s2",
    fecha: "2026-06-07",
    hora: "20:30",
    monto: 80,
    estado: "Pendiente",
    origen: "Web",
  },
];

export const DEMO_CANCHAS = [
  { id: "c1", nombre: "Fútbol 7 — A", sucursalId: "s1", deporte: "Fútbol", tarifa: 120, activa: true },
  { id: "c2", nombre: "Fútbol 7 — B", sucursalId: "s2", deporte: "Fútbol", tarifa: 120, activa: true },
  { id: "c3", nombre: "Fútbol 11", sucursalId: "s2", deporte: "Fútbol", tarifa: 200, activa: true },
  { id: "c4", nombre: "Vóley — 1", sucursalId: "s1", deporte: "Vóley", tarifa: 80, activa: true },
  { id: "c5", nombre: "Vóley — 2", sucursalId: "s1", deporte: "Vóley", tarifa: 80, activa: false },
] as const;

export function demoKpis(periodo: DemoPeriodo) {
  if (periodo === "7d") {
    return {
      reservasHoy: 3,
      reservasTotal: 18,
      cobradoHoy: 320,
      cobradoPeriodo: 1840,
      ocupacion: 72,
      pendientesWeb: 2,
      tendenciaReservas: "+12%",
      tendenciaCobro: "+8%",
    };
  }
  return {
    reservasHoy: 3,
    reservasTotal: 64,
    cobradoHoy: 320,
    cobradoPeriodo: 6120,
    ocupacion: 68,
    pendientesWeb: 2,
    tendenciaReservas: "+5%",
    tendenciaCobro: "+11%",
  };
}

export const DEMO_VOLUMEN_SEMANAL = [
  { dia: "Lun", valor: 8 },
  { dia: "Mar", valor: 12 },
  { dia: "Mié", valor: 10 },
  { dia: "Jue", valor: 14 },
  { dia: "Vie", valor: 18 },
  { dia: "Sáb", valor: 22 },
  { dia: "Dom", valor: 16 },
];

export const DEMO_ESTADO_RESUMEN = [
  { estado: "Confirmada", cantidad: 12, color: "bg-emerald-500" },
  { estado: "Pendiente", cantidad: 4, color: "bg-amber-500" },
  { estado: "Completada", cantidad: 28, color: "bg-slate-500" },
  { estado: "Cancelada", cantidad: 3, color: "bg-red-400" },
];

export const DEMO_RESERVAS_WEB = [
  {
    id: "w1",
    cliente: "Ana Torres",
    cancha: "Vóley — 1",
    fecha: "2026-06-12",
    hora: "19:30",
    monto: 80,
    adelanto: 40,
  },
  {
    id: "w2",
    cliente: "Jorge Vargas",
    cancha: "Vóley — 1",
    fecha: "2026-06-12",
    hora: "20:30",
    monto: 80,
    adelanto: 0,
  },
];

export const DEMO_VENTAS = [
  { id: "v1", fecha: "2026-06-11", cliente: "Walk-in", total: 45, items: 3 },
  { id: "v2", fecha: "2026-06-11", cliente: "Carlos M.", total: 18, items: 2 },
  { id: "v3", fecha: "2026-06-10", cliente: "Luis P.", total: 32, items: 4 },
];

export const DEMO_PRODUCTOS = [
  { id: "p1", nombre: "Agua 625ml", stock: 48, min: 12, precio: 3 },
  { id: "p2", nombre: "Alquiler balón", stock: 6, min: 2, precio: 15 },
  { id: "p3", nombre: "Energizante", stock: 5, min: 8, precio: 8 },
  { id: "p4", nombre: "Medias deportivas", stock: 20, min: 5, precio: 25 },
];

export const DEMO_EGRESOS = [
  { id: "e1", fecha: "2026-06-10", concepto: "Mantenimiento grass", monto: 350 },
  { id: "e2", fecha: "2026-06-08", concepto: "Luz sede Miraflores", monto: 420 },
  { id: "e3", fecha: "2026-06-05", concepto: "Limpieza", monto: 180 },
];

export const DEMO_STAFF = [
  { id: "u1", nombre: "María Demo", dni: "76063361", rol: "Gerente", activo: true },
  { id: "u2", nombre: "Pedro Cajero", dni: "71234567", rol: "Cajero", activo: true },
  { id: "u3", nombre: "Lucía Turno", dni: "72345678", rol: "Cajero", activo: false },
];

export const DEMO_TARIFAS = [
  { id: "t1", nombre: "Hora punta", canchas: 3, precio: 140 },
  { id: "t2", nombre: "Hora valle", canchas: 4, precio: 100 },
  { id: "t3", nombre: "Fin de semana", canchas: 2, precio: 160 },
];

export const DEMO_MEDIOS_PAGO = [
  { id: "mp1", tipo: "Efectivo", activo: true, detalle: "Caja sede" },
  { id: "mp2", tipo: "Yape", activo: true, detalle: "987 654 321" },
  { id: "mp3", tipo: "Plin", activo: true, detalle: "987 654 321" },
  { id: "mp4", tipo: "Transferencia", activo: false, detalle: "BCP · CCI demo" },
];

export const DEMO_SUCURSALES_DETALLE = [
  {
    id: "s1",
    nombre: "Miraflores",
    direccion: "Av. Demo 123, Miraflores",
    activa: true,
    canchas: 3,
  },
  {
    id: "s2",
    nombre: "Surco",
    direccion: "Av. Demo 456, Santiago de Surco",
    activa: true,
    canchas: 2,
  },
];

export const DEMO_CALENDARIO_SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
export const DEMO_CALENDARIO_DIAS = ["Lun 9", "Mar 10", "Mié 11", "Jue 12", "Vie 13", "Sáb 14", "Dom 15"];
