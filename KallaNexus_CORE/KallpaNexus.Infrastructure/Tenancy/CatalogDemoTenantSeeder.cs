using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Application.Tenancy;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace KallpaNexus.Infrastructure.Tenancy;

/// <summary>
/// Crea negocios de vitrina (onboarding + cancha + tarifas + web pública).
/// Actívalo con Kallpa:SeedCatalogDemos:Enabled=true y Count (p. ej. 30). Idempotente por subdominio.
/// </summary>
public static class CatalogDemoTenantSeeder
{
    private static readonly string[] Ciudades =
    [
        "Tingo María",
        "Lima",
        "Huánuco",
        "Pucallpa",
        "Tarapoto",
        "Iquitos",
        "Cusco",
        "Arequipa",
        "Trujillo",
        "Chiclayo",
    ];

    public static async Task SeedAsync(
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ITenantProvider tenantProvider,
        IConfiguration configuration,
        ILogger? logger = null)
    {
        var section = configuration.GetSection("Kallpa:SeedCatalogDemos");
        if (!section.GetValue("Enabled", false))
        {
            return;
        }

        var count = section.GetValue("Count", 30);
        if (count < 1)
        {
            return;
        }

        var prefix = (section.GetValue<string>("SubdomainPrefix") ?? "vitrina-").Trim().ToLowerInvariant();
        if (prefix.Length < 2)
        {
            prefix = "vitrina-";
        }

        var planId = await ResolverPlanDemoIdAsync(masterDb);
        if (planId == null)
        {
            logger?.LogWarning("CatalogDemoTenantSeeder: no hay plan SaaS activo; se omite.");
            return;
        }

        var plan = await masterDb.PlanesSaaS.AsNoTracking().FirstAsync(p => p.Id == planId.Value);
        var creados = 0;
        var omitidos = 0;

        for (var i = 1; i <= count; i++)
        {
            var n = i.ToString("D2", System.Globalization.CultureInfo.InvariantCulture);
            var subdomain = $"{prefix}{n}";
            if (subdomain.Length < 3)
            {
                continue;
            }

            if (await masterDb.Tenants.AnyAsync(t => t.Subdomain == subdomain))
            {
                omitidos++;
                await CompletarTenantExistenteAsync(masterDb, appDb, tenantProvider, subdomain, logger);
                continue;
            }

            var docFiscal = (50_000_000 + i).ToString(System.Globalization.CultureInfo.InvariantCulture);
            var dniGerente = (41_000_000 + i).ToString(System.Globalization.CultureInfo.InvariantCulture);
            var telefono = (92_000_000 + i).ToString(System.Globalization.CultureInfo.InvariantCulture);
            var ciudad = Ciudades[(i - 1) % Ciudades.Length];
            var nombreNegocio = $"Nexus Vitrina {n}";
            var nombreEmpresa = $"Empresa Vitrina {n}";

            if (await masterDb.ClientesEmpresas.AnyAsync(c => c.DocumentoFiscal == docFiscal))
            {
                logger?.LogWarning("CatalogDemo: documento {Doc} ya existe; omitiendo {Sub}", docFiscal, subdomain);
                omitidos++;
                continue;
            }

            if (await GerenteDniGlobalAsync(appDb, dniGerente))
            {
                logger?.LogWarning("CatalogDemo: DNI gerente {Dni} ya existe; omitiendo {Sub}", dniGerente, subdomain);
                omitidos++;
                continue;
            }

            await using var masterTx = await masterDb.Database.BeginTransactionAsync();
            Tenant tenant;
            try
            {
                var clienteEmpresa = new ClienteEmpresa
                {
                    Tipo = TipoPersona.PersonaNatural,
                    DocumentoFiscal = docFiscal,
                    RazonSocial = nombreEmpresa,
                    NombreComercial = nombreEmpresa,
                    EmailFacturacion = $"vitrina{n}@demo.kallpanexus.page",
                    Telefono = telefono,
                    Pais = "Peru",
                    PlanSaaSId = planId.Value,
                    Estado = EstadoSuscripcion.Demo,
                    ProximoPago = PlanSaaSCicloHelper.CalcularFinCiclo(plan, DateTime.UtcNow),
                    ReservaWebPermitida = true,
                };

                tenant = new Tenant
                {
                    Subdomain = subdomain,
                    NombreComercialNegocio = nombreNegocio,
                    IsActive = true,
                    ClienteEmpresa = clienteEmpresa,
                };

                masterDb.ClientesEmpresas.Add(clienteEmpresa);
                masterDb.Tenants.Add(tenant);
                await masterDb.SaveChangesAsync();
                await masterTx.CommitAsync();
            }
            catch
            {
                await masterTx.RollbackAsync();
                throw;
            }

            if (tenantProvider is TenantProvider provider)
            {
                provider.SetTenant(tenant);
            }

            var sucursal = new Sucursal
            {
                Nombre = "Sede Principal",
                Direccion = $"Av. Los Deportes {i}, {ciudad}",
                Ciudad = ciudad,
                Telefono = telefono,
                TelefonoWhatsApp = telefono,
                Activa = true,
            };
            appDb.Sucursales.Add(sucursal);
            await appDb.SaveChangesAsync();

            await TenantRbacSeeder.SeedRolesInicialesAsync(appDb, tenant.Id);
            await TenantMediosPagoSeeder.EnsureDefaultsAsync(appDb, tenant.Id);

            var rolGerente = await appDb.RolesTenant
                .FirstAsync(r => r.Codigo == nameof(RolTenantCodigo.Gerente));

            appDb.UsuariosStaff.Add(new UsuarioStaff
            {
                Dni = dniGerente,
                NombreCompleto = $"Gerente Vitrina {n}",
                Email = $"gerente{n}@demo.kallpanexus.page",
                PasswordHash = PlatformPasswordHasher.Hash(dniGerente),
                RolTenantId = rolGerente.Id,
                Activo = true,
                DebeCambiarPassword = true,
            });
            await appDb.SaveChangesAsync();

            await EnsureCanchaTarifasYWebAsync(appDb, tenant, telefono, ciudad);
            creados++;
            logger?.LogInformation(
                "CatalogDemo: creado {Sub} — gerente DNI {Dni}, /sports/{Slug}",
                subdomain,
                dniGerente,
                subdomain);
        }

        logger?.LogInformation(
            "CatalogDemoTenantSeeder listo: {Creados} nuevos, {Omitidos} ya existían (completados si faltaba cancha/web).",
            creados,
            omitidos);
    }

    private static async Task CompletarTenantExistenteAsync(
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ITenantProvider tenantProvider,
        string subdomain,
        ILogger? logger)
    {
        var tenant = await masterDb.Tenants.FirstOrDefaultAsync(t => t.Subdomain == subdomain);
        if (tenant == null)
        {
            return;
        }

        if (tenantProvider is TenantProvider provider)
        {
            provider.SetTenant(tenant);
        }

        await TenantMediosPagoSeeder.EnsureDefaultsAsync(appDb, tenant.Id);
        var telefono = "987654321";
        await EnsureCanchaTarifasYWebAsync(appDb, tenant, telefono, "Peru");
        logger?.LogDebug("CatalogDemo: completado sport/web para {Sub}", subdomain);
    }

    private static async Task EnsureCanchaTarifasYWebAsync(
        ApplicationDbContext appDb,
        Tenant tenant,
        string telefono,
        string ciudadHint)
    {
        var sucursales = await appDb.Sucursales.ToListAsync();
        foreach (var sucursal in sucursales)
        {
            if (string.IsNullOrWhiteSpace(sucursal.Ciudad))
            {
                sucursal.Ciudad = ciudadHint;
            }

            var tieneCancha = await appDb.Canchas.AnyAsync(c => c.SucursalId == sucursal.Id);
            if (!tieneCancha)
            {
                appDb.Canchas.Add(new Cancha
                {
                    SucursalId = sucursal.Id,
                    Nombre = "Cancha principal",
                    Tipo = TipoCancha.Futbol_7,
                    TieneIluminacion = true,
                    EstaActiva = true,
                });
            }
        }

        await appDb.SaveChangesAsync();
        await EnsureTarifasYAsignacionesAsync(appDb);

        var cfg = await appDb.ConfiguracionNegocio.FirstOrDefaultAsync();
        if (cfg == null)
        {
            cfg = new ConfiguracionNegocioSport();
            appDb.ConfiguracionNegocio.Add(cfg);
        }

        cfg.NombreComercial = tenant.NombreComercialNegocio;
        cfg.TelefonoWhatsAppNegocio = telefono;
        cfg.ReservaWebActiva = true;
        cfg.TituloWebLanding = tenant.NombreComercialNegocio;
        cfg.MensajeWebLanding = $"Reserva tu cancha en {ciudadHint}. Demo vitrina Kallpa Nexus.";
        cfg.MinutosHoldWeb = 15;
        await appDb.SaveChangesAsync();
    }

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
                    AplicaFinDeSemana = true,
                    PrecioPorHora = 60,
                    Activa = true,
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
                    Activa = true,
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
                            TarifaCanchaId = tarifa.Id,
                        });
                    }
                }
            }
        }

        await appDb.SaveChangesAsync();
    }

    private static async Task<Guid?> ResolverPlanDemoIdAsync(MasterDbContext masterDb)
    {
        var demoId = await masterDb.PlanesSaaS
            .Where(p => p.Activo)
            .OrderBy(p => p.PrecioMensual)
            .Select(p => p.Id)
            .FirstOrDefaultAsync();

        return demoId == Guid.Empty ? null : demoId;
    }

    private static async Task<bool> GerenteDniGlobalAsync(ApplicationDbContext appDb, string dni) =>
        await appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Dni == dni && u.Activo);
}
