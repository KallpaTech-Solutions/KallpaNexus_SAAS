using KallpaNexus.Domain.Modulos.Sport.Enums;

namespace KallpaNexus.Application.Modulos.Sport.Canchas.Commands.ActualizarCancha;

public class ActualizarCanchaRequest
{
    public Guid? SucursalId { get; set; }
    public string? Nombre { get; set; }
    public TipoCancha? Tipo { get; set; }
    public bool? TieneIluminacion { get; set; }
    public bool? EstaActiva { get; set; }
}
