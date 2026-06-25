namespace KallpaNexus.Domain.Tenancy;

/// <summary>
/// Usuario interno de Kallpa Nexus (superadmin y equipo de soporte/comercial).
/// </summary>
public class UsuarioPlataforma
{
    public Guid Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public Guid RolPlataformaId { get; set; }
    public RolPlataforma RolPlataforma { get; set; } = null!;
    public bool Activo { get; set; } = true;
    /// <summary>Solo visible y gestionable por quien tiene permiso platform:usuarios:ocultos (SuperAdmin).</summary>
    public bool Oculto { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
