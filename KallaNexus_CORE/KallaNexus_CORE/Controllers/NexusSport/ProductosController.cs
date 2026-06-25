using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.API.Swagger;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ProductosController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.VentasVer)]
    public async Task<IActionResult> Listar([FromQuery] Guid? sucursalId)
    {
        var query = _context.Productos.Where(p => p.Activo);

        if (sucursalId.HasValue)
            query = query.Where(p => p.SucursalId == sucursalId.Value);

        var items = await query
            .OrderBy(p => p.Categoria)
            .ThenBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Descripcion,
                p.Categoria,
                p.Precio,
                p.Activo,
                p.SucursalId,
                p.ControlStock,
                p.StockActual,
                p.PuntoAlerta,
                p.VisibleEnWeb,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("todos")]
    [HasTenantPermission(PermisosApp.VentasProductosGestionar)]
    public async Task<IActionResult> ListarTodos([FromQuery] Guid? sucursalId)
    {
        var query = _context.Productos.AsQueryable();

        if (sucursalId.HasValue)
            query = query.Where(p => p.SucursalId == sucursalId.Value);

        var items = await query
            .OrderBy(p => p.Activo ? 0 : 1)
            .ThenBy(p => p.Categoria)
            .ThenBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Descripcion,
                p.Categoria,
                p.Precio,
                p.Activo,
                p.SucursalId,
                p.ControlStock,
                p.StockActual,
                p.PuntoAlerta,
                p.VisibleEnWeb,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.VentasProductosGestionar)]
    public async Task<IActionResult> Crear([FromBody] CrearProductoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest(new { error = "NombreRequerido", mensaje = "El nombre del producto es obligatorio." });

        if (request.Precio < 0)
            return BadRequest(new { error = "PrecioInvalido", mensaje = "El precio no puede ser negativo." });

        var sucursal = await _context.Sucursales.FirstOrDefaultAsync(s => s.Id == request.SucursalId);
        if (sucursal == null)
            return BadRequest(new { error = "SucursalNoEncontrada", mensaje = "Sucursal no válida." });

        var producto = new Producto
        {
            SucursalId    = request.SucursalId,
            Nombre        = request.Nombre.Trim(),
            Descripcion   = request.Descripcion?.Trim(),
            Categoria     = string.IsNullOrWhiteSpace(request.Categoria) ? "Otro" : request.Categoria.Trim(),
            Precio        = request.Precio,
            Activo        = true,
            ControlStock  = request.ControlStock,
            StockActual   = request.StockInicial ?? 0,
            PuntoAlerta   = request.PuntoAlerta,
            VisibleEnWeb  = request.VisibleEnWeb,
        };

        _context.Productos.Add(producto);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Producto creado.", ProductoId = producto.Id });
    }

    [HttpPut("{productoId:guid}")]
    [HasTenantPermission(PermisosApp.VentasProductosGestionar)]
    public async Task<IActionResult> Actualizar(Guid productoId, [FromBody] ActualizarProductoRequest request)
    {
        var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == productoId);
        if (producto == null)
            return NotFound(new { error = "NoEncontrado", mensaje = "Producto no encontrado." });

        if (!string.IsNullOrWhiteSpace(request.Nombre))
            producto.Nombre = request.Nombre.Trim();

        if (request.Descripcion != null)
            producto.Descripcion = request.Descripcion.Trim();

        if (!string.IsNullOrWhiteSpace(request.Categoria))
            producto.Categoria = request.Categoria.Trim();

        if (request.Precio.HasValue)
        {
            if (request.Precio.Value < 0)
                return BadRequest(new { error = "PrecioInvalido", mensaje = "El precio no puede ser negativo." });
            producto.Precio = request.Precio.Value;
        }

        if (request.Activo.HasValue)
            producto.Activo = request.Activo.Value;

        if (request.ControlStock.HasValue)
            producto.ControlStock = request.ControlStock.Value;

        if (request.StockActual.HasValue)
            producto.StockActual = request.StockActual.Value;

        if (request.PuntoAlerta.HasValue)
            producto.PuntoAlerta = request.PuntoAlerta.Value == -1 ? null : request.PuntoAlerta.Value;

        if (request.VisibleEnWeb.HasValue)
            producto.VisibleEnWeb = request.VisibleEnWeb.Value;

        await _context.SaveChangesAsync();
        return Ok(new { Mensaje = "Producto actualizado.", ProductoId = producto.Id });
    }

    [HttpDelete("{productoId:guid}")]
    [HasTenantPermission(PermisosApp.VentasProductosGestionar)]
    public async Task<IActionResult> Desactivar(Guid productoId)
    {
        var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == productoId);
        if (producto == null)
            return NotFound(new { error = "NoEncontrado", mensaje = "Producto no encontrado." });

        producto.Activo = false;
        await _context.SaveChangesAsync();
        return Ok(new { Mensaje = "Producto desactivado.", ProductoId = productoId });
    }
}

public class CrearProductoRequest
{
    public Guid SucursalId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string Categoria { get; set; } = "Otro";
    public decimal Precio { get; set; }
    public bool ControlStock { get; set; } = false;
    public int? StockInicial { get; set; }
    public int? PuntoAlerta { get; set; }
    public bool VisibleEnWeb { get; set; }
}

public class ActualizarProductoRequest
{
    public string? Nombre { get; set; }
    public string? Descripcion { get; set; }
    public string? Categoria { get; set; }
    public decimal? Precio { get; set; }
    public bool? Activo { get; set; }
    public bool? ControlStock { get; set; }
    public int? StockActual { get; set; }
    /// <summary>Usar -1 para quitar el punto de alerta.</summary>
    public int? PuntoAlerta { get; set; }
    public bool? VisibleEnWeb { get; set; }
}
