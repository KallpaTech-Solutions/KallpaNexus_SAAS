using KallpaNexus.API.Swagger;
using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.Public;

/// <summary>Vitrina pública multi-negocio (sin tenant en la URL).</summary>
[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Public)]
[ApiController]
[Route("api/public/hub")]
public class PublicHubController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly IServiceScopeFactory _scopeFactory;

    public PublicHubController(MasterDbContext masterDb, IServiceScopeFactory scopeFactory)
    {
        _masterDb = masterDb;
        _scopeFactory = scopeFactory;
    }

    [HttpGet("sedes")]
    public async Task<IActionResult> ListarSedes([FromQuery] string? q)
    {
        var busqueda = q?.Trim().ToLowerInvariant();
        var tenants = await _masterDb.Tenants
            .AsNoTracking()
            .Where(t => t.IsActive)
            .OrderBy(t => t.NombreComercialNegocio)
            .ToListAsync();

        var tarjetas = new List<object>();

        foreach (var tenant in tenants)
        {
            using var scope = _scopeFactory.CreateScope();
            var provider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();
            ((TenantProvider)provider).SetTenant(tenant);
            var appDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var cfg = await appDb.ConfiguracionNegocio.AsNoTracking().FirstOrDefaultAsync();
            if (cfg is not { ReservaWebActiva: true })
            {
                continue;
            }

            var nombreNegocio = string.IsNullOrWhiteSpace(cfg.NombreComercial)
                ? tenant.NombreComercialNegocio
                : cfg.NombreComercial;

            if (!string.IsNullOrEmpty(busqueda) &&
                !tenant.Subdomain.Contains(busqueda, StringComparison.OrdinalIgnoreCase) &&
                !nombreNegocio.Contains(busqueda, StringComparison.OrdinalIgnoreCase))
            {
                var coincideSede = await appDb.Sucursales
                    .AnyAsync(s =>
                        s.Activa &&
                        (s.Nombre.ToLower().Contains(busqueda) ||
                         (s.Ciudad != null && s.Ciudad.ToLower().Contains(busqueda))));
                if (!coincideSede)
                {
                    continue;
                }
            }

            var sucursales = await appDb.Sucursales
                .AsNoTracking()
                .Where(s => s.Activa)
                .OrderBy(s => s.Nombre)
                .Select(s => new { s.Id, s.Nombre, s.Ciudad, s.Direccion })
                .ToListAsync();

            var slugsTenant = new List<string>();
            foreach (var suc in sucursales)
            {
                if (!string.IsNullOrEmpty(busqueda) &&
                    !tenant.Subdomain.Contains(busqueda, StringComparison.OrdinalIgnoreCase) &&
                    !nombreNegocio.Contains(busqueda, StringComparison.OrdinalIgnoreCase) &&
                    !suc.Nombre.ToLower().Contains(busqueda) &&
                    !(suc.Ciudad?.ToLower().Contains(busqueda) ?? false))
                {
                    continue;
                }

                var baseSlug = PublicSedeSlugHelper.SlugFromNombre(suc.Nombre);
                var sedeSlug = baseSlug;
                if (slugsTenant.Contains(sedeSlug))
                {
                    sedeSlug = $"{baseSlug}-{suc.Id.ToString("N")[..6]}";
                }

                slugsTenant.Add(sedeSlug);

                var canchas = await appDb.Canchas
                    .AsNoTracking()
                    .Where(c => c.SucursalId == suc.Id && c.EstaActiva)
                    .Select(c => c.Tipo)
                    .ToListAsync();

                var tipos = canchas
                    .Select(t => t.ToString())
                    .Distinct()
                    .Take(4)
                    .ToList();

                tarjetas.Add(new
                {
                    slug = tenant.Subdomain,
                    nombreComercial = nombreNegocio,
                    sucursalId = suc.Id,
                    sucursalNombre = suc.Nombre,
                    ciudad = suc.Ciudad,
                    direccion = suc.Direccion,
                    totalCanchas = canchas.Count,
                    tiposCancha = tipos,
                    sedeSlug,
                    urlReserva = $"/t/{tenant.Subdomain}?sede={sedeSlug}#reservar",
                    imagenHeroUrl = cfg.ImagenHeroRuta,
                });
            }
        }

        return Ok(new
        {
            titulo = "Nuestras sedes",
            total = tarjetas.Count,
            sedes = tarjetas,
        });
    }
}
