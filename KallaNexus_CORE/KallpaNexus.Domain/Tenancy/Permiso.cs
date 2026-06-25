namespace KallpaNexus.Domain.Tenancy;

/// <summary>
/// Permiso atómico del catálogo (código alineado con <see cref="Common.PermisosApp"/>).
/// </summary>
public class Permiso
{
    public Guid Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Modulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public ICollection<RolPlataformaPermiso> Roles { get; set; } = [];
}
