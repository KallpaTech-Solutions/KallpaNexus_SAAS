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
[Route("api/platform/empresas")]
public class PlatformEmpresasController : ControllerBase
{
    private readonly MasterDbContext _masterDb;

    public PlatformEmpresasController(MasterDbContext masterDb)
    {
        _masterDb = masterDb;
    }

    [HttpGet]
    [HasPermission(PermisosApp.PlatformEmpresasVer)]
    public async Task<IActionResult> Listar([FromQuery] EstadoSuscripcion? estado)
    {
        var query = _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .AsQueryable();

        if (estado.HasValue)
        {
            query = query.Where(c => c.Estado == estado.Value);
        }

        var empresas = await query
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
                c.ProximoPago,
                PlanSaaSId = c.PlanSaaSId,
                PlanNombre = c.PlanSaaS.Nombre,
                PlanPrecioMensual = c.PlanSaaS.PrecioMensual,
                TotalTenants = c.Tenants.Count
            })
            .ToListAsync();

        return Ok(empresas);
    }

    [HttpGet("{empresaId:guid}")]
    [HasPermission(PermisosApp.PlatformEmpresasVer)]
    public async Task<IActionResult> Obtener(Guid empresaId)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .Include(c => c.Tenants)
            .Where(c => c.Id == empresaId)
            .Select(c => new
            {
                c.Id,
                c.Tipo,
                c.DocumentoFiscal,
                c.RazonSocial,
                c.NombreComercial,
                c.EmailFacturacion,
                c.Telefono,
                c.DireccionFiscal,
                c.Pais,
                Estado = c.Estado.ToString(),
                c.ProximoPago,
                Plan = new
                {
                    c.PlanSaaS.Id,
                    c.PlanSaaS.Nombre,
                    c.PlanSaaS.PrecioMensual,
                    c.PlanSaaS.LimiteSucursales,
                    c.PlanSaaS.LimiteUsuariosStaff,
                    c.PlanSaaS.SoportaModuloSport,
                    c.PlanSaaS.SoportaModuloStay,
                    c.PlanSaaS.SoportaModuloCare
                },
                Tenants = c.Tenants.Select(t => new
                {
                    t.Id,
                    t.Subdomain,
                    t.NombreComercialNegocio,
                    t.IsActive
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (empresa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Empresa no encontrada." });
        }

        return Ok(empresa);
    }

    /// <summary>
    /// Asigna o cambia el plan SaaS de la empresa pagadora.
    /// </summary>
    [HttpPut("{empresaId:guid}/plan")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> AsignarPlan(Guid empresaId, [FromBody] AsignarPlanEmpresaRequest request)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .FirstOrDefaultAsync(c => c.Id == empresaId);

        if (empresa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Empresa no encontrada." });
        }

        var plan = await _masterDb.PlanesSaaS.FirstOrDefaultAsync(p => p.Id == request.PlanSaaSId);
        if (plan == null || !plan.Activo)
        {
            return BadRequest(new { error = "PlanInvalido", mensaje = "El plan no existe o está inactivo." });
        }

        var planAnterior = empresa.PlanSaaS.Nombre;
        empresa.PlanSaaSId = plan.Id;

        if (request.ProximoPago.HasValue)
        {
            empresa.ProximoPago = DateTime.SpecifyKind(request.ProximoPago.Value, DateTimeKind.Utc);
        }

        if (request.Estado.HasValue)
        {
            empresa.Estado = request.Estado.Value;
        }

        await _masterDb.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Plan asignado a la empresa correctamente.",
            EmpresaId = empresa.Id,
            Empresa = empresa.NombreComercial,
            PlanAnterior = planAnterior,
            PlanNuevo = plan.Nombre,
            empresa.PlanSaaSId,
            Estado = empresa.Estado.ToString(),
            empresa.ProximoPago
        });
    }

    [HttpPut("{empresaId:guid}")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> Actualizar(Guid empresaId, [FromBody] ActualizarEmpresaRequest request)
    {
        var empresa = await _masterDb.ClientesEmpresas.FirstOrDefaultAsync(c => c.Id == empresaId);
        if (empresa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Empresa no encontrada." });
        }

        if (!string.IsNullOrWhiteSpace(request.RazonSocial))
        {
            empresa.RazonSocial = request.RazonSocial.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.NombreComercial))
        {
            empresa.NombreComercial = request.NombreComercial.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.EmailFacturacion))
        {
            empresa.EmailFacturacion = request.EmailFacturacion.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Telefono))
        {
            empresa.Telefono = request.Telefono.Trim();
        }

        if (request.DireccionFiscal != null)
        {
            empresa.DireccionFiscal = string.IsNullOrWhiteSpace(request.DireccionFiscal)
                ? null
                : request.DireccionFiscal.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Pais))
        {
            empresa.Pais = request.Pais.Trim();
        }

        if (request.Estado.HasValue)
        {
            empresa.Estado = request.Estado.Value;
            if (request.Estado.Value is EstadoSuscripcion.Activo or EstadoSuscripcion.Demo)
            {
                var tenantsActivar = await _masterDb.Tenants
                    .Where(t => t.ClienteEmpresaId == empresaId)
                    .ToListAsync();
                foreach (var tenant in tenantsActivar)
                {
                    tenant.IsActive = true;
                }
            }

            if (request.Estado.Value is EstadoSuscripcion.Suspendido or EstadoSuscripcion.Cancelado)
            {
                var tenantsOff = await _masterDb.Tenants
                    .Where(t => t.ClienteEmpresaId == empresaId)
                    .ToListAsync();
                foreach (var tenant in tenantsOff)
                {
                    tenant.IsActive = false;
                }
            }
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Empresa actualizada.", EmpresaId = empresa.Id });
    }

    [HttpDelete("{empresaId:guid}")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> Eliminar(Guid empresaId)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.Tenants)
            .FirstOrDefaultAsync(c => c.Id == empresaId);

        if (empresa == null)
        {
            return NotFound();
        }

        empresa.Estado = EstadoSuscripcion.Cancelado;
        foreach (var tenant in empresa.Tenants)
        {
            tenant.IsActive = false;
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new
        {
            Mensaje = "Empresa suspendida/cancelada y sus tenants desactivados.",
            EmpresaId = empresa.Id,
            Estado = empresa.Estado.ToString()
        });
    }
}

public class ActualizarEmpresaRequest
{
    public string? RazonSocial { get; set; }
    public string? NombreComercial { get; set; }
    public string? EmailFacturacion { get; set; }
    public string? Telefono { get; set; }
    public string? DireccionFiscal { get; set; }
    public string? Pais { get; set; }
    public EstadoSuscripcion? Estado { get; set; }
}

public class AsignarPlanEmpresaRequest
{
    public Guid PlanSaaSId { get; set; }
    public EstadoSuscripcion? Estado { get; set; }
    public DateTime? ProximoPago { get; set; }
}
