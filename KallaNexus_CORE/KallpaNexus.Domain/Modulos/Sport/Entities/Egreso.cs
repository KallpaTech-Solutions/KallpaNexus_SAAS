using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>
/// Gasto operativo del negocio: agua, luz, internet, mantenimiento, personal, etc.
/// </summary>
public class Egreso : BaseEntidadSucursal
{
    public DateTime FechaHora { get; set; }

    /// <summary>Categoría: Servicios, Mantenimiento, Personal, Limpieza, Compras, Otro.</summary>
    public string Categoria { get; set; } = "Otro";

    public string Descripcion { get; set; } = string.Empty;
    public decimal Monto { get; set; }

    public Guid? MedioPagoId { get; set; }

    /// <summary>Snapshot del nombre del medio de pago.</summary>
    public string? MedioPagoNombre { get; set; }

    public string? Observaciones { get; set; }

    /// <summary>Snapshot del staff que registró el egreso.</summary>
    public string? RegistradoPorNombre { get; set; }
}
