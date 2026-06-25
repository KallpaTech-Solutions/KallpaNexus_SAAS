using KallpaNexus.Domain.Tenancy;

namespace KallpaNexus.Application.Tenancy;

public static class PlanSaaSCicloHelper
{
    public const int DiasDemoPorDefecto = 30;

    public static bool EsPlanDemo(PlanSaaS plan) => plan.PrecioMensual <= 0;

    public static int DiasDemoEfectivos(PlanSaaS plan) =>
        plan.DiasDuracionDemo is > 0 and <= 365 ? plan.DiasDuracionDemo.Value : DiasDemoPorDefecto;

    public static DateTime CalcularFinCiclo(PlanSaaS plan, DateTime desdeUtc)
    {
        var baseDate = desdeUtc.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(desdeUtc, DateTimeKind.Utc)
            : desdeUtc.ToUniversalTime();

        return EsPlanDemo(plan)
            ? baseDate.Date.AddDays(DiasDemoEfectivos(plan))
            : baseDate.Date.AddMonths(1);
    }

    public static void AplicarCicloTrasContrato(ClienteEmpresa empresa, PlanSaaS plan, DateTime? desdeUtc = null)
    {
        var desde = desdeUtc ?? DateTime.UtcNow;
        empresa.PlanSaaSId = plan.Id;
        empresa.ProximoPago = CalcularFinCiclo(plan, desde);
        empresa.Estado = EsPlanDemo(plan) ? EstadoSuscripcion.Demo : EstadoSuscripcion.Activo;
    }

    /// <summary>Días hasta fin de demo o próxima renovación mensual (0 = vence hoy, negativo = vencido).</summary>
    public static int DiasRestantesHastaFinCiclo(DateTime proximoPagoUtc, DateTime? ahoraUtc = null)
    {
        var fin = proximoPagoUtc.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(proximoPagoUtc, DateTimeKind.Utc)
            : proximoPagoUtc.ToUniversalTime();
        var hoy = (ahoraUtc ?? DateTime.UtcNow).ToUniversalTime().Date;
        return (fin.Date - hoy).Days;
    }

    public static string EtiquetaTipoCiclo(PlanSaaS plan) =>
        EsPlanDemo(plan) ? "Demo" : "Mensual";

    public static bool CicloVencido(DateTime proximoPagoUtc, DateTime? ahoraUtc = null) =>
        DiasRestantesHastaFinCiclo(proximoPagoUtc, ahoraUtc) < 0;

    /// <summary>Panel operativo (no solo Plan): ciclo vigente y no suspendido.</summary>
    public static bool AccesoPanelCompleto(ClienteEmpresa empresa)
    {
        if (empresa.PlanSaaS == null || CicloVencido(empresa.ProximoPago))
        {
            return false;
        }

        return empresa.Estado is EstadoSuscripcion.Activo
            or EstadoSuscripcion.Demo
            or EstadoSuscripcion.Cancelado;
    }

    public static bool SoloPaginaPlan(ClienteEmpresa empresa) =>
        empresa.PlanSaaS != null && CicloVencido(empresa.ProximoPago);

    public static bool CancelacionConAccesoHastaFinCiclo(ClienteEmpresa empresa) =>
        empresa.Estado == EstadoSuscripcion.Cancelado && !CicloVencido(empresa.ProximoPago);

    public static EstadoSuscripcion RestaurarEstadoTrasReactivacion(PlanSaaS plan) =>
        EsPlanDemo(plan) ? EstadoSuscripcion.Demo : EstadoSuscripcion.Activo;
}
