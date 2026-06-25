using KallpaNexus.Domain.Common;

using KallpaNexus.Domain.Modulos.Sport.Tenancy;

using KallpaNexus.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;



namespace KallpaNexus.Infrastructure.Tenancy;



public static class TenantRbacSeeder

{

    /// <summary>

    /// Roles de sistema (Gerente, Cajero) por negocio/tenant. Cada club tiene su propia fila en RolesTenant.

    /// </summary>

    public static async Task SeedRolesInicialesAsync(ApplicationDbContext appDb, Guid tenantId)

    {

        await AsegurarRolGerenteAsync(appDb, tenantId);

        await AsegurarRolCajeroAsync(appDb, tenantId);

    }



    private static async Task AsegurarRolGerenteAsync(ApplicationDbContext appDb, Guid tenantId)

    {

        var codigo = nameof(RolTenantCodigo.Gerente);

        var existe = await appDb.RolesTenant

            .IgnoreQueryFilters()

            .AnyAsync(r => r.TenantId == tenantId && r.Codigo == codigo);



        if (existe)
        {
            await SincronizarPermisosRolSistemaAsync(appDb, tenantId, codigo, PermisosApp.TodosSport);
            return;
        }

        var gerente = new RolTenant

        {

            TenantId = tenantId,

            Codigo = codigo,

            Nombre = "Gerente",

            Nivel = (int)RolTenantCodigo.Gerente,

            EsSistema = true

        };

        appDb.RolesTenant.Add(gerente);

        await appDb.SaveChangesAsync();



        foreach (var permiso in PermisosApp.TodosSport)

        {

            appDb.RolesTenantPermisos.Add(new RolTenantPermiso

            {

                RolTenantId = gerente.Id,

                PermisoCodigo = permiso

            });

        }



        await appDb.SaveChangesAsync();

    }



    private static async Task AsegurarRolCajeroAsync(ApplicationDbContext appDb, Guid tenantId)

    {

        var codigo = nameof(RolTenantCodigo.Cajero);

        var existe = await appDb.RolesTenant

            .IgnoreQueryFilters()

            .AnyAsync(r => r.TenantId == tenantId && r.Codigo == codigo);



        var permisoCajero = new[]
        {
            PermisosApp.CanchasVer,
            PermisosApp.ReservasVer,
            PermisosApp.ReservasCrear,
            PermisosApp.VentasVer,
            PermisosApp.VentasCrear,
            PermisosApp.ComprasVer,
            PermisosApp.EgresosVer,
            PermisosApp.EgresosCrear,
        };

        if (existe)
        {
            await SincronizarPermisosRolSistemaAsync(appDb, tenantId, codigo, permisoCajero);
            return;
        }

        var cajero = new RolTenant

        {

            TenantId = tenantId,

            Codigo = codigo,

            Nombre = "Cajero",

            Nivel = (int)RolTenantCodigo.Cajero,

            EsSistema = true

        };

        appDb.RolesTenant.Add(cajero);

        await appDb.SaveChangesAsync();



        foreach (var permiso in permisoCajero)

        {

            appDb.RolesTenantPermisos.Add(new RolTenantPermiso

            {

                RolTenantId = cajero.Id,

                PermisoCodigo = permiso

            });

        }



        await appDb.SaveChangesAsync();

    }

    private static async Task SincronizarPermisosRolSistemaAsync(
        ApplicationDbContext appDb,
        Guid tenantId,
        string codigoRol,
        IReadOnlyList<string> permisosEsperados)
    {
        var rol = await appDb.RolesTenant
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Codigo == codigoRol);
        if (rol == null)
        {
            return;
        }

        var actuales = await appDb.RolesTenantPermisos
            .Where(p => p.RolTenantId == rol.Id)
            .Select(p => p.PermisoCodigo)
            .ToListAsync();

        var faltantes = permisosEsperados.Where(p => !actuales.Contains(p)).ToList();
        if (faltantes.Count == 0)
        {
            return;
        }

        foreach (var permiso in faltantes)
        {
            appDb.RolesTenantPermisos.Add(new RolTenantPermiso
            {
                RolTenantId = rol.Id,
                PermisoCodigo = permiso
            });
        }

        await appDb.SaveChangesAsync();
    }

}

