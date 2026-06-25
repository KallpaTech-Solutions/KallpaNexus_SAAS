using KallpaNexus.Domain.Modulos.Sport.Entities;

namespace KallpaNexus.Application.Modulos.Sport.Common;

public static class SportTarifaMatcher
{
    public static TarifaCancha? BuscarTarifa(
        IEnumerable<TarifaCancha> tarifas,
        int horaLocal,
        bool esFinDeSemana) =>
        tarifas.FirstOrDefault(t =>
            t.Activa &&
            horaLocal >= t.HoraInicio &&
            horaLocal < t.HoraFin &&
            ((esFinDeSemana && t.AplicaFinDeSemana) ||
             (!esFinDeSemana && t.AplicaLunesAViernes)));
}
