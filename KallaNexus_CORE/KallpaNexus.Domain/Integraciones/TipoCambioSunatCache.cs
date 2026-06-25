namespace KallpaNexus.Domain.Integraciones;

public class TipoCambioSunatCache
{
    public DateOnly Fecha { get; set; }
    public string BuyPrice { get; set; } = string.Empty;
    public string SellPrice { get; set; } = string.Empty;
    public string BaseCurrency { get; set; } = "USD";
    public string QuoteCurrency { get; set; } = "PEN";
    public DateTime ConsultadoEnUtc { get; set; }
}
