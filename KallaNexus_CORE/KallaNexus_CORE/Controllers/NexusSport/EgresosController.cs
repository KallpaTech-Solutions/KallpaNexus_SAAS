using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.API.Swagger;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class EgresosController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EgresosController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.EgresosVer)]
    public async Task<IActionResult> Listar(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] Guid? sucursalId,
        [FromQuery] string? categoria)
    {
        var query = _context.Egresos.AsQueryable();

        if (sucursalId.HasValue)
            query = query.Where(e => e.SucursalId == sucursalId.Value);

        if (!string.IsNullOrWhiteSpace(categoria))
            query = query.Where(e => e.Categoria == categoria);

        if (desde.HasValue)
            query = query.Where(e => e.FechaHora >= desde.Value.ToUniversalTime());

        if (hasta.HasValue)
            query = query.Where(e => e.FechaHora <= hasta.Value.ToUniversalTime().AddDays(1).AddSeconds(-1));

        var items = await query
            .OrderByDescending(e => e.FechaHora)
            .Select(e => new
            {
                e.Id,
                e.FechaHora,
                e.SucursalId,
                e.Categoria,
                e.Descripcion,
                e.Monto,
                e.MedioPagoId,
                e.MedioPagoNombre,
                e.Observaciones,
                e.RegistradoPorNombre,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("resumen")]
    [HasTenantPermission(PermisosApp.EgresosVer)]
    public async Task<IActionResult> Resumen(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] Guid? sucursalId)
    {
        var query = _context.Egresos.AsQueryable();

        if (sucursalId.HasValue)
            query = query.Where(e => e.SucursalId == sucursalId.Value);

        if (desde.HasValue)
            query = query.Where(e => e.FechaHora >= desde.Value.ToUniversalTime());

        if (hasta.HasValue)
            query = query.Where(e => e.FechaHora <= hasta.Value.ToUniversalTime().AddDays(1).AddSeconds(-1));

        var porCategoria = await query
            .GroupBy(e => e.Categoria)
            .Select(g => new { Categoria = g.Key, Total = g.Sum(e => e.Monto), Cantidad = g.Count() })
            .OrderByDescending(g => g.Total)
            .ToListAsync();

        var totalGeneral = porCategoria.Sum(g => g.Total);

        return Ok(new { TotalGeneral = totalGeneral, PorCategoria = porCategoria });
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.EgresosCrear)]
    public async Task<IActionResult> Registrar([FromBody] RegistrarEgresoRequest request)
    {
        if (request.Monto <= 0)
            return BadRequest(new { error = "MontoInvalido", mensaje = "El monto debe ser mayor a 0." });

        if (string.IsNullOrWhiteSpace(request.Descripcion))
            return BadRequest(new { error = "DescripcionRequerida", mensaje = "La descripción es obligatoria." });

        var sucursal = await _context.Sucursales.FirstOrDefaultAsync(s => s.Id == request.SucursalId);
        if (sucursal == null)
            return BadRequest(new { error = "SucursalNoEncontrada", mensaje = "Sucursal no válida." });

        string? medioPagoNombre = null;
        if (request.MedioPagoId.HasValue)
        {
            var medio = await _context.MediosPago.FirstOrDefaultAsync(m => m.Id == request.MedioPagoId.Value);
            medioPagoNombre = medio?.Nombre;
        }

        var nombreStaff = User.FindFirstValue("nombre") ?? User.FindFirstValue(ClaimTypes.Name);

        var egreso = new Egreso
        {
            SucursalId          = request.SucursalId,
            FechaHora           = DateTime.UtcNow,
            Categoria           = string.IsNullOrWhiteSpace(request.Categoria) ? "Otro" : request.Categoria.Trim(),
            Descripcion         = request.Descripcion.Trim(),
            Monto               = request.Monto,
            MedioPagoId         = request.MedioPagoId,
            MedioPagoNombre     = medioPagoNombre,
            Observaciones       = request.Observaciones?.Trim(),
            RegistradoPorNombre = nombreStaff,
        };

        _context.Egresos.Add(egreso);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Egreso registrado.", EgresoId = egreso.Id });
    }

    [HttpDelete("{egresoId:guid}")]
    [HasTenantPermission(PermisosApp.EgresosEliminar)]
    public async Task<IActionResult> Eliminar(Guid egresoId)
    {
        var egreso = await _context.Egresos.FirstOrDefaultAsync(e => e.Id == egresoId);
        if (egreso == null)
            return NotFound(new { error = "NoEncontrado", mensaje = "Egreso no encontrado." });

        _context.Egresos.Remove(egreso);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Egreso eliminado.", EgresoId = egresoId });
    }
}

public class RegistrarEgresoRequest
{
    public Guid SucursalId { get; set; }
    public string Categoria { get; set; } = "Otro";
    public string Descripcion { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public Guid? MedioPagoId { get; set; }
    public string? Observaciones { get; set; }
}
