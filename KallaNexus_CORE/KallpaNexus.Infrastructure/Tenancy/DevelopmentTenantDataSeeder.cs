using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace KallpaNexus.Infrastructure.Tenancy;

/// <summary>
/// Datos y credenciales de desarrollo para cada tenant activo (solo entorno Development).
/// </summary>
public static class DevelopmentTenantDataSeeder
{
    public static async Task SeedAsync(
        bool isDevelopment,
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ITenantProvider tenantProvider,
        IConfiguration configuration)
    {
        if (!isDevelopment)
        {
            return;
        }

        if (!configuration.GetValue("Development:SeedDemoData", true))
        {
            return;
        }

        var tenantConfigs = configuration
            .GetSection("Development:Tenants")
            .Get<List<DevelopmentTenantSeedConfig>>() ?? [];

        var tenants = await masterDb.Tenants
            .Where(t => t.IsActive)
            .ToListAsync();

        foreach (var tenant in tenants)
        {
            var cfg = tenantConfigs.FirstOrDefault(c =>
                string.Equals(c.Subdomain, tenant.Subdomain, StringComparison.OrdinalIgnoreCase));

            if (tenantProvider is TenantProvider provider)
            {
                provider.SetTenant(tenant);
            }

            await TenantRbacSeeder.SeedRolesInicialesAsync(appDb, tenant.Id);
            await SeedGerenteStaffAsync(appDb, cfg, tenant);
            await SeedSportDemoAsync(appDb, tenant);
            await EnsureTarifasYAsignacionesAsync(appDb);
        }
    }

    private static async Task SeedGerenteStaffAsync(
        ApplicationDbContext appDb,
        DevelopmentTenantSeedConfig? cfg,
        Tenant tenant)
    {
        var email = (cfg?.StaffEmail ?? $"gerente@{tenant.Subdomain}.com").Trim().ToLowerInvariant();
        var dni = (cfg?.StaffDni ?? "45678901").Trim();
        var passwordInicial = cfg?.StaffPassword ?? dni;

        var rolGerente = await appDb.RolesTenant
            .FirstAsync(r => r.Codigo == nameof(RolTenantCodigo.Gerente));

        var usuario = await appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Dni == dni);

        if (usuario == null)
        {
            usuario = await appDb.UsuariosStaff
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.Email == email);
        }

        if (usuario == null)
        {
            appDb.UsuariosStaff.Add(new UsuarioStaff
            {
                TenantId = tenant.Id,
                Dni = dni,
                NombreCompleto = cfg?.StaffNombre ?? $"Gerente {tenant.NombreComercialNegocio}",
                Email = email,
                PasswordHash = PlatformPasswordHasher.Hash(passwordInicial),
                RolTenantId = rolGerente.Id,
                Activo = true,
                DebeCambiarPassword = false
            });
        }
        else
        {
            usuario.Dni = dni;
            usuario.Email = email;
            usuario.RolTenantId = rolGerente.Id;
            usuario.Activo = true;
            usuario.DebeCambiarPassword = false;
            if (!PlatformPasswordHasher.Verify(passwordInicial, usuario.PasswordHash))
            {
                usuario.PasswordHash = PlatformPasswordHasher.Hash(passwordInicial);
            }
        }

        await appDb.SaveChangesAsync();
    }

    private static async Task SeedSportDemoAsync(ApplicationDbContext appDb, Tenant tenant)
    {
        if (!await appDb.Sucursales.AnyAsync())
        {
            var sucursal = new Sucursal
            {
                Nombre = "Sucursal Principal",
                Direccion = "Av. Demo 123",
                Telefono = "999000111",
                Activa = true
            };
            appDb.Sucursales.Add(sucursal);
            await appDb.SaveChangesAsync();

            appDb.Canchas.Add(new Cancha
            {
                SucursalId = sucursal.Id,
                Nombre = "Cancha 1",
                Tipo = TipoCancha.Futbol_7,
                TieneIluminacion = true,
                EstaActiva = true
            });
            await appDb.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Asegura tarifas diurna/nocturna y las vincula a todas las canchas de cada sucursal (solo Development).
    /// </summary>
    private static async Task EnsureTarifasYAsignacionesAsync(ApplicationDbContext appDb)
    {
        var sucursales = await appDb.Sucursales.ToListAsync();
        foreach (var sucursal in sucursales)
        {
            var diurna = await appDb.TarifasCanchas.FirstOrDefaultAsync(t =>
                t.SucursalId == sucursal.Id && t.Nombre.Contains("Diurna"));
            if (diurna == null)
            {
                diurna = new TarifaCancha
                {
                    SucursalId = sucursal.Id,
                    Nombre = "Tarifa Estándar Diurna",
                    HoraInicio = 6,
                    HoraFin = 18,
                    AplicaLunesAViernes = true,
                    AplicaFinDeSemana = false,
                    PrecioPorHora = 60,
                    Activa = true
                };
                appDb.TarifasCanchas.Add(diurna);
                await appDb.SaveChangesAsync();
            }

            var nocturna = await appDb.TarifasCanchas.FirstOrDefaultAsync(t =>
                t.SucursalId == sucursal.Id && t.Nombre.Contains("Nocturna"));
            if (nocturna == null)
            {
                nocturna = new TarifaCancha
                {
                    SucursalId = sucursal.Id,
                    Nombre = "Tarifa Nocturna",
                    HoraInicio = 18,
                    HoraFin = 23,
                    AplicaLunesAViernes = true,
                    AplicaFinDeSemana = true,
                    PrecioPorHora = 80,
                    Activa = true
                };
                appDb.TarifasCanchas.Add(nocturna);
                await appDb.SaveChangesAsync();
            }

            var canchas = await appDb.Canchas.Where(c => c.SucursalId == sucursal.Id).ToListAsync();
            foreach (var cancha in canchas)
            {
                foreach (var tarifa in new[] { diurna, nocturna })
                {
                    var existe = await appDb.CanchasTarifas.AnyAsync(ct =>
                        ct.CanchaId == cancha.Id && ct.TarifaCanchaId == tarifa.Id);
                    if (!existe)
                    {
                        appDb.CanchasTarifas.Add(new CanchaTarifa
                        {
                            CanchaId = cancha.Id,
                            TarifaCanchaId = tarifa.Id
                        });
                    }
                }
            }
        }

        await SeedMediosPagoAsync(appDb);
        await appDb.SaveChangesAsync();
    }

    private static async Task SeedMediosPagoAsync(ApplicationDbContext appDb)
    {
        if (await appDb.MediosPago.AnyAsync())
        {
            return;
        }

        var defaults = new (string Nombre, TipoMedioPago Tipo, bool VoucherOnline, bool SinVoucherPresencial, int Orden)[]
        {
            ("Efectivo en caja", TipoMedioPago.Efectivo, false, true, 1),
            ("Transferencia bancaria", TipoMedioPago.Transferencia, true, true, 2),
            ("Yape", TipoMedioPago.Yape, true, true, 3),
            ("Plin", TipoMedioPago.Plin, true, true, 4),
            ("Izipay (POS)", TipoMedioPago.Izipay, true, true, 5),
            ("Pasarela en línea (futuro)", TipoMedioPago.Pasarela, true, false, 99)
        };

        foreach (var d in defaults)
        {
            appDb.MediosPago.Add(new MedioPagoTenant
            {
                Nombre = d.Nombre,
                Tipo = d.Tipo,
                RequiereVoucherOnline = d.VoucherOnline,
                PermiteSinVoucherPresencial = d.SinVoucherPresencial,
                EsPasarelaExterna = d.Tipo == TipoMedioPago.Pasarela,
                Orden = d.Orden,
                Activo = d.Tipo != TipoMedioPago.Pasarela
            });
        }
    }

    private static string Capitalize(string value) =>
        string.IsNullOrEmpty(value)
            ? value
            : char.ToUpperInvariant(value[0]) + value[1..].ToLowerInvariant();

    private sealed class DevelopmentTenantSeedConfig
    {
        public string Subdomain { get; set; } = string.Empty;
        public string? StaffEmail { get; set; }
        public string? StaffDni { get; set; }
        public string? StaffPassword { get; set; }
        public string? StaffNombre { get; set; }
    }
}
