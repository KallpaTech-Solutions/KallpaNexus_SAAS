using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Persistence;

public static class ReservaCobroSync
{
    public static async Task<decimal> TotalConfirmadoAsync(
        ApplicationDbContext db,
        Guid reservaId,
        CancellationToken ct = default)
    {
        return await db.PagosReserva
            .Where(p => p.ReservaId == reservaId && p.Estado == EstadoPagoReserva.Confirmado)
            .SumAsync(p => (decimal?)p.Monto, ct) ?? 0m;
    }

    /// <summary>
    /// Alinea Pendiente/Confirmada con pagos confirmados (no toca cancelada/completada).
    /// </summary>
    public static async Task SincronizarEstadoReservaAsync(
        ApplicationDbContext db,
        Reserva reserva,
        CancellationToken ct = default)
    {
        if (reserva.Estado is EstadoReserva.Cancelada or EstadoReserva.Completada or EstadoReserva.NoAsistio)
        {
            return;
        }

        var confirmado = await TotalConfirmadoAsync(db, reserva.Id, ct);
        var cubierto = confirmado >= reserva.MontoTotal - 0.01m;

        if (cubierto && reserva.Estado == EstadoReserva.Pendiente)
        {
            reserva.Estado = EstadoReserva.Confirmada;
        }
        // No bajar Confirmada → Pendiente: reserva confirmada por el negocio puede tener cobro parcial o sin adelanto.
    }
}
