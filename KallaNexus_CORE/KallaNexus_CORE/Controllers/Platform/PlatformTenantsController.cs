using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Platform;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Platform)]
[ApiController]
[Route("api/platform/tenants")]
public class PlatformTenantsController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly ApplicationDbContext _appDb;
    private readonly TenantProvider _tenantProvider;

    public PlatformTenantsController(
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ITenantProvider tenantProvider)
    {
        _masterDb = masterDb;
        _appDb = appDb;
        _tenantProvider = (TenantProvider)tenantProvider;
    }

    [HttpGet]
    [HasPermission(PermisosApp.PlatformTenantsVer)]
    public async Task<IActionResult> Listar([FromQuery] Guid? clienteEmpresaId, [FromQuery] bool? soloActivos = true)
    {
        var query = _masterDb.Tenants
            .Include(t => t.ClienteEmpresa)
            .AsQueryable();

        if (clienteEmpresaId.HasValue)
        {
            query = query.Where(t => t.ClienteEmpresaId == clienteEmpresaId.Value);
        }

        if (soloActivos == true)
        {
            query = query.Where(t => t.IsActive);
        }

        var tenants = await query
            .OrderBy(t => t.Subdomain)
            .Select(t => new
            {
                t.Id,
                t.Subdomain,
                t.NombreComercialNegocio,
                t.IsActive,
                t.CreatedAt,
                t.ClienteEmpresaId,
                Empresa = t.ClienteEmpresa.NombreComercial
            })
            .ToListAsync();

        return Ok(tenants);
    }

    [HttpGet("{tenantId:guid}")]
    [HasPermission(PermisosApp.PlatformTenantsVer)]
    public async Task<IActionResult> Obtener(Guid tenantId)
    {
        var tenant = await _masterDb.Tenants
            .Include(t => t.ClienteEmpresa)
            .ThenInclude(c => c.PlanSaaS)
            .Where(t => t.Id == tenantId)
            .Select(t => new
            {
                t.Id,
                t.Subdomain,
                t.NombreComercialNegocio,
                t.IsActive,
                t.CreatedAt,
                t.ConnectionString,
                Empresa = new
                {
                    t.ClienteEmpresa.Id,
                    t.ClienteEmpresa.NombreComercial,
                    Plan = t.ClienteEmpresa.PlanSaaS.Nombre
                }
            })
            .FirstOrDefaultAsync();

        if (tenant == null)
        {
            return NotFound();
        }

        return Ok(tenant);
    }

    /// <summary>
    /// Agrega un negocio operativo (subdominio) a una empresa pagadora existente + sucursal principal.
    /// </summary>
    [HttpPost]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> Crear([FromBody] CrearTenantPlataformaRequest request)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .FirstOrDefaultAsync(c => c.Id == request.ClienteEmpresaId);

        if (empresa == null)
        {
            return BadRequest(new { error = "EmpresaNoEncontrada", mensaje = "La empresa pagadora no existe." });
        }

        if (empresa.Estado == EstadoSuscripcion.Cancelado)
        {
            return BadRequest(new { error = "EmpresaCancelada", mensaje = "La empresa está cancelada." });
        }

        var subdomain = request.Subdomain.Trim().ToLowerInvariant();
        if (await _masterDb.Tenants.AnyAsync(t => t.Subdomain == subdomain))
        {
            return BadRequest(new { error = "SubdominioOcupado", mensaje = "El subdominio ya está en uso." });
        }

        var activos = await _masterDb.Tenants.CountAsync(t => t.ClienteEmpresaId == empresa.Id && t.IsActive);
        if (activos >= empresa.PlanSaaS.LimiteSucursales && empresa.PlanSaaS.LimiteSucursales > 0)
        {
            return BadRequest(new
            {
                error = "LimiteTenants",
                mensaje = $"El plan '{empresa.PlanSaaS.Nombre}' permite hasta {empresa.PlanSaaS.LimiteSucursales} negocios activos."
            });
        }

        var tenant = new KallpaNexus.Domain.Tenancy.Tenant
        {
            Subdomain = subdomain,
            NombreComercialNegocio = request.NombreComercialNegocio.Trim(),
            ConnectionString = string.IsNullOrWhiteSpace(request.ConnectionStringDedicada)
                ? null
                : request.ConnectionStringDedicada.Trim(),
            IsActive = true,
            ClienteEmpresaId = empresa.Id
        };

        _masterDb.Tenants.Add(tenant);
        await _masterDb.SaveChangesAsync();

        _tenantProvider.SetTenant(tenant);

        var sucursal = new Sucursal
        {
            Nombre = string.IsNullOrWhiteSpace(request.NombreSucursalPrincipal)
                ? "Sucursal Principal"
                : request.NombreSucursalPrincipal.Trim(),
            Direccion = request.DireccionSucursal?.Trim() ?? string.Empty,
            Telefono = request.TelefonoSucursal?.Trim() ?? empresa.Telefono,
            Activa = true
        };

        _appDb.Sucursales.Add(sucursal);
        await _appDb.SaveChangesAsync();

        await TenantRbacSeeder.SeedRolesInicialesAsync(_appDb, tenant.Id);
        await TenantMediosPagoSeeder.EnsureDefaultsAsync(_appDb, tenant.Id);

        return Ok(new
        {
            Mensaje = "Tenant y sucursal principal creados.",
            TenantId = tenant.Id,
            tenant.Subdomain,
            SucursalPrincipalId = sucursal.Id
        });
    }

    [HttpPut("{tenantId:guid}")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> Actualizar(Guid tenantId, [FromBody] ActualizarTenantRequest request)
    {
        var tenant = await _masterDb.Tenants.FindAsync(tenantId);
        if (tenant == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.NombreComercialNegocio))
        {
            tenant.NombreComercialNegocio = request.NombreComercialNegocio.Trim();
        }

        if (request.IsActive.HasValue)
        {
            tenant.IsActive = request.IsActive.Value;
        }

        if (request.ConnectionStringDedicada != null)
        {
            tenant.ConnectionString = string.IsNullOrWhiteSpace(request.ConnectionStringDedicada)
                ? null
                : request.ConnectionStringDedicada.Trim();
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Tenant actualizado.", TenantId = tenant.Id });
    }

    [HttpPut("{tenantId:guid}/reserva-web")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> ConfigurarReservaWeb(Guid tenantId, [FromBody] ReservaWebTenantRequest request)
    {
        var tenant = await _masterDb.Tenants
            .Include(t => t.ClienteEmpresa)
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Tenant no encontrado." });
        }

        if (!tenant.ClienteEmpresa.ReservaWebPermitida && request.Activa)
        {
            return BadRequest(new
            {
                error = "WebBloqueadaPlataforma",
                mensaje = "La plataforma tiene deshabilitada la web pública para esta empresa. Actívala en la ficha de empresa."
            });
        }

        _tenantProvider.SetTenant(tenant);

        var cfg = await _appDb.ConfiguracionNegocio.FirstOrDefaultAsync();
        if (cfg == null)
        {
            cfg = new ConfiguracionNegocioSport();
            _appDb.ConfiguracionNegocio.Add(cfg);
        }

        cfg.ReservaWebActiva = request.Activa;
        await _appDb.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = request.Activa ? "Reserva web activada para el negocio." : "Reserva web desactivada.",
            TenantId = tenant.Id,
            tenant.Subdomain,
            ReservaWebActiva = cfg.ReservaWebActiva,
        });
    }

    [HttpDelete("{tenantId:guid}")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> Eliminar(Guid tenantId)
    {
        var tenant = await _masterDb.Tenants.FindAsync(tenantId);
        if (tenant == null)
        {
            return NotFound();
        }

        tenant.IsActive = false;
        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Tenant desactivado.", TenantId = tenant.Id, tenant.IsActive });
    }
}

public class CrearTenantPlataformaRequest
{
    public Guid ClienteEmpresaId { get; set; }
    public string Subdomain { get; set; } = string.Empty;
    public string NombreComercialNegocio { get; set; } = string.Empty;
    public string? ConnectionStringDedicada { get; set; }
    public string NombreSucursalPrincipal { get; set; } = "Sucursal Principal";
    public string? DireccionSucursal { get; set; }
    public string? TelefonoSucursal { get; set; }
}

public class ActualizarTenantRequest
{
    public string? NombreComercialNegocio { get; set; }
    public bool? IsActive { get; set; }
    public string? ConnectionStringDedicada { get; set; }
}

public class ReservaWebTenantRequest
{
    public bool Activa { get; set; }
}
