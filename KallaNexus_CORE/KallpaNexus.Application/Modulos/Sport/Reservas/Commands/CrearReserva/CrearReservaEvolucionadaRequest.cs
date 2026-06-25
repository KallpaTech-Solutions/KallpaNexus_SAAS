namespace KallpaNexus.Application.Modulos.Sport.Reservas.Commands.CrearReserva;

public class CrearReservaEvolucionadaRequest
{
    public Guid CanchaId { get; set; }
    public string DniCliente { get; set; } = string.Empty;
    public string NombreCompletoCliente { get; set; } = string.Empty;
    public string TelefonoCliente { get; set; } = string.Empty;
    /// <summary>Sin celular (SN) — solo mostrador / personal.</summary>
    public bool SinTelefonoCliente { get; set; }
    public string? EmailCliente { get; set; }
    /// <summary>Hora civil Lima, ej. 2026-06-08T16:00 o 2026-06-08T16:00:00.</summary>
    public string HoraInicio { get; set; } = string.Empty;
    public int DuracionHoras { get; set; } = 1;
    public string? Observaciones { get; set; }
    /// <summary>Monto final cobrado (descuento cliente frecuente). Si no se envía, se calcula por tarifa.</summary>
    public decimal? MontoTotalCobrado { get; set; }
    /// <summary>Pendiente, Confirmada (pagado), etc. Por defecto Pendiente.</summary>
    public string? Estado { get; set; }
}
