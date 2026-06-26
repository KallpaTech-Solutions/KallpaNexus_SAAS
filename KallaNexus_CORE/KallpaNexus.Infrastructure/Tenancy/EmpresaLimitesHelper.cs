using KallpaNexus.Domain.Tenancy;

namespace KallpaNexus.Infrastructure.Tenancy;

public static class EmpresaLimitesHelper
{
    /// <summary>0 = sin tope (ilimitado).</summary>
    public static int LimiteSucursalesPorNegocio(ClienteEmpresa empresa) =>
        empresa.LimiteSucursalesOverride ?? empresa.PlanSaaS?.LimiteSucursales ?? 0;

    public static int LimiteUsuariosStaff(ClienteEmpresa empresa) =>
        empresa.LimiteUsuariosStaffOverride ?? empresa.PlanSaaS?.LimiteUsuariosStaff ?? 0;

    public static int LimiteCanchasPorNegocio(ClienteEmpresa empresa) =>
        empresa.LimiteCanchasOverride ?? empresa.PlanSaaS?.LimiteCanchas ?? 0;

    public static decimal PrecioMensualFacturacion(ClienteEmpresa empresa) =>
        empresa.PrecioMensualAcordado ?? empresa.PlanSaaS?.PrecioMensual ?? 0;

    /// <summary>Tras cambiar de plan (contrato aprobado o asignación admin), vuelve a los límites del catálogo.</summary>
    public static void RestablecerOverridesAlPlan(ClienteEmpresa empresa) =>
        empresa.RestablecerLimitesPersonalizados();
}
