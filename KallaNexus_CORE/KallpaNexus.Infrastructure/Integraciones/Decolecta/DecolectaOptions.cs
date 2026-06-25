namespace KallpaNexus.Infrastructure.Integraciones.Decolecta;

public class DecolectaOptions
{
    public const string SectionName = "Decolecta";
    public string BaseUrl { get; set; } = "https://api.decolecta.com";
    public string ApiKey { get; set; } = "";
}
