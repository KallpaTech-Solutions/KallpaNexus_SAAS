using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>
/// Producto del catálogo de venta del negocio (bebidas, snacks, accesorios, etc.).
/// Pertenece a una sucursal específica.
/// </summary>
public class Producto : BaseEntidadSucursal
{
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }

    /// <summary>Categoría libre: Bebida, Snack, Accesorio, Alquiler, Otro.</summary>
    public string Categoria { get; set; } = "Otro";

    public decimal Precio { get; set; }
    public bool Activo { get; set; } = true;

    /// <summary>Activa el control de inventario para este producto.</summary>
    public bool ControlStock { get; set; } = false;

    /// <summary>Unidades disponibles actualmente. Solo aplica si ControlStock = true.</summary>
    public int StockActual { get; set; } = 0;

    /// <summary>
    /// Cuando StockActual llega a este valor o menos se muestra alerta amarilla.
    /// En 0 se muestra alerta roja.
    /// Null = sin punto de alerta configurado.
    /// </summary>
    public int? PuntoAlerta { get; set; }

    /// <summary>Mostrar en vitrina / carrito de reserva web.</summary>
    public bool VisibleEnWeb { get; set; }
}
