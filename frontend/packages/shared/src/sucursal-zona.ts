/** Intenta obtener ciudad/distrito desde dirección de sucursal (ej. "Av. X, Lima"). */
export function extraerCiudadDesdeDireccion(direccion: string): string | null {
  const cleaned = direccion.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const partes = cleaned
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (partes.length >= 2) {
    const ultima = partes[partes.length - 1];
    if (ultima.length >= 2 && ultima.length <= 48 && !/^\d{4,}/.test(ultima)) {
      return ultima;
    }
  }

  return null;
}

export function etiquetaFechaHora(ciudad: string | null | undefined): string {
  return ciudad ? `Fecha y hora (${ciudad})` : "Fecha y hora";
}

export function etiquetaHorario(ciudad: string | null | undefined): string {
  return ciudad ? `Horario (${ciudad})` : "Horario";
}

export function etiquetaFranjaHoraria(ciudad: string | null | undefined): string {
  return ciudad ? `Franja horaria (${ciudad})` : "Franja horaria";
}

export function etiquetaRangoFechas(ciudad: string | null | undefined): string {
  return ciudad ? `Rango (${ciudad})` : "Rango de fechas";
}

export function textoResumenHoy(ciudad: string | null | undefined): string {
  return ciudad ? `resumen de hoy · ${ciudad}` : "resumen de hoy";
}

export function textoHorariosNegocio(ciudad: string | null | undefined): string {
  return ciudad
    ? `Horarios según la sede en ${ciudad}.`
    : "Horarios según la sede activa del club.";
}

export function sufijoCiudadParentesis(ciudad: string | null | undefined): string {
  return ciudad ? ` (${ciudad})` : "";
}

export function hintHoraFranja(ciudad: string | null | undefined): string {
  return ciudad
    ? `Inicio de la franja (horario local · ${ciudad}).`
    : "Inicio de la franja (horario local de la sede).";
}
