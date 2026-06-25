using KallpaNexus.Domain.Modulos.Sport.Entities;

namespace KallpaNexus.Application.Modulos.Sport.Common;

public sealed class CotizacionReservaResult
{
    public bool Exito { get; init; }
    public decimal MontoTotal { get; init; }
    public string? Mensaje { get; init; }
    public IReadOnlyList<CotizacionHoraDetalle> Detalle { get; init; } = [];
}

public sealed class CotizacionHoraDetalle
{
    public int HoraLocal { get; init; }
    public string TarifaNombre { get; init; } = "";
    public decimal PrecioPorHora { get; init; }
}

public static class SportTarifaCalculator
{
    public static CotizacionReservaResult Cotizar(
        IEnumerable<TarifaCancha> tarifas,
        DateTime limaInicio,
        int duracionHoras)
    {
        if (duracionHoras < 1)
        {
            return new CotizacionReservaResult
            {
                Exito = false,
                Mensaje = "La duración debe ser al menos 1 hora."
            };
        }

        var detalle = new List<CotizacionHoraDetalle>();
        decimal total = 0;

        for (var i = 0; i < duracionHoras; i++)
        {
            var instante = limaInicio.AddHours(i);
            var esFin = SportTimeHelper.EsFinDeSemana(instante);
            var tarifa = SportTarifaMatcher.BuscarTarifa(tarifas, instante.Hour, esFin);
            if (tarifa == null)
            {
                return new CotizacionReservaResult
                {
                    Exito = false,
                    Mensaje =
                        $"No hay tarifa para las {instante.Hour:00}:00 (hora {i + 1} de {duracionHoras}). Asigna tarifas en el catálogo."
                };
            }

            detalle.Add(new CotizacionHoraDetalle
            {
                HoraLocal = instante.Hour,
                TarifaNombre = tarifa.Nombre,
                PrecioPorHora = tarifa.PrecioPorHora
            });
            total += tarifa.PrecioPorHora;
        }

        return new CotizacionReservaResult
        {
            Exito = true,
            MontoTotal = total,
            Detalle = detalle
        };
    }
}
