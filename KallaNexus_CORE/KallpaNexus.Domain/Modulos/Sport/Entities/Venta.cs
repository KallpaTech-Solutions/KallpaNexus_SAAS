using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>
/// Venta de productos en el punto de venta (mostrador). Pertenece a una sucursal.
/// </summary>
public class Venta : BaseEntidadSucursal
{
    public DateTime FechaHora { get; set; }

    /// <summary>Nombre del cliente (opcional, no requiere DNI).</summary>
    public string? ClienteNombre { get; set; }

    /// <summary>Reserva asociada (si la venta se originó desde una reserva).</summary>
    public Guid? ReservaId { get; set; }

    public Guid? MedioPagoId { get; set; }

    /// <summary>Snapshot del nombre del medio al momento de la venta.</summary>
    public string? MedioPagoNombre { get; set; }

    public decimal MontoTotal { get; set; }
    public string? Observaciones { get; set; }

    /// <summary>Snapshot del nombre del cajero que registró la venta.</summary>
    public string? RegistradoPorNombre { get; set; }

    public ICollection<VentaItem> Items { get; set; } = [];
}
