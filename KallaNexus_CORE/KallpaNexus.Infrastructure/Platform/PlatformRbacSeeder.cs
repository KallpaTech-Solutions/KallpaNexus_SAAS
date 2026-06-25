using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace KallpaNexus.Infrastructure.Platform;

public static class PlatformRbacSeeder
{
    public static async Task SeedAsync(MasterDbContext masterDb, IConfiguration configuration)
    {
        await SeedPermisosAsync(masterDb);
        await SeedRolesSistemaAsync(masterDb);
        await SincronizarPermisosSuperAdminAsync(masterDb);
        await RepararUsuariosSinRolAsync(masterDb);
        await SeedSuperAdminUsuarioAsync(masterDb, configuration);
        await SyncConfiguredSuperAdminAsync(masterDb, configuration);
    }

    private static async Task SeedPermisosAsync(MasterDbContext masterDb)
    {
        foreach (var codigo in PermisosApp.TodosPlataforma)
        {
            if (await masterDb.Permisos.AnyAsync(p => p.Codigo == codigo))
            {
                continue;
            }

            var modulo = codigo.Split(':')[0];
            masterDb.Permisos.Add(new Permiso
            {
                Codigo = codigo,
                Modulo = modulo,
                Descripcion = codigo
            });
        }

        await masterDb.SaveChangesAsync();
    }

    private static async Task SeedRolesSistemaAsync(MasterDbContext masterDb)
    {
        var rolSuper = await AsegurarRolSistemaAsync(
            masterDb,
            nameof(RolPlataformaCodigo.SuperAdmin),
            "Super Administrador",
            (int)RolPlataformaCodigo.SuperAdmin);

        var rolAdmin = await AsegurarRolSistemaAsync(
            masterDb,
            nameof(RolPlataformaCodigo.AdminPlataforma),
            "Administrador de plataforma",
            (int)RolPlataformaCodigo.AdminPlataforma);

        var rolGerente = await AsegurarRolSistemaAsync(
            masterDb,
            nameof(RolPlataformaCodigo.GerentePlataforma),
            "Gerente de plataforma",
            (int)RolPlataformaCodigo.GerentePlataforma);

        var todosPermisos = await masterDb.Permisos
            .Where(p => PermisosApp.TodosPlataforma.Contains(p.Codigo))
            .ToListAsync();

        await AsignarPermisosRolAsync(masterDb, rolSuper.Id, todosPermisos.Select(p => p.Id));

        var permisosAdmin = todosPermisos
            .Where(p => p.Codigo != PermisosApp.PlatformUsuariosOcultosGestionar)
            .Select(p => p.Id);
        await AsignarPermisosRolAsync(masterDb, rolAdmin.Id, permisosAdmin);

        var permisosGerente = todosPermisos
            .Where(p => p.Codigo is PermisosApp.PlatformDashboardVer
                or PermisosApp.PlatformEmpresasVer
                or PermisosApp.PlatformTenantsVer
                or PermisosApp.PlatformPlanesVer
                or PermisosApp.PlatformUsuariosVer
                or PermisosApp.PlatformUsuariosCrear
                or PermisosApp.PlatformUsuariosActivar
                or PermisosApp.PlatformPermisosVer
                or PermisosApp.PlatformRolesVer)
            .Select(p => p.Id);
        await AsignarPermisosRolAsync(masterDb, rolGerente.Id, permisosGerente);
    }

    private static async Task SincronizarPermisosSuperAdminAsync(MasterDbContext masterDb)
    {
        var rolSuper = await masterDb.RolesPlataforma
            .FirstOrDefaultAsync(r => r.Codigo == nameof(RolPlataformaCodigo.SuperAdmin));
        if (rolSuper == null)
        {
            return;
        }

        var todosPermisos = await masterDb.Permisos
            .Where(p => PermisosApp.TodosPlataforma.Contains(p.Codigo))
            .ToListAsync();
        await AsignarPermisosRolAsync(masterDb, rolSuper.Id, todosPermisos.Select(p => p.Id));
    }

    private static async Task<RolPlataforma> AsegurarRolSistemaAsync(
        MasterDbContext masterDb,
        string codigo,
        string nombre,
        int nivel)
    {
        var rol = await masterDb.RolesPlataforma.FirstOrDefaultAsync(r => r.Codigo == codigo);
        if (rol == null)
        {
            rol = new RolPlataforma
            {
                Codigo = codigo,
                Nombre = nombre,
                Nivel = nivel,
                EsSistema = true
            };
            masterDb.RolesPlataforma.Add(rol);
        }
        else
        {
            rol.Nombre = nombre;
            rol.Nivel = nivel;
            rol.EsSistema = true;
        }

        await masterDb.SaveChangesAsync();
        return rol;
    }

    private static async Task AsignarPermisosRolAsync(MasterDbContext masterDb, Guid rolId, IEnumerable<Guid> permisoIds)
    {
        foreach (var permisoId in permisoIds)
        {
            var existe = await masterDb.RolesPlataformaPermisos
                .AnyAsync(rp => rp.RolPlataformaId == rolId && rp.PermisoId == permisoId);
            if (!existe)
            {
                masterDb.RolesPlataformaPermisos.Add(new RolPlataformaPermiso
                {
                    RolPlataformaId = rolId,
                    PermisoId = permisoId
                });
            }
        }

        await masterDb.SaveChangesAsync();
    }

    private static async Task RepararUsuariosSinRolAsync(MasterDbContext masterDb)
    {
        var usuariosSinRol = await masterDb.UsuariosPlataforma
            .Where(u => u.RolPlataformaId == Guid.Empty)
            .ToListAsync();

        if (usuariosSinRol.Count == 0)
        {
            return;
        }

        var rolSuper = await masterDb.RolesPlataforma
            .FirstAsync(r => r.Codigo == nameof(RolPlataformaCodigo.SuperAdmin));

        foreach (var usuario in usuariosSinRol)
        {
            usuario.RolPlataformaId = rolSuper.Id;
        }

        await masterDb.SaveChangesAsync();
    }

    private static async Task SeedSuperAdminUsuarioAsync(MasterDbContext masterDb, IConfiguration configuration)
    {
        if (await masterDb.UsuariosPlataforma.AnyAsync())
        {
            return;
        }

        var rolSuper = await masterDb.RolesPlataforma
            .FirstAsync(r => r.Codigo == nameof(RolPlataformaCodigo.SuperAdmin));

        var email = configuration["Platform:SuperAdminEmail"] ?? "admin@kallpanexus.com";
        var password = configuration["Platform:SuperAdminPassword"] ?? "KallpaAdmin2026!";

        masterDb.UsuariosPlataforma.Add(new UsuarioPlataforma
        {
            NombreCompleto = "Super Administrador Kallpa",
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = PlatformPasswordHasher.Hash(password),
            RolPlataformaId = rolSuper.Id,
            Activo = true,
            Oculto = false
        });

        await masterDb.SaveChangesAsync();
    }

    /// <summary>
    /// Asegura el SuperAdmin definido en configuración (Development: gregorio@master.com, etc.).
    /// </summary>
    private static async Task SyncConfiguredSuperAdminAsync(MasterDbContext masterDb, IConfiguration configuration)
    {
        var email = (configuration["Platform:SuperAdminEmail"] ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(email))
        {
            return;
        }

        var nombre = configuration["Platform:SuperAdminNombre"]?.Trim() ?? "Super Administrador Kallpa";
        var password = configuration["Platform:SuperAdminPassword"] ?? "KallpaAdmin2026!";

        var rolSuper = await masterDb.RolesPlataforma
            .FirstAsync(r => r.Codigo == nameof(RolPlataformaCodigo.SuperAdmin));

        var usuario = await masterDb.UsuariosPlataforma.FirstOrDefaultAsync(u => u.Email == email);
        if (usuario == null)
        {
            masterDb.UsuariosPlataforma.Add(new UsuarioPlataforma
            {
                NombreCompleto = nombre,
                Email = email,
                PasswordHash = PlatformPasswordHasher.Hash(password),
                RolPlataformaId = rolSuper.Id,
                Activo = true,
                Oculto = false
            });
        }
        else
        {
            usuario.NombreCompleto = nombre;
            usuario.RolPlataformaId = rolSuper.Id;
            usuario.Activo = true;
            usuario.PasswordHash = PlatformPasswordHasher.Hash(password);
        }

        await masterDb.SaveChangesAsync();
    }
}
