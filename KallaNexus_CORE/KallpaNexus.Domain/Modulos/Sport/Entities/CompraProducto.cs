using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>
/// Registro de compra/entrada de stock para un producto.
/// Aumenta el StockActual del producto al confirmarse.
/// </summary>
public class CompraProducto : BaseEntidadSucursal
{
    public Guid ProductoId { get; set; }

    /// <summary>Snapshot del nombre del producto.</summary>
    public string ProductoNombre { get; set; } = string.Empty;

    public DateTime FechaHora { get; set; }

    /// <summary>Nombre del proveedor o tienda donde se compró (opcional).</summary>
    public string? Proveedor { get; set; }

    public int Cantidad { get; set; }

    /// <summary>Costo unitario pagado (para calcular costo total de la compra).</summary>
    public decimal CostoUnitario { get; set; }

    public decimal CostoTotal { get; set; }

    public string? Observaciones { get; set; }

    /// <summary>Snapshot del nombre del staff que registró la compra.</summary>
    public string? RegistradoPorNombre { get; set; }
}
