using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>Ítems de producto pedidos junto a una reserva web (stock al confirmar).</summary>
public class ReservaProductoSolicitado : BaseTenantEntity
{
    public Guid ReservaId { get; set; }
    public Reserva Reserva { get; set; } = null!;

    public Guid ProductoId { get; set; }
    public Producto Producto { get; set; } = null!;

    public string NombreProducto { get; set; } = string.Empty;
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal { get; set; }
}
