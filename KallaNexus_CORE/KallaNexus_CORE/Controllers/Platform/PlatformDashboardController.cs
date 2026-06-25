using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Platform;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Platform)]
[ApiController]
[Route("api/platform/dashboard")]
public class PlatformDashboardController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly ApplicationDbContext _appDb;

    public PlatformDashboardController(MasterDbContext masterDb, ApplicationDbContext appDb)
    {
        _masterDb = masterDb;
        _appDb = appDb;
    }

    [HttpGet("resumen")]
    [HasPermission(PermisosApp.PlatformDashboardVer)]
    public async Task<IActionResult> Resumen()
    {
        var totalEmpresas = await _masterDb.ClientesEmpresas.CountAsync();
        var totalTenants = await _masterDb.Tenants.CountAsync(t => t.IsActive);
        var totalPlanes = await _masterDb.PlanesSaaS.CountAsync(p => p.Activo);

        var totalTenantsRegistrados = await _masterDb.Tenants.CountAsync();
        var consumidoresGlobal = await _appDb.Clientes.IgnoreQueryFilters().CountAsync();
        var reservasSport = await _appDb.Reservas.IgnoreQueryFilters().CountAsync();
        var staffNegociosActivos = await _appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .CountAsync(u => u.Activo);
        var totalSucursales = await _appDb.Sucursales.IgnoreQueryFilters().CountAsync();
        var sucursalesActivas = await _appDb.Sucursales
            .IgnoreQueryFilters()
            .CountAsync(s => s.Activa);

        var empresasPorEstado = await _masterDb.ClientesEmpresas
            .GroupBy(c => c.Estado)
            .Select(g => new { Estado = g.Key.ToString(), Total = g.Count() })
            .ToListAsync();

        var hoy = DateTime.UtcNow.Date;

        var empresasRecientes = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .OrderBy(c => c.NombreComercial)
            .Take(8)
            .Select(c => new
            {
                c.Id,
                c.NombreComercial,
                c.DocumentoFiscal,
                c.EmailFacturacion,
                c.Telefono,
                c.Tipo,
                Estado = c.Estado.ToString(),
                Plan = c.PlanSaaS.Nombre,
                c.ProximoPago,
                EsPlanDemo = c.PlanSaaS.PrecioMensual <= 0,
                TenantsActivos = c.Tenants.Count(t => t.IsActive),
                DiasRestantes = (c.ProximoPago.Date - hoy).Days
            })
            .ToListAsync();

        var alertasCiclo = await _masterDb.ClientesEmpresas
            .AsNoTracking()
            .Include(c => c.PlanSaaS)
            .Where(c => c.Estado != EstadoSuscripcion.Cancelado)
            .Where(c => c.ProximoPago.Date <= hoy.AddDays(14))
            .OrderBy(c => c.ProximoPago)
            .Take(12)
            .Select(c => new
            {
                c.Id,
                c.NombreComercial,
                Estado = c.Estado.ToString(),
                Plan = c.PlanSaaS.Nombre,
                c.ProximoPago,
                EsPlanDemo = c.PlanSaaS.PrecioMensual <= 0,
                DiasRestantes = (c.ProximoPago.Date - hoy).Days
            })
            .ToListAsync();

        return Ok(new
        {
            TotalEmpresasPagadoras = totalEmpresas,
            TotalTenantsActivos = totalTenants,
            TotalTenantsRegistrados = totalTenantsRegistrados,
            TotalPlanesActivos = totalPlanes,
            TotalConsumidoresB2C_RegistrosPorTenant = consumidoresGlobal,
            TotalReservasSport_Global = reservasSport,
            TotalStaffNegociosActivos = staffNegociosActivos,
            TotalSucursalesSport = totalSucursales,
            TotalSucursalesActivas = sucursalesActivas,
            EmpresasPorEstado = empresasPorEstado,
            EmpresasRecientes = empresasRecientes,
            AlertasCicloPlan = alertasCiclo
        });
    }

    [HttpGet("empresas")]
    [HasPermission(PermisosApp.PlatformDashboardVer)]
    public async Task<IActionResult> EmpresasConTenants()
    {
        var empresas = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .Include(c => c.Tenants)
            .OrderBy(c => c.NombreComercial)
            .Select(c => new
            {
                c.Id,
                c.Tipo,
                c.DocumentoFiscal,
                c.RazonSocial,
                c.NombreComercial,
                c.EmailFacturacion,
                c.Telefono,
                Estado = c.Estado.ToString(),
                Plan = c.PlanSaaS.Nombre,
                Tenants = c.Tenants.Select(t => new
                {
                    t.Id,
                    t.Subdomain,
                    t.NombreComercialNegocio,
                    t.IsActive,
                    t.CreatedAt
                }).ToList()
            })
            .ToListAsync();

        return Ok(empresas);
    }

    /// <summary>
    /// Vista 360: mismo DNI/consumidor apareciendo en varios tenants (ecosistema).
    /// </summary>
    [HttpGet("consumidores-360")]
    [HasPermission(PermisosApp.PlatformConsumidoresVer)]
    public async Task<IActionResult> Consumidores360([FromQuery] string? dni)
    {
        var query = _appDb.Clientes.IgnoreQueryFilters().AsQueryable();

        if (!string.IsNullOrWhiteSpace(dni))
        {
            query = query.Where(c => c.Dni == dni.Trim());
        }

        var filas = await query
            .Select(c => new
            {
                c.Id,
                c.TenantId,
                c.Dni,
                c.NombreCompleto,
                c.Telefono,
                c.Email,
                c.Activo,
                TotalReservas = c.Reservas.Count
            })
            .ToListAsync();

        var tenantIds = filas.Select(f => f.TenantId).Distinct().ToList();
        var tenants = await _masterDb.Tenants
            .Where(t => tenantIds.Contains(t.Id))
            .Select(t => new { t.Id, t.Subdomain, t.NombreComercialNegocio })
            .ToListAsync();

        var agrupadoPorDni = filas
            .GroupBy(f => f.Dni)
            .Select(g => new
            {
                Dni = g.Key,
                Nombre = g.First().NombreCompleto,
                AparicionesEnTenants = g.Count(),
                TotalReservas = g.Sum(x => x.TotalReservas),
                Detalle = g.Select(x =>
                {
                    var t = tenants.FirstOrDefault(tn => tn.Id == x.TenantId);
                    return new
                    {
                        x.TenantId,
                        Subdomain = t?.Subdomain ?? "desconocido",
                        Negocio = t?.NombreComercialNegocio,
                        ClienteId = x.Id,
                        x.Telefono,
                        x.Email,
                        x.TotalReservas
                    };
                }).ToList()
            })
            .OrderByDescending(x => x.AparicionesEnTenants)
            .ToList();

        return Ok(agrupadoPorDni);
    }
}
