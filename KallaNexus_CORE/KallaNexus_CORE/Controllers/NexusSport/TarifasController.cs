using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Application.Modulos.Sport.Canchas.Commands.CrearTarifa;
using KallpaNexus.Application.Modulos.Sport.Canchas.Commands.ActualizarTarifa;

using KallpaNexus.API.Infrastructure;
using KallpaNexus.API.Swagger;
using KallpaNexus.Infrastructure.Tenancy;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class TarifasController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly TenantStaffSucursalScopeService _sucursalScope;

    public TarifasController(ApplicationDbContext context, TenantStaffSucursalScopeService sucursalScope)
    {
        _context = context;
        _sucursalScope = sucursalScope;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.CanchasVer)]
    public async Task<IActionResult> ObtenerTodas([FromQuery] Guid? sucursalId)
    {
        var query = _context.TarifasCanchas.AsQueryable();
        var (queryAlcance, errorAlcance) = await _sucursalScope.AplicarAlcanceTarifasAsync(
            User,
            query,
            sucursalId);
        if (errorAlcance != null)
        {
            return errorAlcance.ToActionResult();
        }

        query = queryAlcance!;

        var tarifas = await query
            .Select(t => new
            {
                t.Id,
                t.SucursalId,
                t.Nombre,
                t.HoraInicio,
                t.HoraFin,
                t.AplicaLunesAViernes,
                t.AplicaFinDeSemana,
                t.PrecioPorHora,
                t.Activa,
                CanchasAsignadas = t.Canchas.Count
            })
            .ToListAsync();

        return Ok(tarifas);
    }

    [HttpGet("{tarifaId:guid}")]
    [HasTenantPermission(PermisosApp.CanchasVer)]
    public async Task<IActionResult> ObtenerPorId(Guid tarifaId)
    {
        var tarifa = await _context.TarifasCanchas
            .Where(t => t.Id == tarifaId)
            .Select(t => new
            {
                t.Id,
                t.SucursalId,
                t.Nombre,
                t.HoraInicio,
                t.HoraFin,
                t.AplicaLunesAViernes,
                t.AplicaFinDeSemana,
                t.PrecioPorHora,
                t.Activa,
                CanchaIds = t.Canchas.Select(c => c.Id).ToList()
            })
            .FirstOrDefaultAsync();

        if (tarifa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La tarifa no existe en tu cuenta." });
        }

        return Ok(tarifa);
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> CrearTarifa([FromBody] CrearTarifaSueltaRequest request)
    {
        var sucursalExiste = await _context.Sucursales.AnyAsync(s => s.Id == request.SucursalId);
        if (!sucursalExiste)
        {
            return BadRequest(new { error = "Invalido", mensaje = "La sucursal no existe o no pertenece a tu cuenta." });
        }

        if (request.HoraInicio < 0 || request.HoraFin > 24 || request.HoraInicio >= request.HoraFin)
        {
            return BadRequest(new { error = "HorarioInvalido", mensaje = "Rango de horas incorrecto." });
        }

        if (!request.AplicaLunesAViernes && !request.AplicaFinDeSemana)
        {
            return BadRequest(new { error = "DiasInvalidos", mensaje = "Marca al menos un tipo de día (L–V o fin de semana)." });
        }

        if (request.PrecioPorHora < 0)
        {
            return BadRequest(new { error = "PrecioInvalido", mensaje = "El precio por hora no puede ser negativo." });
        }

        if (request.SucursalId == Guid.Empty)
        {
            return BadRequest(new { error = "SucursalInvalida", mensaje = "Selecciona una sucursal válida." });
        }

        var tarifa = new TarifaCancha
        {
            SucursalId = request.SucursalId,
            Nombre = request.Nombre.Trim(),
            HoraInicio = request.HoraInicio,
            HoraFin = request.HoraFin,
            AplicaLunesAViernes = request.AplicaLunesAViernes,
            AplicaFinDeSemana = request.AplicaFinDeSemana,
            PrecioPorHora = request.PrecioPorHora
        };

        _context.TarifasCanchas.Add(tarifa);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Tarifa agregada al catálogo de la sucursal.", TarifaId = tarifa.Id });
    }

    [HttpPut("{tarifaId:guid}")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Actualizar(Guid tarifaId, [FromBody] ActualizarTarifaRequest request)
    {
        var tarifa = await _context.TarifasCanchas.FirstOrDefaultAsync(t => t.Id == tarifaId);
        if (tarifa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La tarifa no existe en tu cuenta." });
        }

        var horaInicio = request.HoraInicio ?? tarifa.HoraInicio;
        var horaFin = request.HoraFin ?? tarifa.HoraFin;
        if (horaInicio < 0 || horaFin > 24 || horaInicio >= horaFin)
        {
            return BadRequest(new { error = "HorarioInvalido", mensaje = "Rango de horas incorrecto." });
        }

        if (!string.IsNullOrWhiteSpace(request.Nombre))
        {
            tarifa.Nombre = request.Nombre.Trim();
        }

        tarifa.HoraInicio = horaInicio;
        tarifa.HoraFin = horaFin;

        if (request.AplicaLunesAViernes.HasValue)
        {
            tarifa.AplicaLunesAViernes = request.AplicaLunesAViernes.Value;
        }

        if (request.AplicaFinDeSemana.HasValue)
        {
            tarifa.AplicaFinDeSemana = request.AplicaFinDeSemana.Value;
        }

        if (request.PrecioPorHora.HasValue)
        {
            tarifa.PrecioPorHora = request.PrecioPorHora.Value;
        }

        if (request.Activa.HasValue)
        {
            tarifa.Activa = request.Activa.Value;
        }

        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Tarifa actualizada con éxito.", TarifaId = tarifa.Id });
    }

    [HttpDelete("{tarifaId:guid}")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Eliminar(Guid tarifaId)
    {
        var tarifa = await _context.TarifasCanchas
            .Include(t => t.Canchas)
            .FirstOrDefaultAsync(t => t.Id == tarifaId);

        if (tarifa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La tarifa no existe en tu cuenta." });
        }

        var asociaciones = await _context.CanchasTarifas
            .Where(ct => ct.TarifaCanchaId == tarifaId)
            .ToListAsync();

        if (asociaciones.Count > 0)
        {
            _context.CanchasTarifas.RemoveRange(asociaciones);
        }

        _context.TarifasCanchas.Remove(tarifa);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Tarifa eliminada del catálogo.", TarifaId = tarifaId });
    }

    [HttpPost("asignar")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> AsignarACancha([FromBody] AsignarTarifaRequest request)
    {
        var tarifaExiste = await _context.TarifasCanchas.AnyAsync(t => t.Id == request.TarifaCanchaId);
        var cancha = await _context.Canchas.FirstOrDefaultAsync(c => c.Id == request.CanchaId);

        if (!tarifaExiste || cancha == null)
        {
            return BadRequest(new { error = "NoEncontrado", mensaje = "La tarifa o la cancha no existen en tu cuenta." });
        }

        if (request.ReemplazarTodasEnCancha)
        {
            var previas = await _context.CanchasTarifas
                .Where(ct => ct.CanchaId == request.CanchaId)
                .ToListAsync();
            if (previas.Count > 0)
            {
                _context.CanchasTarifas.RemoveRange(previas);
            }
        }

        var yaExisteAsociacion = await _context.CanchasTarifas
            .AnyAsync(ct => ct.CanchaId == request.CanchaId && ct.TarifaCanchaId == request.TarifaCanchaId);

        if (yaExisteAsociacion)
        {
            return Ok(new { Mensaje = "Esta tarifa ya estaba asignada a la cancha." });
        }

        var nuevaAsociacion = new CanchaTarifa
        {
            SucursalId = cancha.SucursalId,
            CanchaId = request.CanchaId,
            TarifaCanchaId = request.TarifaCanchaId
        };

        _context.CanchasTarifas.Add(nuevaAsociacion);
        await _context.SaveChangesAsync();

        var mensaje = request.ReemplazarTodasEnCancha
            ? "Tarifa asignada. Se reemplazaron las tarifas anteriores de esta cancha."
            : "Tarifa asignada correctamente a la cancha.";

        return Ok(new { Mensaje = mensaje });
    }

    [HttpDelete("asignar")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> DesasignarDeCancha([FromQuery] Guid canchaId, [FromQuery] Guid tarifaCanchaId)
    {
        var asociacion = await _context.CanchasTarifas
            .FirstOrDefaultAsync(ct => ct.CanchaId == canchaId && ct.TarifaCanchaId == tarifaCanchaId);

        if (asociacion == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La cancha no tiene asignada esa tarifa." });
        }

        _context.CanchasTarifas.Remove(asociacion);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Tarifa desasignada de la cancha." });
    }
}
