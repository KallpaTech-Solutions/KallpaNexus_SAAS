using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Tenancy;

public class UsuarioStaff : BaseTenantEntity
{
    public string Dni { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public Guid RolTenantId { get; set; }
    public RolTenant RolTenant { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public bool DebeCambiarPassword { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<UsuarioStaffSucursal> SucursalesAsignadas { get; set; } = [];
}
