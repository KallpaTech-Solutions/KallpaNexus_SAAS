namespace KallpaNexus.Domain.Tenancy;

/// <summary>
/// Cliente SaaS que contrata y paga Kallpa Nexus (persona natural o empresa legal).
/// </summary>
public class ClienteEmpresa
{
    public Guid Id { get; set; }
    public TipoPersona Tipo { get; set; }

    /// <summary>RUC (empresa) o DNI (persona natural).</summary>
    public string DocumentoFiscal { get; set; } = string.Empty;
    public string RazonSocial { get; set; } = string.Empty;
    public string NombreComercial { get; set; } = string.Empty;

    public string EmailFacturacion { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? DireccionFiscal { get; set; }
    public string Pais { get; set; } = "Peru";

    public Guid PlanSaaSId { get; set; }
    public PlanSaaS PlanSaaS { get; set; } = null!;
    public EstadoSuscripcion Estado { get; set; } = EstadoSuscripcion.Demo;
    public DateTime ProximoPago { get; set; }

    public ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
}
