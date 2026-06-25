using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;

namespace KallpaNexus.Application.Modulos.Sport.Reservas;

/// <summary>Reglas de solapamiento de horarios (panel vs web con hold).</summary>
public static class ReservaHorarioBloqueo
{
    public static bool ReservaBloqueaHorario(Reserva r, DateTime utcNow)
    {
        if (r.Estado is not (EstadoReserva.Confirmada or EstadoReserva.Pendiente))
        {
            return false;
        }

        if (r.Estado == EstadoReserva.Confirmada)
        {
            return true;
        }

        if (r.Origen == OrigenReserva.Panel)
        {
            return true;
        }

        return r.HoldExpiraEnUtc.HasValue && r.HoldExpiraEnUtc.Value > utcNow;
    }

    public static bool Solapa(
        DateTime inicioA,
        DateTime finA,
        DateTime inicioB,
        DateTime finB) =>
        inicioA < finB && finA > inicioB;
}
