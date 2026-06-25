using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.API.Swagger;
using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.API.Media;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class ConfiguracionNegocioController : ControllerBase
{
    public const string PlantillaWhatsAppPorDefecto =
        "Hola {{nombre}}, le escribimos de {{negocio}} por su reserva en {{cancha}} el {{fecha}} ({{hora}}). Monto: {{monto}}.";

    public const string MensajeLandingWebPorDefecto =
        "Reserva canchas, elige horarios y agrega bebidas. Confirmación manual del local.";

    private readonly ApplicationDbContext _context;
    private readonly TenantWebMediaService _media;

    public ConfiguracionNegocioController(ApplicationDbContext context, TenantWebMediaService media)
    {
        _context = context;
        _media = media;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.CanchasVer)]
    public async Task<IActionResult> Obtener()
    {
        var cfg = await _context.ConfiguracionNegocio.AsNoTracking().FirstOrDefaultAsync();
        if (cfg != null)
        {
            return Ok(Map(cfg));
        }

        var primeraSucursal = await _context.Sucursales
            .AsNoTracking()
            .Where(s => s.Activa)
            .OrderBy(s => s.Nombre)
            .Select(s => new { s.Nombre, s.TelefonoWhatsApp })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            nombreComercial = primeraSucursal?.Nombre ?? "",
            razonSocial = (string?)null,
            telefonoWhatsAppNegocio = SportTelefonoHelper.SoloDigitos(primeraSucursal?.TelefonoWhatsApp),
            mensajeWhatsAppReserva = PlantillaWhatsAppPorDefecto,
            esValoresPorDefecto = true,
            reservaWebActiva = false,
            minutosHoldWeb = 15,
            maxReservasWebPorDniPorDia = 3,
            tituloWebLanding = (string?)null,
            mensajeWebLanding = MensajeLandingWebPorDefecto,
            imagenHeroUrl = (string?)null,
        });
    }

    [HttpPut]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> Guardar([FromBody] GuardarConfiguracionNegocioRequest request)
    {
        string? waNegocio;
        try
        {
            waNegocio = SportTelefonoHelper.NormalizarWhatsAppNegocio(request.TelefonoWhatsAppNegocio);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "TelefonoInvalido", mensaje = ex.Message });
        }

        var mensaje = string.IsNullOrWhiteSpace(request.MensajeWhatsAppReserva)
            ? PlantillaWhatsAppPorDefecto
            : request.MensajeWhatsAppReserva.Trim();

        if (mensaje.Length > 2000)
        {
            return BadRequest(new { error = "MensajeLargo", mensaje = "El mensaje no puede superar 2000 caracteres." });
        }

        var cfg = await _context.ConfiguracionNegocio.FirstOrDefaultAsync();
        if (cfg == null)
        {
            cfg = new ConfiguracionNegocioSport();
            _context.ConfiguracionNegocio.Add(cfg);
        }

        cfg.NombreComercial = request.NombreComercial?.Trim() ?? "";
        cfg.RazonSocial = string.IsNullOrWhiteSpace(request.RazonSocial) ? null : request.RazonSocial.Trim();
        cfg.TelefonoWhatsAppNegocio = waNegocio;
        cfg.MensajeWhatsAppReserva = mensaje;

        if (request.ReservaWebActiva.HasValue)
        {
            cfg.ReservaWebActiva = request.ReservaWebActiva.Value;
        }

        if (request.MinutosHoldWeb.HasValue)
        {
            var min = request.MinutosHoldWeb.Value;
            if (min is < 5 or > 120)
            {
                return BadRequest(new { error = "HoldInvalido", mensaje = "El hold debe estar entre 5 y 120 minutos." });
            }

            cfg.MinutosHoldWeb = min;
        }

        if (request.MaxReservasWebPorDniPorDia.HasValue)
        {
            var max = request.MaxReservasWebPorDniPorDia.Value;
            if (max is < 1 or > 10)
            {
                return BadRequest(new { error = "LimiteInvalido", mensaje = "El máximo por DNI debe estar entre 1 y 10." });
            }

            cfg.MaxReservasWebPorDniPorDia = max;
        }

        if (request.TituloWebLanding != null)
        {
            var t = request.TituloWebLanding.Trim();
            cfg.TituloWebLanding = string.IsNullOrEmpty(t) ? null : t.Length > 200 ? t[..200] : t;
        }

        if (request.MensajeWebLanding != null)
        {
            var m = request.MensajeWebLanding.Trim();
            if (m.Length > 800)
            {
                return BadRequest(new { error = "MensajeLargo", mensaje = "El mensaje de la landing no puede superar 800 caracteres." });
            }

            cfg.MensajeWebLanding = string.IsNullOrEmpty(m) ? null : m;
        }

        await _context.SaveChangesAsync();

        return Ok(new { mensaje = "Configuración guardada.", configuracion = Map(cfg) });
    }

    [HttpPost("imagen-hero")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> SubirImagenHero(IFormFile file)
    {
        if (file == null)
        {
            return BadRequest(new { error = "ArchivoRequerido", mensaje = "Selecciona una imagen." });
        }

        try
        {
            var cfg = await _context.ConfiguracionNegocio.FirstOrDefaultAsync();
            if (cfg == null)
            {
                cfg = new ConfiguracionNegocioSport();
                _context.ConfiguracionNegocio.Add(cfg);
            }

            var anterior = cfg.ImagenHeroRuta;
            var ruta = await _media.GuardarImagenHeroAsync(file);
            if (!string.IsNullOrWhiteSpace(anterior)
                && !string.Equals(anterior.Trim(), ruta, StringComparison.OrdinalIgnoreCase))
            {
                _media.EliminarSiExiste(anterior);
            }

            cfg.ImagenHeroRuta = ruta;
            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Imagen del hero actualizada.", imagenHeroUrl = ruta, configuracion = Map(cfg) });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "ImagenInvalida", mensaje = ex.Message });
        }
    }

    [HttpDelete("imagen-hero")]
    [HasTenantPermission(PermisosApp.CanchasModificar)]
    public async Task<IActionResult> QuitarImagenHero()
    {
        var cfg = await _context.ConfiguracionNegocio.FirstOrDefaultAsync();
        if (cfg == null)
        {
            return Ok(new { mensaje = "Sin imagen personalizada.", configuracion = Map(new ConfiguracionNegocioSport()) });
        }

        _media.EliminarSiExiste(cfg.ImagenHeroRuta);
        cfg.ImagenHeroRuta = null;
        await _context.SaveChangesAsync();
        return Ok(new { mensaje = "Se usará la imagen por defecto.", configuracion = Map(cfg) });
    }

    private static object Map(ConfiguracionNegocioSport cfg) => new
    {
        nombreComercial = cfg.NombreComercial,
        razonSocial = cfg.RazonSocial,
        telefonoWhatsAppNegocio = cfg.TelefonoWhatsAppNegocio ?? "",
        mensajeWhatsAppReserva = string.IsNullOrWhiteSpace(cfg.MensajeWhatsAppReserva)
            ? PlantillaWhatsAppPorDefecto
            : cfg.MensajeWhatsAppReserva,
        esValoresPorDefecto = false,
        reservaWebActiva = cfg.ReservaWebActiva,
        minutosHoldWeb = cfg.MinutosHoldWeb <= 0 ? 15 : cfg.MinutosHoldWeb,
        maxReservasWebPorDniPorDia = cfg.MaxReservasWebPorDniPorDia <= 0 ? 3 : cfg.MaxReservasWebPorDniPorDia,
        tituloWebLanding = cfg.TituloWebLanding,
        mensajeWebLanding = string.IsNullOrWhiteSpace(cfg.MensajeWebLanding)
            ? MensajeLandingWebPorDefecto
            : cfg.MensajeWebLanding,
        imagenHeroUrl = cfg.ImagenHeroRuta,
    };
}

public class GuardarConfiguracionNegocioRequest
{
    public string? NombreComercial { get; set; }
    public string? RazonSocial { get; set; }
    public string? TelefonoWhatsAppNegocio { get; set; }
    public string? MensajeWhatsAppReserva { get; set; }
    public bool? ReservaWebActiva { get; set; }
    public int? MinutosHoldWeb { get; set; }
    public int? MaxReservasWebPorDniPorDia { get; set; }
    public string? TituloWebLanding { get; set; }
    public string? MensajeWebLanding { get; set; }
}
