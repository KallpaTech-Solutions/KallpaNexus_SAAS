using System.Security.Claims;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Platform;

public class PlatformRbacService
{
    private readonly MasterDbContext _masterDb;

    public PlatformRbacService(MasterDbContext masterDb)
    {
        _masterDb = masterDb;
    }

    public async Task<IReadOnlyList<string>> ObtenerPermisosUsuarioAsync(Guid usuarioPlataformaId)
    {
        return await _masterDb.UsuariosPlataforma
            .Where(u => u.Id == usuarioPlataformaId && u.Activo)
            .SelectMany(u => u.RolPlataforma.Permisos.Select(rp => rp.Permiso.Codigo))
            .Distinct()
            .ToListAsync();
    }

    public async Task<Guid?> ObtenerRolIdPorCodigoAsync(string codigoRol) =>
        await _masterDb.RolesPlataforma
            .Where(r => r.Codigo == codigoRol)
            .Select(r => (Guid?)r.Id)
            .FirstOrDefaultAsync();

    public async Task<RolPlataforma?> ObtenerRolPorIdAsync(Guid rolId) =>
        await _masterDb.RolesPlataforma.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rolId);

    public int ObtenerNivelDesdeClaims(ClaimsPrincipal user) =>
        int.TryParse(user.FindFirst(AuthClaims.RolNivel)?.Value, out var nivel) ? nivel : 0;

    public Guid? ObtenerUsuarioIdDesdeClaims(ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    public bool TienePermiso(ClaimsPrincipal user, string permiso) =>
        user.FindAll(AuthClaims.Permiso).Any(c => c.Value == permiso);

    public bool PuedeVerUsuariosOcultos(ClaimsPrincipal user) =>
        TienePermiso(user, PermisosApp.PlatformUsuariosOcultosGestionar);

    /// <summary>Solo puede asignar roles con nivel estrictamente menor al suyo.</summary>
    public bool PuedeAsignarRol(int nivelUsuarioActual, int nivelRolObjetivo) =>
        nivelUsuarioActual > nivelRolObjetivo;

    public async Task<bool> EsSuperAdminAsync(Guid usuarioId, CancellationToken ct = default) =>
        await _masterDb.UsuariosPlataforma.AnyAsync(
            u => u.Id == usuarioId && u.Activo &&
                 u.RolPlataforma.Codigo == nameof(RolPlataformaCodigo.SuperAdmin),
            ct);

    public async Task<int> ContarSuperAdminsActivosExceptoAsync(Guid exceptoUsuarioId, CancellationToken ct = default) =>
        await _masterDb.UsuariosPlataforma.CountAsync(
            u => u.Activo && u.Id != exceptoUsuarioId &&
                 u.RolPlataforma.Codigo == nameof(RolPlataformaCodigo.SuperAdmin),
            ct);

    public IQueryable<UsuarioPlataforma> QueryUsuariosVisibles(ClaimsPrincipal user)
    {
        var query = _masterDb.UsuariosPlataforma.Include(u => u.RolPlataforma).AsQueryable();
        if (!PuedeVerUsuariosOcultos(user))
        {
            query = query.Where(u => !u.Oculto);
        }

        return query;
    }
}
