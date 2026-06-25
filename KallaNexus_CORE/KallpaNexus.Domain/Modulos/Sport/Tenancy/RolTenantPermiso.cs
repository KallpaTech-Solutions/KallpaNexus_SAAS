namespace KallpaNexus.Domain.Modulos.Sport.Tenancy;

public class RolTenantPermiso
{
    public Guid RolTenantId { get; set; }
    public RolTenant RolTenant { get; set; } = null!;
    public string PermisoCodigo { get; set; } = string.Empty;
}
