namespace KallpaNexus.Domain.Integraciones;

public class ConsultaSunatRucCache
{
    public string NumeroRuc { get; set; } = string.Empty;
    public string RazonSocial { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string Condicion { get; set; } = string.Empty;
    public string Direccion { get; set; } = string.Empty;
    public string Distrito { get; set; } = string.Empty;
    public string Provincia { get; set; } = string.Empty;
    public string Departamento { get; set; } = string.Empty;
    public bool EsDatosCompletos { get; set; }
    public DateTime ConsultadoEnUtc { get; set; }
    public string? PayloadBasicoJson { get; set; }
    public string? PayloadCompletoJson { get; set; }
}
