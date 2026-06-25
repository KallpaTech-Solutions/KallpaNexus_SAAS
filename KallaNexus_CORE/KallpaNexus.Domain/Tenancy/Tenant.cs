namespace KallpaNexus.Domain.Tenancy;

/// <summary>
/// Unidad operativa del ecosistema (subdominio, datos de negocio, conexión BD).
/// </summary>
public class Tenant
{
    public Guid Id { get; set; }

    public string Subdomain { get; set; } = string.Empty;
    public string NombreComercialNegocio { get; set; } = string.Empty;

    public string? ConnectionString { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid ClienteEmpresaId { get; set; }
    public ClienteEmpresa ClienteEmpresa { get; set; } = null!;
}
