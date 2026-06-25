using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Tenancy;

public record StaffSucursalAccesoDto(Guid Id, string Nombre);

public class TenantStaffSucursalService
{
    private readonly ApplicationDbContext _appDb;

    public TenantStaffSucursalService(ApplicationDbContext appDb)
    {
        _appDb = appDb;
    }

    public async Task<(IReadOnlyList<StaffSucursalAccesoDto> Sucursales, bool AccesoTodas)> ResolverAccesoAsync(
        Guid staffId,
        CancellationToken ct = default)
    {
        var usuario = await _appDb.UsuariosStaff
            .AsNoTracking()
            .Include(u => u.RolTenant)
            .FirstOrDefaultAsync(u => u.Id == staffId, ct);

        if (usuario == null)
        {
            return (Array.Empty<StaffSucursalAccesoDto>(), false);
        }

        var esGerente = usuario.RolTenant.Codigo == nameof(RolTenantCodigo.Gerente);
        if (esGerente)
        {
            var todas = await ListarSucursalesActivasTenantAsync(ct);
            return (todas, true);
        }

        var asignadas = await (
            from link in _appDb.UsuariosStaffSucursales.AsNoTracking()
            join s in _appDb.Sucursales.AsNoTracking() on link.SucursalId equals s.Id
            where link.UsuarioStaffId == staffId && s.Activa
            orderby s.Nombre
            select new StaffSucursalAccesoDto(s.Id, s.Nombre)
        ).ToListAsync(ct);

        return (asignadas, false);
    }

    public async Task AsignarSucursalesAsync(
        Guid staffId,
        IReadOnlyList<Guid> sucursalIds,
        bool esGerente,
        CancellationToken ct = default)
    {
        var existentes = await _appDb.UsuariosStaffSucursales
            .Where(x => x.UsuarioStaffId == staffId)
            .ToListAsync(ct);
        _appDb.UsuariosStaffSucursales.RemoveRange(existentes);

        if (esGerente || sucursalIds.Count == 0)
        {
            await _appDb.SaveChangesAsync(ct);
            return;
        }

        var validas = await _appDb.Sucursales
            .Where(s => sucursalIds.Contains(s.Id) && s.Activa)
            .Select(s => s.Id)
            .ToListAsync(ct);

        foreach (var sid in validas.Distinct())
        {
            _appDb.UsuariosStaffSucursales.Add(new UsuarioStaffSucursal
            {
                UsuarioStaffId = staffId,
                SucursalId = sid
            });
        }

        await _appDb.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<StaffSucursalAccesoDto>> ListarSucursalesActivasTenantAsync(
        CancellationToken ct = default) =>
        await _appDb.Sucursales
            .AsNoTracking()
            .Where(s => s.Activa)
            .OrderBy(s => s.Nombre)
            .Select(s => new StaffSucursalAccesoDto(s.Id, s.Nombre))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<StaffSucursalAccesoDto>> ListarAsignadasStaffAsync(
        Guid staffId,
        CancellationToken ct = default) =>
        await (
            from link in _appDb.UsuariosStaffSucursales.AsNoTracking()
            join s in _appDb.Sucursales.AsNoTracking() on link.SucursalId equals s.Id
            where link.UsuarioStaffId == staffId
            orderby s.Nombre
            select new StaffSucursalAccesoDto(s.Id, s.Nombre)
        ).ToListAsync(ct);
}
