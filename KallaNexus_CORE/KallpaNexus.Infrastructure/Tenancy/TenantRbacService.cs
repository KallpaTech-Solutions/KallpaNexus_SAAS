using System.Security.Claims;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Tenancy;

public class TenantRbacService
{
    private readonly ApplicationDbContext _appDb;
    private readonly ITenantProvider _tenantProvider;

    public TenantRbacService(ApplicationDbContext appDb, ITenantProvider tenantProvider)
    {
        _appDb = appDb;
        _tenantProvider = tenantProvider;
    }

    public async Task<IReadOnlyList<string>> ObtenerPermisosStaffAsync(Guid usuarioStaffId) =>
        await _appDb.UsuariosStaff
            .Where(u => u.Id == usuarioStaffId && u.Activo)
            .SelectMany(u => u.RolTenant.Permisos.Select(p => p.PermisoCodigo))
            .Distinct()
            .ToListAsync();

    public int ObtenerNivelDesdeClaims(ClaimsPrincipal user) =>
        int.TryParse(user.FindFirst(AuthClaims.RolNivel)?.Value, out var nivel) ? nivel : 0;

    public bool TienePermiso(ClaimsPrincipal user, string permiso) =>
        user.FindAll(AuthClaims.Permiso).Any(c => c.Value == permiso);

    public bool PuedeAsignarRol(int nivelCaller, int nivelRolObjetivo) =>
        nivelCaller > nivelRolObjetivo;

    public bool TokenCoincideConTenantActual(ClaimsPrincipal user)
    {
        var tenantId = _tenantProvider.GetTenantId();
        if (!tenantId.HasValue)
        {
            return false;
        }

        var claim = user.FindFirst(AuthClaims.TenantId)?.Value;
        return Guid.TryParse(claim, out var tid) && tid == tenantId.Value;
    }

    public async Task<RolTenant?> ObtenerRolPorIdAsync(Guid rolId) =>
        await _appDb.RolesTenant.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rolId);
}
