using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class SucursalesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly TenantSuscripcionService _suscripcion;

    public SucursalesController(ApplicationDbContext context, TenantSuscripcionService suscripcion)
    {
        _context = context;
        _suscripcion = suscripcion;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.CanchasVer)]
    public async Task<IActionResult> ObtenerTodas()
    {
        var sucursales = await _context.Sucursales
            .Select(s => new
            {
                s.Id,
                s.Nombre,
                s.Direccion,
                s.Ciudad,
                s.Telefono,
                s.TelefonoWhatsApp,
                s.Activa,
                s.Latitud,
                s.Longitud,
                s.EnlaceGoogleMaps,
                TotalCanchas = s.Canchas.Count
            })
            .ToListAsync();

        return Ok(sucursales);
    }

    [HttpGet("{sucursalId:guid}")]
    [HasTenantPermission(PermisosApp.CanchasVer)]
    public async Task<IActionResult> ObtenerPorId(Guid sucursalId)
    {
        var sucursal = await _context.Sucursales
            .Where(s => s.Id == sucursalId)
            .Select(s => new
            {
                s.Id,
                s.Nombre,
                s.Direccion,
                s.Telefono,
                s.TelefonoWhatsApp,
                s.Activa,
                Canchas = s.Canchas.Select(c => new { c.Id, c.Nombre, c.EstaActiva }).ToList()
            })
            .FirstOrDefaultAsync();

        if (sucursal == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La sucursal no existe en tu cuenta." });
        }

        return Ok(sucursal);
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Crear([FromBody] CrearSucursalRequest request)
    {
        var limite = await _suscripcion.ValidarPuedeAgregarSucursalAsync();
        if (!limite.Ok)
        {
            return BadRequest(new { error = limite.Codigo, mensaje = limite.Mensaje });
        }

        var sucursal = new Sucursal
        {
            Nombre = request.Nombre.Trim(),
            Direccion = request.Direccion.Trim(),
            Ciudad = string.IsNullOrWhiteSpace(request.Ciudad) ? null : request.Ciudad.Trim(),
            Telefono = request.Telefono.Trim(),
            TelefonoWhatsApp = string.IsNullOrWhiteSpace(request.TelefonoWhatsApp)
                ? null
                : request.TelefonoWhatsApp.Trim(),
            Activa = true,
            Latitud = request.Latitud,
            Longitud = request.Longitud,
            EnlaceGoogleMaps = string.IsNullOrWhiteSpace(request.EnlaceGoogleMaps)
                ? null
                : request.EnlaceGoogleMaps.Trim(),
        };

        _context.Sucursales.Add(sucursal);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Sucursal creada.", SucursalId = sucursal.Id });
    }

    [HttpPut("{sucursalId:guid}")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Actualizar(Guid sucursalId, [FromBody] ActualizarSucursalRequest request)
    {
        var sucursal = await _context.Sucursales.FirstOrDefaultAsync(s => s.Id == sucursalId);
        if (sucursal == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La sucursal no existe en tu cuenta." });
        }

        if (!string.IsNullOrWhiteSpace(request.Nombre))
        {
            sucursal.Nombre = request.Nombre.Trim();
        }

        if (request.Direccion != null)
        {
            sucursal.Direccion = request.Direccion.Trim();
        }

        if (request.Ciudad != null)
        {
            sucursal.Ciudad = string.IsNullOrWhiteSpace(request.Ciudad) ? null : request.Ciudad.Trim();
        }

        if (request.Telefono != null)
        {
            sucursal.Telefono = request.Telefono.Trim();
        }

        if (request.TelefonoWhatsApp != null)
        {
            sucursal.TelefonoWhatsApp = string.IsNullOrWhiteSpace(request.TelefonoWhatsApp)
                ? null
                : request.TelefonoWhatsApp.Trim();
        }

        if (request.Activa.HasValue)
        {
            sucursal.Activa = request.Activa.Value;
        }

        if (request.Latitud.HasValue && request.Longitud.HasValue)
        {
            sucursal.Latitud = request.Latitud.Value;
            sucursal.Longitud = request.Longitud.Value;
        }

        if (request.EnlaceGoogleMaps != null)
        {
            sucursal.EnlaceGoogleMaps = string.IsNullOrWhiteSpace(request.EnlaceGoogleMaps)
                ? null
                : request.EnlaceGoogleMaps.Trim();
        }

        await _context.SaveChangesAsync();
        return Ok(new { Mensaje = "Sucursal actualizada.", SucursalId = sucursal.Id });
    }

    [HttpDelete("{sucursalId:guid}")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Eliminar(Guid sucursalId)
    {
        var sucursal = await _context.Sucursales
            .Include(s => s.Canchas)
            .FirstOrDefaultAsync(s => s.Id == sucursalId);

        if (sucursal == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La sucursal no existe en tu cuenta." });
        }

        if (sucursal.Canchas.Any(c => c.EstaActiva))
        {
            sucursal.Activa = false;
            await _context.SaveChangesAsync();
            return Ok(new
            {
                Mensaje = "La sucursal tiene canchas activas; se desactivó en lugar de eliminarse.",
                SucursalId = sucursal.Id,
                sucursal.Activa
            });
        }

        _context.Sucursales.Remove(sucursal);
        await _context.SaveChangesAsync();
        return Ok(new { Mensaje = "Sucursal eliminada.", SucursalId = sucursalId });
    }
}

public class CrearSucursalRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Direccion { get; set; } = string.Empty;
    public string? Ciudad { get; set; }
    public string Telefono { get; set; } = string.Empty;
    public string? TelefonoWhatsApp { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public string? EnlaceGoogleMaps { get; set; }
}

public class ActualizarSucursalRequest
{
    public string? Nombre { get; set; }
    public string? Direccion { get; set; }
    public string? Ciudad { get; set; }
    public string? Telefono { get; set; }
    public string? TelefonoWhatsApp { get; set; }
    public bool? Activa { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public string? EnlaceGoogleMaps { get; set; }
}
