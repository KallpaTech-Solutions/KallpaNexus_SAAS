using KallpaNexus.Application.Tenancy;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Tenancy;

public sealed class SuscripcionCheck
{
    public bool Ok { get; init; }
    public string? Codigo { get; init; }
    public string? Mensaje { get; init; }

    public static SuscripcionCheck Success() => new() { Ok = true };

    public static SuscripcionCheck Fail(string codigo, string mensaje) =>
        new() { Ok = false, Codigo = codigo, Mensaje = mensaje };
}

public class TenantSuscripcionService
{
    private readonly MasterDbContext _masterDb;
    private readonly ApplicationDbContext _appDb;
    private readonly ITenantProvider _tenantProvider;

    public TenantSuscripcionService(
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ITenantProvider tenantProvider)
    {
        _masterDb = masterDb;
        _appDb = appDb;
        _tenantProvider = tenantProvider;
    }

    public async Task<ClienteEmpresa?> ObtenerEmpresaActualAsync(CancellationToken ct = default)
    {
        var tenantId = _tenantProvider.GetTenantId();
        if (!tenantId.HasValue)
        {
            return null;
        }

        var tenant = await _masterDb.Tenants
            .AsNoTracking()
            .Include(t => t.ClienteEmpresa)
            .ThenInclude(c => c.PlanSaaS)
            .FirstOrDefaultAsync(t => t.Id == tenantId.Value, ct);

        return tenant?.ClienteEmpresa;
    }

    public async Task<int> ContarSucursalesTenantAsync(CancellationToken ct = default) =>
        await _appDb.Sucursales.CountAsync(ct);

    public async Task<int> ContarStaffEmpresaAsync(CancellationToken ct = default)
    {
        var empresa = await ObtenerEmpresaActualAsync(ct);
        if (empresa == null)
        {
            return 0;
        }

        var tenantIds = await _masterDb.Tenants
            .AsNoTracking()
            .Where(t => t.ClienteEmpresaId == empresa.Id)
            .Select(t => t.Id)
            .ToListAsync(ct);

        if (tenantIds.Count == 0)
        {
            return 0;
        }

        return await _appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .CountAsync(u => tenantIds.Contains(u.TenantId), ct);
    }

    public SuscripcionCheck ValidarEstadoOperacion(ClienteEmpresa empresa)
    {
        if (empresa.PlanSaaS == null)
        {
            return SuscripcionCheck.Fail("SinPlan", "Plan no configurado.");
        }

        if (PlanSaaSCicloHelper.CicloVencido(empresa.ProximoPago))
        {
            return SuscripcionCheck.Fail(
                "CicloVencido",
                "Tu plan venció. Ve a «Plan» para renovar o contratar.");
        }

        return empresa.Estado switch
        {
            EstadoSuscripcion.Activo or EstadoSuscripcion.Demo => SuscripcionCheck.Success(),
            EstadoSuscripcion.Cancelado => SuscripcionCheck.Success(),
            EstadoSuscripcion.Suspendido => SuscripcionCheck.Fail(
                "SuscripcionSuspendida",
                "La suscripción está suspendida. Contacta a soporte o reactiva tu plan."),
            _ => SuscripcionCheck.Fail("SuscripcionInvalida", "Estado de suscripción no válido.")
        };
    }

    public async Task<SuscripcionCheck> ValidarPuedeAgregarSucursalAsync(CancellationToken ct = default)
    {
        var empresa = await ObtenerEmpresaActualAsync(ct);
        if (empresa?.PlanSaaS == null)
        {
            return SuscripcionCheck.Fail("SinEmpresa", "No se encontró la empresa asociada al negocio.");
        }

        var estado = ValidarEstadoOperacion(empresa);
        if (!estado.Ok)
        {
            return estado;
        }

        var limite = EmpresaLimitesHelper.LimiteSucursalesPorNegocio(empresa);
        if (limite <= 0)
        {
            return SuscripcionCheck.Success();
        }

        var uso = await ContarSucursalesTenantAsync(ct);
        if (uso >= limite)
        {
            return SuscripcionCheck.Fail(
                "LimiteSucursales",
                $"Tu plan «{empresa.PlanSaaS.Nombre}» permite hasta {limite} sucursal(es) en este negocio. " +
                $"Tienes {uso}. Cambia de plan o elimina una sucursal.");
        }

        return SuscripcionCheck.Success();
    }

    public async Task<SuscripcionCheck> ValidarPuedeAgregarStaffAsync(CancellationToken ct = default)
    {
        var empresa = await ObtenerEmpresaActualAsync(ct);
        if (empresa?.PlanSaaS == null)
        {
            return SuscripcionCheck.Fail("SinEmpresa", "No se encontró la empresa asociada al negocio.");
        }

        var estado = ValidarEstadoOperacion(empresa);
        if (!estado.Ok)
        {
            return estado;
        }

        var limite = EmpresaLimitesHelper.LimiteUsuariosStaff(empresa);
        if (limite <= 0)
        {
            return SuscripcionCheck.Success();
        }

        var uso = await ContarStaffEmpresaAsync(ct);
        if (uso >= limite)
        {
            return SuscripcionCheck.Fail(
                "LimiteUsuariosStaff",
                $"Tu plan «{empresa.PlanSaaS.Nombre}» permite hasta {limite} usuario(s) staff en total. " +
                $"Tienes {uso}. Cambia de plan o desactiva un usuario.");
        }

        return SuscripcionCheck.Success();
    }

    public async Task<int> ContarCanchasTenantAsync(CancellationToken ct = default) =>
        await _appDb.Canchas.CountAsync(c => c.EstaActiva, ct);

    public async Task<SuscripcionCheck> ValidarPuedeAgregarCanchaAsync(CancellationToken ct = default)
    {
        var empresa = await ObtenerEmpresaActualAsync(ct);
        if (empresa?.PlanSaaS == null)
        {
            return SuscripcionCheck.Fail("SinEmpresa", "No se encontró la empresa asociada al negocio.");
        }

        var estado = ValidarEstadoOperacion(empresa);
        if (!estado.Ok)
        {
            return estado;
        }

        var limite = EmpresaLimitesHelper.LimiteCanchasPorNegocio(empresa);
        if (limite <= 0)
        {
            return SuscripcionCheck.Success();
        }

        var uso = await ContarCanchasTenantAsync(ct);
        if (uso >= limite)
        {
            return SuscripcionCheck.Fail(
                "LimiteCanchas",
                $"Tu contrato permite hasta {limite} cancha(s) activa(s) en este negocio. " +
                $"Tienes {uso}. Contacta a Kallpa Nexus para ampliar el límite.");
        }

        return SuscripcionCheck.Success();
    }
}
