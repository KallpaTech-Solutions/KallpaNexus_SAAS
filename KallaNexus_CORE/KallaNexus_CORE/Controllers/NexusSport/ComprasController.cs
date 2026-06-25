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
public class ComprasController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ComprasController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.ComprasVer)]
    public async Task<IActionResult> Listar(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] Guid? sucursalId,
        [FromQuery] Guid? productoId)
    {
        var query = _context.ComprasProducto.AsQueryable();

        if (sucursalId.HasValue)
            query = query.Where(c => c.SucursalId == sucursalId.Value);

        if (productoId.HasValue)
            query = query.Where(c => c.ProductoId == productoId.Value);

        if (desde.HasValue)
            query = query.Where(c => c.FechaHora >= desde.Value.ToUniversalTime());

        if (hasta.HasValue)
            query = query.Where(c => c.FechaHora <= hasta.Value.ToUniversalTime().AddDays(1).AddSeconds(-1));

        var items = await query
            .OrderByDescending(c => c.FechaHora)
            .Select(c => new
            {
                c.Id,
                c.FechaHora,
                c.SucursalId,
                c.ProductoId,
                c.ProductoNombre,
                c.Proveedor,
                c.Cantidad,
                c.CostoUnitario,
                c.CostoTotal,
                c.Observaciones,
                c.RegistradoPorNombre,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.ComprasCrear)]
    public async Task<IActionResult> Registrar([FromBody] RegistrarCompraRequest request)
    {
        if (request.Cantidad <= 0)
            return BadRequest(new { error = "CantidadInvalida", mensaje = "La cantidad debe ser mayor a 0." });

        var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == request.ProductoId);
        if (producto == null)
            return NotFound(new { error = "ProductoNoEncontrado", mensaje = "Producto no encontrado." });

        var nombreCajero = User.FindFirstValue("nombre") ?? User.FindFirstValue(ClaimTypes.Name);

        var costoTotal = Math.Round(request.CostoUnitario * request.Cantidad, 2);

        var compra = new CompraProducto
        {
            SucursalId     = producto.SucursalId,
            ProductoId     = producto.Id,
            ProductoNombre = producto.Nombre,
            FechaHora      = DateTime.UtcNow,
            Proveedor      = request.Proveedor?.Trim(),
            Cantidad       = request.Cantidad,
            CostoUnitario  = request.CostoUnitario,
            CostoTotal     = costoTotal,
            Observaciones  = request.Observaciones?.Trim(),
            RegistradoPorNombre = nombreCajero,
        };

        _context.ComprasProducto.Add(compra);

        // Actualizar stock si el producto lo controla
        if (producto.ControlStock)
        {
            producto.StockActual += request.Cantidad;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Compra registrada.",
            CompraId = compra.Id,
            StockActual = producto.ControlStock ? producto.StockActual : (int?)null,
        });
    }

    [HttpDelete("{compraId:guid}")]
    [HasTenantPermission(PermisosApp.VentasProductosGestionar)]
    public async Task<IActionResult> Anular(Guid compraId)
    {
        var compra = await _context.ComprasProducto.FirstOrDefaultAsync(c => c.Id == compraId);
        if (compra == null)
            return NotFound(new { error = "NoEncontrada", mensaje = "Compra no encontrada." });

        // Revertir stock si aplica
        var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == compra.ProductoId);
        if (producto?.ControlStock == true)
        {
            producto.StockActual = Math.Max(0, producto.StockActual - compra.Cantidad);
        }

        _context.ComprasProducto.Remove(compra);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Compra anulada.", CompraId = compraId });
    }
}

public class RegistrarCompraRequest
{
    public Guid ProductoId { get; set; }
    public string? Proveedor { get; set; }
    public int Cantidad { get; set; }
    public decimal CostoUnitario { get; set; }
    public string? Observaciones { get; set; }
}
