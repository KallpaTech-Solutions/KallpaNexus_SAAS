namespace KallpaNexus.Domain.Integraciones;

/// <summary>
/// Persona identificada por DNI en todo el ecosistema (clientes, staff con DNI, consultas RENIEC).
/// Datos completos en BD; cada módulo expone solo lo que necesita vía API.
/// </summary>
public class Persona
{
    public string NumeroDocumento { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string FirstLastName { get; set; } = string.Empty;
    public string SecondLastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string FuenteUltimaActualizacion { get; set; } = "";
    public DateTime ConsultadoReniecEnUtc { get; set; }
    public DateTime ActualizadoEnUtc { get; set; }
    public string? PayloadJson { get; set; }
}
