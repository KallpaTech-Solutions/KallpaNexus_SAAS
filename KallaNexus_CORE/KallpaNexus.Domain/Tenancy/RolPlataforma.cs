namespace KallpaNexus.Domain.Tenancy;

/// <summary>
/// Rol dinámico de plataforma (saco de permisos en BD).
/// </summary>
public class RolPlataforma
{
    public Guid Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    /// <summary>Jerarquía: mayor número = más privilegios. Solo puede crear/gestionar roles con nivel menor al suyo.</summary>
    public int Nivel { get; set; }
    public bool EsSistema { get; set; }
    public ICollection<RolPlataformaPermiso> Permisos { get; set; } = [];
    public ICollection<UsuarioPlataforma> Usuarios { get; set; } = [];
}
