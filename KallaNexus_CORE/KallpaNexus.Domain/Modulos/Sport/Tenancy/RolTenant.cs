using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Tenancy;

public class RolTenant : BaseTenantEntity
{
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public int Nivel { get; set; }
    public bool EsSistema { get; set; }
    public ICollection<RolTenantPermiso> Permisos { get; set; } = [];
    public ICollection<UsuarioStaff> Usuarios { get; set; } = [];
}
