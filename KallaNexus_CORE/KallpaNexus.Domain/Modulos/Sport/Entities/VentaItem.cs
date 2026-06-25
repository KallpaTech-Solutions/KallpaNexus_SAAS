using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>
/// Línea de detalle de una venta. Almacena snapshot del producto para conservar historial
/// aunque el producto sea eliminado posteriormente.
/// </summary>
public class VentaItem : BaseTenantEntity
{
    public Guid VentaId { get; set; }

    /// <summary>Null si el producto fue eliminado después de la venta.</summary>
    public Guid? ProductoId { get; set; }

    /// <summary>Snapshot del nombre del producto al momento de la venta.</summary>
    public string ProductoNombre { get; set; } = string.Empty;

    public decimal PrecioUnitario { get; set; }
    public int Cantidad { get; set; }
    public decimal Subtotal { get; set; }
}
