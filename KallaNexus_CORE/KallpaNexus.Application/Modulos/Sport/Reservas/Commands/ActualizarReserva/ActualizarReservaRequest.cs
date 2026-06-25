using KallpaNexus.Domain.Modulos.Sport.Enums;

namespace KallpaNexus.Application.Modulos.Sport.Reservas.Commands.ActualizarReserva;

public class ActualizarReservaRequest
{
    public EstadoReserva? Estado { get; set; }
    public string? NombreCompletoCliente { get; set; }
    public string? TelefonoCliente { get; set; }
    public bool? SinTelefonoCliente { get; set; }
    public string? EmailCliente { get; set; }
    public string? Observaciones { get; set; }
    /// <summary>Hora civil Lima (2026-06-08T16:00).</summary>
    public string? HoraInicio { get; set; }
    public int? DuracionHoras { get; set; }
    /// <summary>Override del monto cobrado (ingresos reales).</summary>
    public decimal? MontoTotalCobrado { get; set; }
}
