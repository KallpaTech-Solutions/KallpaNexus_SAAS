using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Domain.Modulos.Sport.Enums
{
    /// <summary>
    /// Representa el estado actual de una reserva de cancha.
    /// </summary>
    public enum EstadoReserva
    {
        Pendiente,  // Registrada pero sin pago/confirmación
        Confirmada, // Lista para jugar
        Cancelada,  // Anulada por el cliente o admin
        Completada, // El partido ya se jugó
        NoAsistio   // El cliente reservó pero dejó la cancha vacía
    }
}
