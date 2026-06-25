/** Texto amigable para el cliente en la web pública. */
export function etiquetaEstadoReservaPublica(
  reservaEstado?: string | null,
  holdExpiraEnUtc?: string | null
): string {
  if (reservaEstado === "Confirmada") return "Confirmada";
  if (reservaEstado === "Pendiente") {
    if (holdExpiraEnUtc) {
      const exp = new Date(holdExpiraEnUtc);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() > Date.now()) {
        return "Pendiente — el local debe confirmar";
      }
    }
    return "Pendiente — contacta al local si el plazo venció";
  }
  if (reservaEstado === "Cancelada") return "Cancelada";
  return "Tu reserva";
}
