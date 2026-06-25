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
public class VentasController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VentasController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.VentasVer)]
    public async Task<IActionResult> Listar(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] Guid? sucursalId)
    {
        var query = _context.Ventas.Include(v => v.Items).AsQueryable();

        if (sucursalId.HasValue)
            query = query.Where(v => v.SucursalId == sucursalId.Value);

        if (desde.HasValue)
            query = query.Where(v => v.FechaHora >= desde.Value.ToUniversalTime());

        if (hasta.HasValue)
            query = query.Where(v => v.FechaHora <= hasta.Value.ToUniversalTime().AddDays(1).AddSeconds(-1));

        var ventas = await query
            .OrderByDescending(v => v.FechaHora)
            .Select(v => new
            {
                v.Id,
                v.FechaHora,
                v.SucursalId,
                v.ClienteNombre,
                v.MedioPagoId,
                v.MedioPagoNombre,
                v.MontoTotal,
                v.Observaciones,
                v.RegistradoPorNombre,
                Items = v.Items.Select(i => new
                {
                    i.Id,
                    i.ProductoId,
                    i.ProductoNombre,
                    i.PrecioUnitario,
                    i.Cantidad,
                    i.Subtotal,
                }).ToList(),
            })
            .ToListAsync();

        return Ok(ventas);
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.VentasCrear)]
    public async Task<IActionResult> Crear([FromBody] CrearVentaRequest request)
    {
        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { error = "SinItems", mensaje = "La venta debe tener al menos un ítem." });

        var sucursal = await _context.Sucursales.FirstOrDefaultAsync(s => s.Id == request.SucursalId);
        if (sucursal == null)
            return BadRequest(new { error = "SucursalNoEncontrada", mensaje = "Sucursal no válida." });

        // Snapshot del nombre del medio de pago
        string? medioPagoNombre = null;
        if (request.MedioPagoId.HasValue)
        {
            var medio = await _context.MediosPago.FirstOrDefaultAsync(m => m.Id == request.MedioPagoId.Value);
            medioPagoNombre = medio?.Nombre;
        }

        // Nombre del staff que registra
        var nombreCajero = User.FindFirstValue("nombre") ?? User.FindFirstValue(ClaimTypes.Name);

        var items = request.Items.Select(i => new VentaItem
        {
            ProductoId = i.ProductoId,
            ProductoNombre = i.ProductoNombre.Trim(),
            PrecioUnitario = i.PrecioUnitario,
            Cantidad = i.Cantidad,
            Subtotal = Math.Round(i.PrecioUnitario * i.Cantidad, 2),
        }).ToList();

        var montoTotal = items.Sum(i => i.Subtotal);

        var venta = new Venta
        {
            SucursalId = request.SucursalId,
            FechaHora = DateTime.UtcNow,
            ClienteNombre = request.ClienteNombre?.Trim(),
            ReservaId = request.ReservaId,
            MedioPagoId = request.MedioPagoId,
            MedioPagoNombre = medioPagoNombre,
            MontoTotal = montoTotal,
            Observaciones = request.Observaciones?.Trim(),
            RegistradoPorNombre = nombreCajero,
            Items = items,
        };

        _context.Ventas.Add(venta);

        // Descontar stock de los productos que lo controlan
        foreach (var item in items)
        {
            if (item.ProductoId.HasValue)
            {
                var prod = await _context.Productos.FirstOrDefaultAsync(p => p.Id == item.ProductoId.Value);
                if (prod?.ControlStock == true)
                    prod.StockActual = Math.Max(0, prod.StockActual - item.Cantidad);
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Venta registrada.", VentaId = venta.Id, MontoTotal = venta.MontoTotal });
    }

    [HttpDelete("{ventaId:guid}")]
    [HasTenantPermission(PermisosApp.VentasCrear)]
    public async Task<IActionResult> Anular(Guid ventaId)
    {
        var venta = await _context.Ventas.Include(v => v.Items).FirstOrDefaultAsync(v => v.Id == ventaId);
        if (venta == null)
            return NotFound(new { error = "NoEncontrada", mensaje = "Venta no encontrada." });

        // Reponer stock de los productos vendidos
        foreach (var item in venta.Items)
        {
            if (item.ProductoId.HasValue)
            {
                var prod = await _context.Productos.FindAsync(item.ProductoId.Value);
                if (prod != null && prod.ControlStock)
                    prod.StockActual += item.Cantidad;
            }
        }

        _context.VentaItems.RemoveRange(venta.Items);
        _context.Ventas.Remove(venta);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Venta anulada. Stock repuesto.", VentaId = ventaId });
    }
}

public class CrearVentaRequest
{
    public Guid SucursalId { get; set; }
    public string? ClienteNombre { get; set; }
    public Guid? ReservaId { get; set; }
    public Guid? MedioPagoId { get; set; }
    public string? Observaciones { get; set; }
    public List<CrearVentaItemRequest> Items { get; set; } = [];
}

public class CrearVentaItemRequest
{
    public Guid? ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public decimal PrecioUnitario { get; set; }
    public int Cantidad { get; set; } = 1;
}
