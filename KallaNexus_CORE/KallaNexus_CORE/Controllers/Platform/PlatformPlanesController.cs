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
[Route("api/platform/planes")]
public class PlatformPlanesController : ControllerBase
{
    private readonly MasterDbContext _masterDb;

    public PlatformPlanesController(MasterDbContext masterDb)
    {
        _masterDb = masterDb;
    }

    [HttpGet]
    [HasPermission(PermisosApp.PlatformPlanesVer)]
    public async Task<IActionResult> Listar([FromQuery] bool? soloActivos = true)
    {
        var query = _masterDb.PlanesSaaS.AsQueryable();
        if (soloActivos == true)
        {
            query = query.Where(p => p.Activo);
        }

        var planes = await query.OrderBy(p => p.PrecioMensual).ToListAsync();
        return Ok(planes);
    }

    [HttpGet("{planId:guid}")]
    [HasPermission(PermisosApp.PlatformPlanesVer)]
    public async Task<IActionResult> Obtener(Guid planId)
    {
        var plan = await _masterDb.PlanesSaaS.FindAsync(planId);
        if (plan == null)
        {
            return NotFound();
        }

        return Ok(plan);
    }

    [HttpPost]
    [HasPermission(PermisosApp.PlatformPlanesGestionar)]
    public async Task<IActionResult> Crear([FromBody] CrearPlanRequest request)
    {
        var plan = new PlanSaaS
        {
            Nombre = request.Nombre.Trim(),
            PrecioMensual = request.PrecioMensual,
            LimiteSucursales = request.LimiteSucursales,
            LimiteUsuariosStaff = request.LimiteUsuariosStaff,
            LimiteCanchas = request.LimiteCanchas,
            SoportaModuloSport = request.SoportaModuloSport,
            SoportaModuloStay = request.SoportaModuloStay,
            SoportaModuloCare = request.SoportaModuloCare,
            SoportaFidelizacionPuntos = request.SoportaFidelizacionPuntos,
            Activo = true,
            DiasDuracionDemo = request.PrecioMensual <= 0 ? request.DiasDuracionDemo ?? 30 : null
        };

        _masterDb.PlanesSaaS.Add(plan);
        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Plan creado.", PlanId = plan.Id });
    }

    [HttpPut("{planId:guid}")]
    [HasPermission(PermisosApp.PlatformPlanesGestionar)]
    public async Task<IActionResult> Actualizar(Guid planId, [FromBody] ActualizarPlanRequest request)
    {
        var plan = await _masterDb.PlanesSaaS.FindAsync(planId);
        if (plan == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Nombre))
        {
            plan.Nombre = request.Nombre.Trim();
        }

        if (request.PrecioMensual.HasValue)
        {
            plan.PrecioMensual = request.PrecioMensual.Value;
        }

        if (request.LimiteSucursales.HasValue)
        {
            plan.LimiteSucursales = request.LimiteSucursales.Value;
        }

        if (request.LimiteUsuariosStaff.HasValue)
        {
            plan.LimiteUsuariosStaff = request.LimiteUsuariosStaff.Value;
        }

        if (request.LimiteCanchas.HasValue)
        {
            plan.LimiteCanchas = Math.Max(0, request.LimiteCanchas.Value);
        }

        if (request.SoportaModuloSport.HasValue)
        {
            plan.SoportaModuloSport = request.SoportaModuloSport.Value;
        }

        if (request.SoportaModuloStay.HasValue)
        {
            plan.SoportaModuloStay = request.SoportaModuloStay.Value;
        }

        if (request.SoportaModuloCare.HasValue)
        {
            plan.SoportaModuloCare = request.SoportaModuloCare.Value;
        }

        if (request.SoportaFidelizacionPuntos.HasValue)
        {
            plan.SoportaFidelizacionPuntos = request.SoportaFidelizacionPuntos.Value;
        }

        if (request.Activo.HasValue)
        {
            plan.Activo = request.Activo.Value;
        }

        if (request.DiasDuracionDemo.HasValue)
        {
            var dias = request.DiasDuracionDemo.Value;
            plan.DiasDuracionDemo = dias <= 0 ? null : Math.Min(365, Math.Max(1, dias));
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Plan actualizado.", PlanId = plan.Id });
    }

    [HttpDelete("{planId:guid}")]
    [HasPermission(PermisosApp.PlatformPlanesGestionar)]
    public async Task<IActionResult> Eliminar(Guid planId)
    {
        var plan = await _masterDb.PlanesSaaS
            .Include(p => p.ClientesEmpresas)
            .FirstOrDefaultAsync(p => p.Id == planId);

        if (plan == null)
        {
            return NotFound();
        }

        if (plan.ClientesEmpresas.Count > 0)
        {
            plan.Activo = false;
            await _masterDb.SaveChangesAsync();
            return Ok(new
            {
                Mensaje = "El plan tiene empresas asociadas; se desactivó en lugar de eliminarse.",
                PlanId = plan.Id,
                plan.Activo,
                EmpresasAsociadas = plan.ClientesEmpresas.Count
            });
        }

        _masterDb.PlanesSaaS.Remove(plan);
        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Plan eliminado.", PlanId = planId });
    }
}

public class CrearPlanRequest
{
    public string Nombre { get; set; } = string.Empty;
    public decimal PrecioMensual { get; set; }
    public int LimiteSucursales { get; set; } = 1;
    public int LimiteUsuariosStaff { get; set; } = 3;
    public int LimiteCanchas { get; set; }
    public bool SoportaModuloSport { get; set; } = true;
    public bool SoportaModuloStay { get; set; }
    public bool SoportaModuloCare { get; set; }
    public bool SoportaFidelizacionPuntos { get; set; }
    public int? DiasDuracionDemo { get; set; }
}

public class ActualizarPlanRequest
{
    public string? Nombre { get; set; }
    public decimal? PrecioMensual { get; set; }
    public int? LimiteSucursales { get; set; }
    public int? LimiteUsuariosStaff { get; set; }
    public int? LimiteCanchas { get; set; }
    public bool? SoportaModuloSport { get; set; }
    public bool? SoportaModuloStay { get; set; }
    public bool? SoportaModuloCare { get; set; }
    public bool? SoportaFidelizacionPuntos { get; set; }
    public bool? Activo { get; set; }
    public int? DiasDuracionDemo { get; set; }
}
