namespace KallpaNexus.Domain.Tenancy;

/// <summary>
/// Cuenta global del usuario final (B2C) en el ecosistema Kallpa Nexus.
/// </summary>
public class UsuarioConsumidor
{
    public Guid Id { get; set; }
    public string Dni { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
