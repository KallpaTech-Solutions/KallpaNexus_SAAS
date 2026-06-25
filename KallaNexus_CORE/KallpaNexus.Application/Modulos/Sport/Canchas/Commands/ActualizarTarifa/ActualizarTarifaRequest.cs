namespace KallpaNexus.Application.Modulos.Sport.Canchas.Commands.ActualizarTarifa;

public class ActualizarTarifaRequest
{
    public string? Nombre { get; set; }
    public int? HoraInicio { get; set; }
    public int? HoraFin { get; set; }
    public bool? AplicaLunesAViernes { get; set; }
    public bool? AplicaFinDeSemana { get; set; }
    public decimal? PrecioPorHora { get; set; }
    public bool? Activa { get; set; }
}
