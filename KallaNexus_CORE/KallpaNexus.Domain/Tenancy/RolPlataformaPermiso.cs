namespace KallpaNexus.Domain.Tenancy;

public class RolPlataformaPermiso
{
    public Guid RolPlataformaId { get; set; }
    public RolPlataforma RolPlataforma { get; set; } = null!;
    public Guid PermisoId { get; set; }
    public Permiso Permiso { get; set; } = null!;
}
