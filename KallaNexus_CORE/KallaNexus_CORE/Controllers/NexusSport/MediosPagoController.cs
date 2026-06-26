using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.API.Media;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class MediosPagoController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly TenantWebMediaService _media;
    private readonly ITenantProvider _tenantProvider;

    public MediosPagoController(
        ApplicationDbContext context,
        TenantWebMediaService media,
        ITenantProvider tenantProvider)
    {
        _context = context;
        _media = media;
        _tenantProvider = tenantProvider;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.CanchasVer)]
    public async Task<IActionResult> Listar()
    {
        var tenantId = _tenantProvider.GetTenantId();
        if (tenantId is { } tid)
        {
            await TenantMediosPagoSeeder.EnsureDefaultsAsync(_context, tid);
        }
        else
        {
            await TenantMediosPagoSeeder.AlinearVisibleEnWebPagablesAsync(_context);
        }

        var items = await _context.MediosPago
            .OrderBy(m => m.Orden)
            .ThenBy(m => m.Nombre)
            .Select(m => new
            {
                m.Id,
                m.Nombre,
                Tipo = m.Tipo.ToString(),
                m.Activo,
                m.RequiereVoucherOnline,
                m.PermiteSinVoucherPresencial,
                m.EsPasarelaExterna,
                m.VisibleEnWeb,
                m.Orden,
                m.ConfiguracionIntegracionJson
            })
            .ToListAsync();

        return Ok(items.Select(m => new
        {
            m.Id,
            m.Nombre,
            m.Tipo,
            m.Activo,
            m.RequiereVoucherOnline,
            m.PermiteSinVoucherPresencial,
            m.EsPasarelaExterna,
            m.VisibleEnWeb,
            m.Orden,
            qrUrl = ExtraerQrMedio(m.ConfiguracionIntegracionJson),
        }));
    }

    private static string? ExtraerQrMedio(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            foreach (var key in new[] { "qrUrl", "imagenQr", "qr" })
            {
                 if (doc.RootElement.TryGetProperty(key, out var p) && p.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    var s = p.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(s)) return s;
                }
            }
        }
        catch (System.Text.Json.JsonException)
        {
            return null;
        }

        return null;
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Crear([FromBody] CrearMedioPagoRequest request)
    {
        if (!Enum.TryParse<TipoMedioPago>(request.Tipo, true, out var tipo))
        {
            return BadRequest(new { error = "TipoInvalido", mensaje = "Tipo de medio no válido." });
        }

        var medio = new MedioPagoTenant
        {
            Nombre = request.Nombre.Trim(),
            Tipo = tipo,
            Activo = true,
            RequiereVoucherOnline = request.RequiereVoucherOnline,
            PermiteSinVoucherPresencial = request.PermiteSinVoucherPresencial,
            EsPasarelaExterna = request.EsPasarelaExterna,
            VisibleEnWeb = request.VisibleEnWeb ?? EsVisibleEnWebPorDefecto(tipo),
            ConfiguracionIntegracionJson = request.ConfiguracionIntegracionJson,
            Orden = request.Orden
        };

        _context.MediosPago.Add(medio);
        await _context.SaveChangesAsync();

        return Ok(new { Mensaje = "Medio de pago creado.", MedioPagoId = medio.Id });
    }

    [HttpPut("{medioPagoId:guid}")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Actualizar(Guid medioPagoId, [FromBody] ActualizarMedioPagoRequest request)
    {
        var medio = await _context.MediosPago.FirstOrDefaultAsync(m => m.Id == medioPagoId);
        if (medio == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Medio de pago no encontrado." });
        }

        if (!string.IsNullOrWhiteSpace(request.Nombre))
        {
            medio.Nombre = request.Nombre.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Tipo) &&
            Enum.TryParse<TipoMedioPago>(request.Tipo, true, out var tipo))
        {
            medio.Tipo = tipo;
        }

        if (request.Activo.HasValue)
        {
            medio.Activo = request.Activo.Value;
        }

        if (request.RequiereVoucherOnline.HasValue)
        {
            medio.RequiereVoucherOnline = request.RequiereVoucherOnline.Value;
        }

        if (request.PermiteSinVoucherPresencial.HasValue)
        {
            medio.PermiteSinVoucherPresencial = request.PermiteSinVoucherPresencial.Value;
        }

        if (request.EsPasarelaExterna.HasValue)
        {
            medio.EsPasarelaExterna = request.EsPasarelaExterna.Value;
        }

        if (request.Orden.HasValue)
        {
            medio.Orden = request.Orden.Value;
        }

        if (request.VisibleEnWeb.HasValue)
        {
            medio.VisibleEnWeb = request.VisibleEnWeb.Value;
        }

        if (request.ConfiguracionIntegracionJson != null)
        {
            medio.ConfiguracionIntegracionJson = request.ConfiguracionIntegracionJson;
        }

        await _context.SaveChangesAsync();
        return Ok(new { Mensaje = "Medio de pago actualizado.", MedioPagoId = medio.Id });
    }

    [HttpPost("{medioPagoId:guid}/qr-web")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> SubirQrWeb(Guid medioPagoId, [FromForm] IFormFile? file, CancellationToken ct)
    {
        var medio = await _context.MediosPago.FirstOrDefaultAsync(m => m.Id == medioPagoId);
        if (medio == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Medio de pago no encontrado." });
        }

        file ??= Request.Form.Files.GetFile("file") ?? Request.Form.Files.FirstOrDefault();
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "ArchivoRequerido", mensaje = "Selecciona una imagen del QR." });
        }

        try
        {
            var qrAnterior = ExtraerQrMedio(medio.ConfiguracionIntegracionJson);
            var ruta = await _media.GuardarQrMedioPagoWebAsync(medioPagoId, file, ct);
            if (!string.IsNullOrWhiteSpace(qrAnterior)
                && !string.Equals(qrAnterior.Trim(), ruta, StringComparison.OrdinalIgnoreCase))
            {
                _media.EliminarSiExiste(qrAnterior);
            }

            medio.ConfiguracionIntegracionJson = FusionarQrEnJson(medio.ConfiguracionIntegracionJson, ruta);
            await _context.SaveChangesAsync();

            var fisica = _media.RutaFisicaRelativa(ruta);
            if (fisica == null || !System.IO.File.Exists(fisica))
            {
                return StatusCode(500, new { error = "ArchivoNoPersistido", mensaje = "No se pudo guardar el archivo en el servidor." });
            }

            return Ok(new { mensaje = "QR actualizado.", qrUrl = ruta, medioPagoId });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "ImagenInvalida", mensaje = ex.Message });
        }
    }

    private static string FusionarQrEnJson(string? json, string qrUrl)
    {
        var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(json))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    dict[prop.Name] = prop.Value.ValueKind switch
                    {
                        System.Text.Json.JsonValueKind.String => prop.Value.GetString(),
                        System.Text.Json.JsonValueKind.Number => prop.Value.GetDecimal(),
                        System.Text.Json.JsonValueKind.True => true,
                        System.Text.Json.JsonValueKind.False => false,
                        _ => prop.Value.GetRawText(),
                    };
                }
            }
            catch (System.Text.Json.JsonException)
            {
                /* reemplazar json inválido */
            }
        }

        dict["qrUrl"] = qrUrl;
        return System.Text.Json.JsonSerializer.Serialize(dict);
    }

    [HttpDelete("{medioPagoId:guid}")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Eliminar(Guid medioPagoId)
    {
        var medio = await _context.MediosPago.FirstOrDefaultAsync(m => m.Id == medioPagoId);
        if (medio == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Medio de pago no encontrado." });
        }

        medio.Activo = false;
        await _context.SaveChangesAsync();
        return Ok(new { Mensaje = "Medio de pago desactivado.", MedioPagoId = medioPagoId });
    }

    private static bool EsVisibleEnWebPorDefecto(TipoMedioPago tipo) =>
        tipo is TipoMedioPago.Transferencia or TipoMedioPago.Yape or TipoMedioPago.Plin;
}

public class CrearMedioPagoRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string Tipo { get; set; } = "Efectivo";
    public bool RequiereVoucherOnline { get; set; } = true;
    public bool PermiteSinVoucherPresencial { get; set; } = true;
    public bool EsPasarelaExterna { get; set; }
    public bool? VisibleEnWeb { get; set; }
    public string? ConfiguracionIntegracionJson { get; set; }
    public int Orden { get; set; }
}

public class ActualizarMedioPagoRequest
{
    public string? Nombre { get; set; }
    public string? Tipo { get; set; }
    public bool? Activo { get; set; }
    public bool? RequiereVoucherOnline { get; set; }
    public bool? PermiteSinVoucherPresencial { get; set; }
    public bool? EsPasarelaExterna { get; set; }
    public bool? VisibleEnWeb { get; set; }
    public string? ConfiguracionIntegracionJson { get; set; }
    public int? Orden { get; set; }
}
