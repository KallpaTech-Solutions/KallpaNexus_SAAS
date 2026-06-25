using System.Security.Claims;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Tenancy;

/// <summary>
/// Limita consultas operativas a las sucursales que el staff puede ver (no confiar solo en query params).
/// </summary>
public class TenantStaffSucursalScopeService
{
    private readonly ApplicationDbContext _appDb;
    private readonly TenantStaffSucursalService _staffSucursales;

    public TenantStaffSucursalScopeService(
        ApplicationDbContext appDb,
        TenantStaffSucursalService staffSucursales)
    {
        _appDb = appDb;
        _staffSucursales = staffSucursales;
    }

    public async Task<(IQueryable<Reserva>? Query, TenantStaffSucursalScopeError? Error)> AplicarAlcanceReservasAsync(
        ClaimsPrincipal user,
        IQueryable<Reserva> query,
        Guid? sucursalIdSolicitada,
        CancellationToken ct = default)
    {
        var (permitidas, accesoTodas, error) = await ResolverPermitidasAsync(user, ct);
        if (error != null)
        {
            return (null, error);
        }

        return await AplicarFiltro(query, sucursalIdSolicitada, permitidas!, accesoTodas, r => r.SucursalId, ct);
    }

    public Task<(List<Guid>? Permitidas, bool AccesoTodas, TenantStaffSucursalScopeError? Error)>
        ResolverSucursalesStaffAsync(ClaimsPrincipal user, CancellationToken ct = default) =>
        ResolverPermitidasAsync(user, ct);

    public async Task<(IQueryable<TarifaCancha>? Query, TenantStaffSucursalScopeError? Error)> AplicarAlcanceTarifasAsync(
        ClaimsPrincipal user,
        IQueryable<TarifaCancha> query,
        Guid? sucursalIdSolicitada,
        CancellationToken ct = default)
    {
        var (permitidas, accesoTodas, error) = await ResolverPermitidasAsync(user, ct);
        if (error != null)
        {
            return (null, error);
        }

        return await AplicarFiltro(query, sucursalIdSolicitada, permitidas!, accesoTodas, t => t.SucursalId, ct);
    }

    public async Task<(IQueryable<Cancha>? Query, TenantStaffSucursalScopeError? Error)> AplicarAlcanceCanchasAsync(
        ClaimsPrincipal user,
        IQueryable<Cancha> query,
        Guid? sucursalIdSolicitada,
        CancellationToken ct = default)
    {
        var (permitidas, accesoTodas, error) = await ResolverPermitidasAsync(user, ct);
        if (error != null)
        {
            return (null, error);
        }

        return await AplicarFiltro(query, sucursalIdSolicitada, permitidas!, accesoTodas, c => c.SucursalId, ct);
    }

    private async Task<(List<Guid>? Permitidas, bool AccesoTodas, TenantStaffSucursalScopeError? Error)> ResolverPermitidasAsync(
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var staffId = ObtenerStaffId(user);
        if (staffId == null)
        {
            return (null, false, new TenantStaffSucursalScopeError(
                "NoAutenticado",
                "Sesión de personal inválida.",
                401));
        }

        var (sucursales, accesoTodas) = await _staffSucursales.ResolverAccesoAsync(staffId.Value, ct);
        var permitidas = sucursales.Select(s => s.Id).ToList();

        if (!accesoTodas && permitidas.Count == 0)
        {
            return (null, false, new TenantStaffSucursalScopeError(
                "SinSucursal",
                "Tu usuario no tiene sede asignada.",
                403));
        }

        return (permitidas, accesoTodas, null);
    }

    private async Task<(IQueryable<T>? Query, TenantStaffSucursalScopeError? Error)> AplicarFiltro<T>(
        IQueryable<T> query,
        Guid? sucursalIdSolicitada,
        List<Guid> permitidas,
        bool accesoTodas,
        System.Linq.Expressions.Expression<Func<T, Guid>> sucursalId,
        CancellationToken ct)
    {
        if (!accesoTodas)
        {
            if (sucursalIdSolicitada.HasValue)
            {
                if (!permitidas.Contains(sucursalIdSolicitada.Value))
                {
                    return (null, new TenantStaffSucursalScopeError(
                        "Prohibido",
                        "No tienes acceso a esa sucursal.",
                        403));
                }

                query = query.Where(BuildEquals(sucursalId, sucursalIdSolicitada.Value));
            }
            else
            {
                query = query.Where(BuildContains(sucursalId, permitidas));
            }

            return (query, null);
        }

        if (!sucursalIdSolicitada.HasValue)
        {
            // Gerente sin filtro: todas las sedes del tenant (p. ej. pendientes web globales).
            return (query, null);
        }

        var ok = await _appDb.Sucursales.AsNoTracking()
            .AnyAsync(s => s.Id == sucursalIdSolicitada.Value && s.Activa, ct);
        if (!ok)
        {
            return (null, new TenantStaffSucursalScopeError(
                "SucursalInvalida",
                "La sucursal indicada no existe o está inactiva.",
                400));
        }

        query = query.Where(BuildEquals(sucursalId, sucursalIdSolicitada.Value));
        return (query, null);
    }

    /// <summary>Comprueba que el staff puede operar en la sucursal de la cancha.</summary>
    public async Task<TenantStaffSucursalScopeError?> ValidarAccesoCanchaAsync(
        ClaimsPrincipal user,
        Guid canchaId,
        CancellationToken ct = default)
    {
        var sucursalId = await _appDb.Canchas.AsNoTracking()
            .Where(c => c.Id == canchaId)
            .Select(c => (Guid?)c.SucursalId)
            .FirstOrDefaultAsync(ct);
        if (sucursalId == null)
        {
            return new TenantStaffSucursalScopeError(
                "NoEncontrado",
                "La cancha no existe en tu cuenta.",
                404);
        }

        return await ValidarAccesoSucursalAsync(user, sucursalId.Value, ct);
    }

    public async Task<TenantStaffSucursalScopeError?> ValidarAccesoSucursalAsync(
        ClaimsPrincipal user,
        Guid sucursalId,
        CancellationToken ct = default)
    {
        var (permitidas, accesoTodas, error) = await ResolverPermitidasAsync(user, ct);
        if (error != null)
        {
            return error;
        }

        if (!accesoTodas && !permitidas!.Contains(sucursalId))
        {
            return new TenantStaffSucursalScopeError(
                "Prohibido",
                "No tienes acceso a esa sucursal.",
                403);
        }

        var activa = await _appDb.Sucursales.AsNoTracking()
            .AnyAsync(s => s.Id == sucursalId && s.Activa, ct);
        if (!activa)
        {
            return new TenantStaffSucursalScopeError(
                "SucursalInvalida",
                "La sucursal indicada no existe o está inactiva.",
                400);
        }

        return null;
    }

    private static Guid? ObtenerStaffId(ClaimsPrincipal user)
    {
        var raw = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private static System.Linq.Expressions.Expression<Func<T, bool>> BuildEquals<T>(
        System.Linq.Expressions.Expression<Func<T, Guid>> selector,
        Guid id)
    {
        var param = selector.Parameters[0];
        var body = System.Linq.Expressions.Expression.Equal(
            selector.Body,
            System.Linq.Expressions.Expression.Constant(id));
        return System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(body, param);
    }

    private static System.Linq.Expressions.Expression<Func<T, bool>> BuildContains<T>(
        System.Linq.Expressions.Expression<Func<T, Guid>> selector,
        List<Guid> ids)
    {
        var param = selector.Parameters[0];
        var contains = System.Linq.Expressions.Expression.Call(
            typeof(Enumerable),
            nameof(Enumerable.Contains),
            [typeof(Guid)],
            System.Linq.Expressions.Expression.Constant(ids),
            selector.Body);
        return System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(contains, param);
    }
}
