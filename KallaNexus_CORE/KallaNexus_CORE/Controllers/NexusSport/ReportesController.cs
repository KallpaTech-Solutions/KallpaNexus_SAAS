using System.Security.Claims;
using System.Text.Json;
using KallpaNexus.API.Infrastructure;
using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.API.Swagger;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class ReportesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly TenantStaffSucursalScopeService _sucursalScope;

    public ReportesController(ApplicationDbContext context, TenantStaffSucursalScopeService sucursalScope)
    {
        _context = context;
        _sucursalScope = sucursalScope;
    }

    [HttpGet("financieros")]
    [HasTenantPermission(PermisosApp.ReportesFinancieros)]
    public async Task<IActionResult> Financieros(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] Guid? sucursalId)
    {
        var (payload, error) = await CalcularFinancieroAsync(desde, hasta, sucursalId);
        if (error != null)
        {
            return error.ToActionResult();
        }

        return Ok(payload);
    }

    /// <summary>Guarda una instantánea con código único (oficial para auditoría / PDF archivado).</summary>
    [HttpPost("financieros/archivar")]
    [HasTenantPermission(PermisosApp.ReportesFinancieros)]
    public async Task<IActionResult> ArchivarFinanciero(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] Guid? sucursalId,
        [FromBody] ArchivarReporteFinancieroRequest? meta)
    {
        if (!sucursalId.HasValue)
        {
            return BadRequest(new { error = "SedeRequerida", mensaje = "Indica la sucursal del reporte." });
        }

        var (payload, error) = await CalcularFinancieroAsync(desde, hasta, sucursalId);
        if (error != null)
        {
            return error.ToActionResult();
        }

        // Snapshot general: financiero + ventas + egresos + inventario
        var snapshot = await ConstruirSnapshotGeneralAsync(payload!, sucursalId.Value);

        var ahora = DateTime.UtcNow;
        var codigo = await GenerarCodigoReporteAsync(ahora);

        var staffId = ObtenerStaffId(User);
        var archivo = new ReporteFinancieroArchivo
        {
            Codigo = codigo,
            SucursalId = sucursalId.Value,
            SucursalNombre = meta?.SucursalNombre?.Trim(),
            Ciudad = meta?.Ciudad?.Trim(),
            DesdeUtc = payload!.desdeUtc,
            HastaUtc = payload.hastaUtc,
            GeneradoEnUtc = ahora,
            GeneradoPorStaffId = staffId,
            GeneradoPorNombre = meta?.GeneradoPorNombre?.Trim(),
            DatosJson = JsonSerializer.Serialize(snapshot)
        };

        _context.ReportesFinancierosArchivo.Add(archivo);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            codigo,
            archivoId = archivo.Id,
            generadoEnUtc = archivo.GeneradoEnUtc,
            datos = snapshot
        });
    }

    /// <summary>
    /// Combina el payload financiero de reservas con resúmenes de ventas, egresos e
    /// inventario para archivar un reporte general del negocio.
    /// </summary>
    private async Task<object> ConstruirSnapshotGeneralAsync(FinancieroPayload payload, Guid sucursalId)
    {
        var desdeUtc = payload.desdeUtc;
        var hastaUtc = payload.hastaUtc;

        var ventasRango = await _context.Ventas
            .Include(v => v.Items)
            .Where(v => v.SucursalId == sucursalId && v.FechaHora >= desdeUtc && v.FechaHora < hastaUtc)
            .ToListAsync();

        var ventas = new
        {
            total = ventasRango.Sum(v => v.MontoTotal),
            cantidad = ventasRango.Count,
            porMedio = ventasRango
                .GroupBy(v => v.MedioPagoNombre ?? "Sin especificar")
                .Select(g => new { medio = g.Key, monto = g.Sum(x => x.MontoTotal), cantidad = g.Count() })
                .OrderByDescending(x => x.monto)
                .ToList(),
            topProductos = ventasRango
                .SelectMany(v => v.Items)
                .GroupBy(i => i.ProductoNombre)
                .Select(g => new { nombre = g.Key, cantidad = g.Sum(x => x.Cantidad), monto = g.Sum(x => x.Subtotal) })
                .OrderByDescending(x => x.monto)
                .Take(10)
                .ToList(),
        };

        var egresosRango = await _context.Egresos
            .Where(e => e.SucursalId == sucursalId && e.FechaHora >= desdeUtc && e.FechaHora < hastaUtc)
            .ToListAsync();

        var egresos = new
        {
            total = egresosRango.Sum(e => e.Monto),
            cantidad = egresosRango.Count,
            porCategoria = egresosRango
                .GroupBy(e => e.Categoria)
                .Select(g => new { categoria = g.Key, total = g.Sum(x => x.Monto), cantidad = g.Count() })
                .OrderByDescending(x => x.total)
                .ToList(),
        };

        var productosControl = await _context.Productos
            .Where(p => p.SucursalId == sucursalId && p.ControlStock && p.Activo)
            .OrderBy(p => p.Nombre)
            .ToListAsync();

        var inventario = new
        {
            conControl = productosControl.Count,
            agotados = productosControl.Count(p => p.StockActual == 0),
            enAlerta = productosControl.Count(p =>
                p.PuntoAlerta.HasValue && p.StockActual > 0 && p.StockActual <= p.PuntoAlerta.Value),
            valorizado = productosControl.Sum(p => p.StockActual * p.Precio),
            productos = productosControl
                .Select(p => new
                {
                    nombre = p.Nombre,
                    categoria = p.Categoria,
                    stock = p.StockActual,
                    puntoAlerta = p.PuntoAlerta,
                    precio = p.Precio,
                })
                .ToList(),
        };

        return new
        {
            payload.desdeUtc,
            payload.hastaUtc,
            payload.reservasActivas,
            payload.totalMontoReservas,
            payload.pagosConfirmados,
            payload.reservasConAlMenosUnPago,
            payload.totalCobradoConfirmado,
            payload.pendienteCobroEstimado,
            payload.porMedio,
            ventas,
            egresos,
            inventario,
        };
    }

    [HttpGet("financieros/archivados")]
    [HasTenantPermission(PermisosApp.ReportesFinancieros)]
    public async Task<IActionResult> ListarArchivados([FromQuery] int limite = 20)
    {
        limite = Math.Clamp(limite, 1, 100);
        var (permitidas, accesoTodas, errorLista) = await _sucursalScope.ResolverSucursalesStaffAsync(User);
        if (errorLista != null)
        {
            return errorLista.ToActionResult();
        }

        var query = _context.ReportesFinancierosArchivo.AsNoTracking();
        if (!accesoTodas)
        {
            query = query.Where(r => permitidas!.Contains(r.SucursalId));
        }

        var lista = await query
            .OrderByDescending(r => r.GeneradoEnUtc)
            .Take(limite)
            .Select(r => new
            {
                r.Id,
                r.Codigo,
                r.SucursalId,
                r.SucursalNombre,
                r.Ciudad,
                r.DesdeUtc,
                r.HastaUtc,
                r.GeneradoEnUtc,
                r.GeneradoPorNombre
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("financieros/archivados/{codigo}")]
    [HasTenantPermission(PermisosApp.ReportesFinancieros)]
    public async Task<IActionResult> ObtenerArchivado(string codigo)
    {
        var archivo = await _context.ReportesFinancierosArchivo.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Codigo == codigo);
        if (archivo == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "No existe un reporte archivado con ese código." });
        }

        var errorAlcance = await _sucursalScope.ValidarAccesoSucursalAsync(User, archivo.SucursalId);
        if (errorAlcance != null)
        {
            return errorAlcance.ToActionResult();
        }

        var datos = JsonSerializer.Deserialize<object>(archivo.DatosJson);
        return Ok(new
        {
            archivo.Codigo,
            archivo.SucursalId,
            archivo.SucursalNombre,
            archivo.Ciudad,
            archivo.DesdeUtc,
            archivo.HastaUtc,
            archivo.GeneradoEnUtc,
            archivo.GeneradoPorNombre,
            datos
        });
    }

    [HttpDelete("financieros/archivados/{codigo}")]
    [HasTenantPermission(PermisosApp.ReportesFinancierosEliminar)]
    public async Task<IActionResult> EliminarArchivado(string codigo)
    {
        var archivo = await _context.ReportesFinancierosArchivo
            .FirstOrDefaultAsync(r => r.Codigo == codigo);
        if (archivo == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "No existe un reporte archivado con ese código." });
        }

        var errorAlcance = await _sucursalScope.ValidarAccesoSucursalAsync(User, archivo.SucursalId);
        if (errorAlcance != null)
        {
            return errorAlcance.ToActionResult();
        }

        _context.ReportesFinancierosArchivo.Remove(archivo);
        await _context.SaveChangesAsync();

        return Ok(new { mensaje = "Reporte archivado eliminado.", codigo });
    }

    private async Task<string> GenerarCodigoReporteAsync(DateTime generadoUtc)
    {
        var y = generadoUtc.Year;
        var m = generadoUtc.Month;
        var inicioMes = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var finMes = inicioMes.AddMonths(1);
        var count = await _context.ReportesFinancierosArchivo.CountAsync(r =>
            r.GeneradoEnUtc >= inicioMes && r.GeneradoEnUtc < finMes);
        return $"KN-{y}-{m:D2}-{(count + 1):D4}";
    }

    private static Guid? ObtenerStaffId(ClaimsPrincipal user)
    {
        var raw = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private async Task<(FinancieroPayload? payload, TenantStaffSucursalScopeError? error)> CalcularFinancieroAsync(
        DateTime? desde,
        DateTime? hasta,
        Guid? sucursalId)
    {
        var desdeUtc = desde.HasValue
            ? DateTime.SpecifyKind(desde.Value, DateTimeKind.Utc)
            : DateTime.UtcNow.Date.AddDays(-30);
        var hastaUtc = hasta.HasValue
            ? DateTime.SpecifyKind(hasta.Value, DateTimeKind.Utc)
            : DateTime.UtcNow.Date.AddDays(1);

        var reservasQuery = _context.Reservas
            .Where(r =>
                r.HoraInicio >= desdeUtc &&
                r.HoraInicio < hastaUtc &&
                r.Estado != EstadoReserva.Cancelada);

        var (queryAlcance, errorAlcance) = await _sucursalScope.AplicarAlcanceReservasAsync(
            User,
            reservasQuery,
            sucursalId);
        if (errorAlcance != null)
        {
            return (null, errorAlcance);
        }

        reservasQuery = queryAlcance!;

        var reservasEnRango = await reservasQuery
            .Select(r => new { r.Id, r.MontoTotal, r.Estado })
            .ToListAsync();

        var reservaIds = reservasEnRango.Select(r => r.Id).ToHashSet();

        var pagos = await _context.PagosReserva
            .Where(p =>
                p.Estado == EstadoPagoReserva.Confirmado &&
                reservaIds.Contains(p.ReservaId))
            .Select(p => new
            {
                p.Monto,
                MedioNombre = p.MedioPago.Nombre,
                p.ReservaId
            })
            .ToListAsync();

        var totalCobradoConfirmado = pagos.Sum(p => p.Monto);
        var totalMontoReservas = reservasEnRango.Sum(r => r.MontoTotal);
        var reservaIdsConPago = pagos.Select(p => p.ReservaId).Distinct().Count();

        var porMedio = pagos
            .GroupBy(p => p.MedioNombre)
            .Select(g => new MedioPayload(g.Key, g.Sum(x => x.Monto), g.Count()))
            .OrderByDescending(x => x.monto)
            .ToList();

        return (new FinancieroPayload(
            desdeUtc,
            hastaUtc,
            reservasEnRango.Count,
            totalMontoReservas,
            pagos.Count,
            reservaIdsConPago,
            totalCobradoConfirmado,
            Math.Max(0, totalMontoReservas - totalCobradoConfirmado),
            porMedio), null);
    }

    private sealed record MedioPayload(string medio, decimal monto, int cantidad);

    private sealed record FinancieroPayload(
        DateTime desdeUtc,
        DateTime hastaUtc,
        int reservasActivas,
        decimal totalMontoReservas,
        int pagosConfirmados,
        int reservasConAlMenosUnPago,
        decimal totalCobradoConfirmado,
        decimal pendienteCobroEstimado,
        List<MedioPayload> porMedio);
}

public class ArchivarReporteFinancieroRequest
{
    public string? SucursalNombre { get; set; }
    public string? Ciudad { get; set; }
    public string? GeneradoPorNombre { get; set; }
}
