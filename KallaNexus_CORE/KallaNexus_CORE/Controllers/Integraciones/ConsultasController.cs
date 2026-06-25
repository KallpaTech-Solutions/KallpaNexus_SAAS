using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using KallpaNexus.Infrastructure.Integraciones;
using KallpaNexus.Infrastructure.Integraciones.Decolecta;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Integraciones;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class ConsultasController : ControllerBase
{
    private readonly ConsultasIntegracionService _consultas;
    private readonly DecolectaOptions _decolecta;

    public ConsultasController(
        ConsultasIntegracionService consultas,
        IOptions<DecolectaOptions> decolecta)
    {
        _consultas = consultas;
        _decolecta = decolecta.Value;
    }

    [HttpGet("estado")]
    [HasTenantPermission(PermisosApp.ReservasVer)]
    public IActionResult Estado()
    {
        var key = _decolecta.ApiKey ?? "";
        return Ok(new
        {
            decolectaConfigurada = !string.IsNullOrWhiteSpace(key),
            longitudApiKey = key.Length
        });
    }

    /// <summary>
    /// DNI: tabla global Personas → clientes del sistema → Decolecta (guarda en Personas). Respuesta resumida para UI.
    /// </summary>
    [HttpGet("dni")]
    [HasTenantPermission(PermisosApp.ReservasVer)]
    public async Task<IActionResult> ConsultarDni([FromQuery] string numero, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(numero))
        {
            return BadRequest(new { error = "Invalido", mensaje = "Indica el número de DNI." });
        }

        var result = await _consultas.ConsultarDniAsync(numero, ct);
        if (result.Encontrado && result.Datos != null)
        {
            return Ok(result.Datos);
        }

        if (result.StatusCode == 404)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = result.Mensaje });
        }

        return StatusCode(
            result.StatusCode > 0 ? result.StatusCode : 502,
            new { error = "ConsultaExterna", mensaje = result.Mensaje });
    }

    [HttpGet("ruc")]
    [HasTenantPermission(PermisosApp.ReservasVer)]
    public async Task<IActionResult> ConsultarRuc(
        [FromQuery] string numero,
        [FromQuery] bool completo = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(numero))
        {
            return BadRequest(new { error = "Invalido", mensaje = "Indica el RUC." });
        }

        var result = await _consultas.ConsultarRucAsync(numero, completo, ct);
        if (result == null)
        {
            return NotFound(new
            {
                error = "NoEncontrado",
                mensaje = "No se encontró información para ese RUC."
            });
        }

        return Ok(result);
    }

    [HttpGet("tipo-cambio/sunat")]
    [HasTenantPermission(PermisosApp.ReservasVer)]
    public async Task<IActionResult> TipoCambioSunat(
        [FromQuery] DateOnly? date,
        [FromQuery] int? month,
        [FromQuery] int? year,
        CancellationToken ct = default)
    {
        var result = await _consultas.ConsultarTipoCambioSunatAsync(date, month, year, ct);
        if (result == null)
        {
            return NotFound(new
            {
                error = "NoEncontrado",
                mensaje = "No se pudo obtener el tipo de cambio."
            });
        }

        return Ok(result);
    }
}
