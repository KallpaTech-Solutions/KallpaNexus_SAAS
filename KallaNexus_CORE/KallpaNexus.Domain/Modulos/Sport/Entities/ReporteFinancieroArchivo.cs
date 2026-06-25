using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>Instantánea archivada de un reporte financiero (código oficial KN-…).</summary>
public class ReporteFinancieroArchivo : BaseTenantEntity
{
    public string Codigo { get; set; } = "";
    public Guid SucursalId { get; set; }
    public string? SucursalNombre { get; set; }
    public string? Ciudad { get; set; }
    public DateTime DesdeUtc { get; set; }
    public DateTime HastaUtc { get; set; }
    public DateTime GeneradoEnUtc { get; set; }
    public Guid? GeneradoPorStaffId { get; set; }
    public string? GeneradoPorNombre { get; set; }
    /// <summary>JSON del payload de reporte (mismos campos que GET financieros).</summary>
    public string DatosJson { get; set; } = "";
}
