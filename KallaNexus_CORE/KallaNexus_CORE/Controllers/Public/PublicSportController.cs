using System.Text.Json;
using KallpaNexus.API.Controllers.NexusSport;
using KallpaNexus.API.Media;
using KallpaNexus.API.Swagger;
using KallpaNexus.Application.Modulos.Sport.Canchas.DTOs;
using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Application.Modulos.Sport.Reservas;
using KallpaNexus.Domain.Entities.Compartido;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.Infrastructure.Integraciones;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using KallpaNexus.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.Public;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Public)]
[ApiController]
[Route("api/public/{tenantSlug}")]
public class PublicSportController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly MasterDbContext _masterDb;
    private readonly ITenantProvider _tenantProvider;
    private readonly ConsultasIntegracionService _consultas;
    private readonly TenantWebMediaService _mediaWeb;

    public PublicSportController(
        ApplicationDbContext context,
        MasterDbContext masterDb,
        ITenantProvider tenantProvider,
        ConsultasIntegracionService consultas,
        TenantWebMediaService mediaWeb)
    {
        _context = context;
        _masterDb = masterDb;
        _tenantProvider = tenantProvider;
        _consultas = consultas;
        _mediaWeb = mediaWeb;
    }

    [HttpGet("media")]
    public IActionResult DescargarMediaPublica(string tenantSlug, [FromQuery] string ruta)
    {
        if (string.IsNullOrWhiteSpace(ruta) || !ruta.TrimStart().StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "RutaInvalida", mensaje = "Ruta de archivo no válida." });
        }

        var physical = _mediaWeb.RutaFisicaRelativa(ruta.Trim());
        if (physical == null || !System.IO.File.Exists(physical))
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Archivo no encontrado." });
        }

        var ext = Path.GetExtension(physical).ToLowerInvariant();
        var contentType = ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream",
        };

        return PhysicalFile(physical, contentType);
    }

    [HttpGet("negocio")]
    public async Task<IActionResult> ObtenerNegocio(string tenantSlug)
    {
        var cfg = await ObtenerConfigAsync();
        var activa = cfg?.ReservaWebActiva ?? false;
        if (activa)
        {
            activa = await ReservaWebPermitidaPlataformaAsync();
        }

        var sucursalesRaw = await _context.Sucursales
            .AsNoTracking()
            .Where(s => s.Activa)
            .OrderBy(s => s.Nombre)
            .Select(s => new
            {
                s.Id,
                s.Nombre,
                s.Ciudad,
                s.Direccion,
                s.Telefono,
                s.TelefonoWhatsApp,
                s.Latitud,
                s.Longitud,
                s.EnlaceGoogleMaps,
            })
            .ToListAsync();

        var slugsAsignados = new List<(Guid Id, string Slug)>();
        var sucursales = new List<object>();
        foreach (var s in sucursalesRaw)
        {
            var baseSlug = PublicSedeSlugHelper.SlugFromNombre(s.Nombre);
            var slugSede = baseSlug;
            if (slugsAsignados.Any(x => x.Slug == slugSede))
            {
                slugSede = $"{baseSlug}-{s.Id.ToString("N")[..6]}";
            }

            slugsAsignados.Add((s.Id, slugSede));
            sucursales.Add(new
            {
                s.Id,
                slug = slugSede,
                s.Nombre,
                s.Ciudad,
                s.Direccion,
                telefono = s.Telefono,
                telefonoWhatsApp = SportTelefonoHelper.SoloDigitos(s.TelefonoWhatsApp),
                latitud = s.Latitud,
                longitud = s.Longitud,
                enlaceGoogleMaps = s.EnlaceGoogleMaps,
            });
        }

        var nombre = string.IsNullOrWhiteSpace(cfg?.NombreComercial)
            ? sucursalesRaw.FirstOrDefault()?.Nombre ?? tenantSlug
            : cfg!.NombreComercial;

        var tituloLanding = string.IsNullOrWhiteSpace(cfg?.TituloWebLanding)
            ? nombre
            : cfg!.TituloWebLanding!.Trim();

        var mensajeLanding = string.IsNullOrWhiteSpace(cfg?.MensajeWebLanding)
            ? ConfiguracionNegocioController.MensajeLandingWebPorDefecto
            : cfg!.MensajeWebLanding!;

        return Ok(new
        {
            slug = tenantSlug.Trim().ToLowerInvariant(),
            nombreComercial = nombre,
            telefonoWhatsAppNegocio = SportTelefonoHelper.SoloDigitos(cfg?.TelefonoWhatsAppNegocio),
            tituloLanding,
            mensajeLanding,
            imagenHeroUrl = cfg?.ImagenHeroRuta,
            reservaWebActiva = activa,
            minutosHoldWeb = cfg?.MinutosHoldWeb <= 0 ? 15 : cfg?.MinutosHoldWeb ?? 15,
            maxReservasWebPorDniPorDia = cfg?.MaxReservasWebPorDniPorDia <= 0 ? 3 : cfg?.MaxReservasWebPorDniPorDia ?? 3,
            sucursales,
        });
    }

    [HttpGet("canchas")]
    public async Task<IActionResult> ListarCanchas(string tenantSlug, [FromQuery] Guid? sucursalId)
    {
        if (!await ReservaWebHabilitadaAsync())
        {
            return NotFound(new { error = "ReservaWebInactiva", mensaje = "Reservas web no disponibles." });
        }

        var query = _context.Canchas.AsNoTracking().Where(c => c.EstaActiva);
        if (sucursalId.HasValue)
        {
            query = query.Where(c => c.SucursalId == sucursalId.Value);
        }

        var items = await query
            .OrderBy(c => c.Nombre)
            .Select(c => new
            {
                c.Id,
                c.Nombre,
                c.SucursalId,
                nombreSucursal = c.Sucursal.Nombre,
                telefonoWhatsAppSucursal = c.Sucursal.TelefonoWhatsApp,
                tipoCancha = c.Tipo.ToString(),
                c.TieneIluminacion,
                imagenWebUrl = c.ImagenWebRuta,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("productos")]
    public async Task<IActionResult> ListarProductosWeb(string tenantSlug, [FromQuery] Guid sucursalId)
    {
        if (!await ReservaWebHabilitadaAsync())
        {
            return NotFound(new { error = "ReservaWebInactiva", mensaje = "Reservas web no disponibles." });
        }

        var items = await _context.Productos
            .AsNoTracking()
            .Where(p => p.SucursalId == sucursalId && p.Activo && p.VisibleEnWeb)
            .OrderBy(p => p.Categoria)
            .ThenBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Descripcion,
                p.Categoria,
                p.Precio,
                agotado = p.ControlStock && p.StockActual <= 0,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("medios-pago")]
    public async Task<IActionResult> MediosPagoWeb(string tenantSlug, [FromQuery] Guid? sucursalId)
    {
        if (!await ReservaWebHabilitadaAsync())
        {
            return NotFound(new { error = "ReservaWebInactiva", mensaje = "Reservas web no disponibles." });
        }

        var tenantId = _tenantProvider.GetTenantId();
        if (tenantId is { } tid)
        {
            await TenantMediosPagoSeeder.EnsureDefaultsAsync(_context, tid);
        }
        else
        {
            await TenantMediosPagoSeeder.AlinearVisibleEnWebPagablesAsync(_context);
        }

        string? telefonoWhatsAppSucursal = null;
        if (sucursalId.HasValue)
        {
            telefonoWhatsAppSucursal = await _context.Sucursales
                .AsNoTracking()
                .Where(s => s.Id == sucursalId.Value)
                .Select(s => s.TelefonoWhatsApp)
                .FirstOrDefaultAsync();
        }

        var raw = await _context.MediosPago
            .AsNoTracking()
            .Where(m => m.Activo && m.VisibleEnWeb && !m.EsPasarelaExterna)
            .OrderBy(m => m.Orden)
            .ThenBy(m => m.Nombre)
            .Select(m => new
            {
                m.Id,
                m.Nombre,
                Tipo = m.Tipo.ToString(),
                m.RequiereVoucherOnline,
                m.ConfiguracionIntegracionJson,
            })
            .ToListAsync();

        var items = raw.Select(m => new
        {
            m.Id,
            m.Nombre,
            m.Tipo,
            m.RequiereVoucherOnline,
            qrUrl = ExtraerQrUrlMedio(m.ConfiguracionIntegracionJson),
            telefonoReferencia = telefonoWhatsAppSucursal,
        });

        return Ok(items);
    }

    [HttpGet("consultas/dni")]
    public async Task<IActionResult> ConsultarDniPublico(string tenantSlug, [FromQuery] string numero, CancellationToken ct)
    {
        if (!await ReservaWebHabilitadaAsync())
        {
            return NotFound(new { error = "ReservaWebInactiva", mensaje = "Reservas web no disponibles." });
        }

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

    [HttpPost("reservas/voucher")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> SubirVoucherWeb(
        string tenantSlug,
        [FromForm] IFormFile? file,
        CancellationToken ct)
    {
        if (!await ReservaWebHabilitadaAsync())
        {
            return NotFound(new { error = "ReservaWebInactiva", mensaje = "Reservas web no disponibles." });
        }

        file ??= Request.Form.Files.GetFile("file") ?? Request.Form.Files.FirstOrDefault();
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "ArchivoRequerido", mensaje = "Adjunta una imagen o PDF del comprobante." });
        }

        try
        {
            var url = await _mediaWeb.GuardarVoucherReservaWebAsync(file, ct);
            return Ok(new { voucherUrl = url });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "ArchivoInvalido", mensaje = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "TenantNoResuelto", mensaje = ex.Message });
        }
    }

    [HttpGet("canchas/{canchaId:guid}/disponibilidad")]
    public async Task<IActionResult> Disponibilidad(
        string tenantSlug,
        Guid canchaId,
        [FromQuery] DateTime fecha,
        [FromQuery] string? dni,
        [FromQuery] int duracionHoras = 1)
    {
        if (!await ReservaWebHabilitadaAsync())
        {
            return NotFound(new { error = "ReservaWebInactiva", mensaje = "Reservas web no disponibles." });
        }

        if (duracionHoras < 1)
        {
            duracionHoras = 1;
        }

        var cancha = await _context.Canchas
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == canchaId && c.EstaActiva);
        if (cancha == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Cancha no encontrada." });
        }

        var dniNorm = string.IsNullOrWhiteSpace(dni) ? null : SportDniHelper.Normalizar(dni);
        var utcNow = DateTime.UtcNow;

        var diaCalendario = SportTimeHelper.DiaCalendarioLimaDesdeQuery(fecha);
        var inicioDiaUtc = SportTimeHelper.EnsureUtc(SportTimeHelper.ToUtcFromLimaLocal(diaCalendario));
        var finDiaUtc = SportTimeHelper.EnsureUtc(
            SportTimeHelper.ToUtcFromLimaLocal(diaCalendario.AddDays(1).AddTicks(-1)));

        var reservasDelDia = await _context.Reservas
            .Include(r => r.Cliente)
            .Where(r =>
                r.CanchaId == canchaId &&
                r.HoraInicio < finDiaUtc &&
                r.HoraFin > inicioDiaUtc &&
                (r.Estado == EstadoReserva.Confirmada || r.Estado == EstadoReserva.Pendiente))
            .ToListAsync();

        var tarifasCancha = await _context.CanchasTarifas
            .Where(ct => ct.CanchaId == canchaId && ct.TarifaCancha.Activa)
            .Select(ct => ct.TarifaCancha)
            .ToListAsync();

        var esFinDeSemana = SportTimeHelper.EsFinDeSemana(diaCalendario);

        const int horaApertura = 6;
        const int horaCierre = 23;
        var listaSlots = new List<object>();

        for (var hora = horaApertura; hora < horaCierre; hora++)
        {
            var compuesto = $"{diaCalendario:yyyy-MM-dd}T{hora:D2}:00:00";
            if (!SportTimeHelper.TryParseLimaDesdeCliente(compuesto, out var limaInicio))
            {
                continue;
            }

            var horaInicioUtc = SportTimeHelper.EnsureUtc(SportTimeHelper.ToUtcFromLimaLocal(limaInicio));
            var horaFinUtc = SportTimeHelper.EnsureUtc(
                SportTimeHelper.ToUtcFromLimaLocal(limaInicio.AddHours(duracionHoras)));

            if (horaInicioUtc <= utcNow)
            {
                listaSlots.Add(CrearSlot(hora, limaInicio, tarifasCancha, esFinDeSemana, "Pasado", false, null));
                continue;
            }

            var tarifaMatch = SportTarifaMatcher.BuscarTarifa(tarifasCancha, hora, esFinDeSemana);
            if (tarifaMatch == null)
            {
                listaSlots.Add(CrearSlot(hora, limaInicio, tarifasCancha, esFinDeSemana, "SinTarifa", false, null));
                continue;
            }

            var cotizacion = SportTarifaCalculator.Cotizar(tarifasCancha, limaInicio, duracionHoras);
            var precio = cotizacion.Exito ? cotizacion.MontoTotal : tarifaMatch.PrecioPorHora * duracionHoras;

            Reserva? conflicto = null;
            foreach (var r in reservasDelDia)
            {
                if (!ReservaHorarioBloqueo.ReservaBloqueaHorario(r, utcNow))
                {
                    continue;
                }

                if (ReservaHorarioBloqueo.Solapa(horaInicioUtc, horaFinUtc, r.HoraInicio, r.HoraFin))
                {
                    conflicto = r;
                    break;
                }
            }

            string estadoSlot;
            bool reservable;
            if (conflicto == null)
            {
                estadoSlot = "Disponible";
                reservable = true;
            }
            else if (dniNorm != null &&
                     string.Equals(conflicto.Cliente.Dni, dniNorm, StringComparison.OrdinalIgnoreCase))
            {
                estadoSlot = "ReservadoATuNombre";
                reservable = false;
            }
            else
            {
                estadoSlot = "Ocupado";
                reservable = false;
            }

            var reservaPropia =
                estadoSlot == "ReservadoATuNombre" ? conflicto : null;
            listaSlots.Add(
                CrearSlot(
                    hora,
                    limaInicio,
                    tarifasCancha,
                    esFinDeSemana,
                    estadoSlot,
                    reservable,
                    precio,
                    reservaPropia));
        }

        return Ok(listaSlots);
    }

    [HttpPost("reservas")]
    public async Task<IActionResult> SolicitarReserva(string tenantSlug, [FromBody] SolicitarReservaWebRequest request)
    {
        var cfg = await ObtenerConfigAsync();
        if (cfg == null || !cfg.ReservaWebActiva)
        {
            return BadRequest(new { error = "ReservaWebInactiva", mensaje = "Las reservas web están desactivadas." });
        }

        if (string.IsNullOrWhiteSpace(request.DniCliente))
        {
            return BadRequest(new { error = "DniRequerido", mensaje = "El DNI es obligatorio." });
        }

        if (string.IsNullOrWhiteSpace(request.NombreCompletoCliente))
        {
            return BadRequest(new { error = "NombreRequerido", mensaje = "El nombre es obligatorio." });
        }

        if (!SportTimeHelper.TryParseLimaDesdeCliente(request.HoraInicio, out var limaInicio))
        {
            return BadRequest(new { error = "HoraInvalida", mensaje = "Fecha/hora inválida (horario Perú)." });
        }

        var duracion = request.DuracionHoras < 1 ? 1 : request.DuracionHoras;
        var horaInicioUtc = SportTimeHelper.EnsureUtc(SportTimeHelper.ToUtcFromLimaLocal(limaInicio));
        var horaFinUtc = SportTimeHelper.EnsureUtc(
            SportTimeHelper.ToUtcFromLimaLocal(limaInicio.AddHours(duracion)));

        if (horaInicioUtc <= DateTime.UtcNow)
        {
            return BadRequest(new { error = "FechaInvalida", mensaje = "No puedes reservar en el pasado." });
        }

        var cancha = await _context.Canchas.FirstOrDefaultAsync(c => c.Id == request.CanchaId && c.EstaActiva);
        if (cancha == null)
        {
            return BadRequest(new { error = "CanchaInvalida", mensaje = "Cancha no disponible." });
        }

        var dni = SportDniHelper.Normalizar(request.DniCliente);
        if (string.IsNullOrEmpty(dni))
        {
            return BadRequest(new { error = "DniRequerido", mensaje = "DNI inválido." });
        }

        if (SportDniHelper.EsClienteVarios(dni))
        {
            return BadRequest(new { error = "DniNoPermitido", mensaje = "Usa tu DNI real para reservar en la web." });
        }

        var limite = cfg.MaxReservasWebPorDniPorDia <= 0 ? 3 : cfg.MaxReservasWebPorDniPorDia;
        var diaLima = limaInicio.Date;
        var inicioDiaUtc = SportTimeHelper.EnsureUtc(SportTimeHelper.ToUtcFromLimaLocal(diaLima));
        var finDiaUtc = SportTimeHelper.EnsureUtc(
            SportTimeHelper.ToUtcFromLimaLocal(diaLima.AddDays(1).AddTicks(-1)));

        var reservasHoy = await _context.Reservas
            .Include(r => r.Cliente)
            .Where(r =>
                r.Origen == OrigenReserva.WebPublica &&
                r.Cliente.Dni == dni &&
                r.HoraInicio < finDiaUtc &&
                r.HoraFin > inicioDiaUtc &&
                r.Estado != EstadoReserva.Cancelada)
            .CountAsync();

        if (reservasHoy >= limite)
        {
            return BadRequest(new
            {
                error = "LimiteDiario",
                mensaje = $"Ya alcanzaste el máximo de {limite} reservas web para este DNI hoy."
            });
        }

        var utcNow = DateTime.UtcNow;
        var holdMinutos = cfg.MinutosHoldWeb <= 0 ? 15 : cfg.MinutosHoldWeb;

        var solapantes = await _context.Reservas
            .Include(r => r.Cliente)
            .Where(r =>
                r.CanchaId == request.CanchaId &&
                r.HoraInicio < horaFinUtc &&
                r.HoraFin > horaInicioUtc)
            .ToListAsync();

        foreach (var r in solapantes)
        {
            if (!ReservaHorarioBloqueo.ReservaBloqueaHorario(r, utcNow))
            {
                continue;
            }

            return BadRequest(new { error = "CanchaOcupada", mensaje = "Ese horario ya no está disponible." });
        }

        string telefonoCliente;
        try
        {
            telefonoCliente = SportTelefonoHelper.NormalizarTelefonoCliente(
                request.TelefonoCliente,
                request.SinTelefonoCliente) ?? string.Empty;
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "TelefonoInvalido", mensaje = ex.Message });
        }

        var cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.Dni == dni);
        if (cliente == null)
        {
            cliente = new Cliente
            {
                Dni = dni,
                NombreCompleto = request.NombreCompletoCliente.Trim(),
                Telefono = telefonoCliente,
                Email = request.EmailCliente?.Trim(),
                Activo = true,
            };
            _context.Clientes.Add(cliente);
        }
        else
        {
            cliente.Telefono = telefonoCliente;
            if (!string.IsNullOrWhiteSpace(request.NombreCompletoCliente))
            {
                cliente.NombreCompleto = request.NombreCompletoCliente.Trim();
            }
        }

        var tarifasCancha = await _context.CanchasTarifas
            .Where(ct => ct.CanchaId == request.CanchaId && ct.TarifaCancha.Activa)
            .Select(ct => ct.TarifaCancha)
            .ToListAsync();

        var cotizacion = SportTarifaCalculator.Cotizar(tarifasCancha, limaInicio, duracion);
        if (!cotizacion.Exito)
        {
            return BadRequest(new { error = "SinTarifa", mensaje = cotizacion.Mensaje });
        }

        decimal montoProductos = 0m;
        var lineasProducto = new List<ReservaProductoSolicitado>();

        if (request.Productos is { Count: > 0 })
        {
            var ids = request.Productos.Select(p => p.ProductoId).Distinct().ToList();
            var productos = await _context.Productos
                .Where(p => p.SucursalId == cancha.SucursalId && ids.Contains(p.Id))
                .ToListAsync();

            foreach (var item in request.Productos)
            {
                if (item.Cantidad <= 0)
                {
                    continue;
                }

                var prod = productos.FirstOrDefault(p => p.Id == item.ProductoId);
                if (prod == null || !prod.Activo || !prod.VisibleEnWeb)
                {
                    return BadRequest(new { error = "ProductoInvalido", mensaje = "Un producto del carrito no está disponible en la web." });
                }

                if (prod.ControlStock && prod.StockActual < item.Cantidad)
                {
                    return BadRequest(new
                    {
                        error = "StockInsuficiente",
                        mensaje = $"No hay stock suficiente de {prod.Nombre}."
                    });
                }

                var sub = prod.Precio * item.Cantidad;
                montoProductos += sub;
                lineasProducto.Add(new ReservaProductoSolicitado
                {
                    ProductoId = prod.Id,
                    NombreProducto = prod.Nombre,
                    Cantidad = item.Cantidad,
                    PrecioUnitario = prod.Precio,
                    Subtotal = sub,
                });
            }
        }

        var observaciones = string.IsNullOrWhiteSpace(request.Observaciones)
            ? "Solicitud web — pendiente confirmación del negocio."
            : request.Observaciones.Trim();

        var reserva = new Reserva
        {
            SucursalId = cancha.SucursalId,
            CanchaId = request.CanchaId,
            Cliente = cliente,
            NombreClienteReserva = request.NombreCompletoCliente.Trim(),
            HoraInicio = horaInicioUtc,
            HoraFin = horaFinUtc,
            MontoTotal = cotizacion.MontoTotal + montoProductos,
            Estado = EstadoReserva.Pendiente,
            Origen = OrigenReserva.WebPublica,
            HoldExpiraEnUtc = utcNow.AddMinutes(holdMinutos),
            Observaciones = observaciones,
            GrupoSolicitudWebId = request.GrupoSolicitudWebId is { } g && g != Guid.Empty ? g : null,
        };

        foreach (var linea in lineasProducto)
        {
            linea.Reserva = reserva;
            reserva.ProductosSolicitados.Add(linea);
        }

        _context.Reservas.Add(reserva);

        var tipoAdelanto = (request.TipoAdelantoWeb ?? "Total").Trim();
        var sinAdelanto = string.Equals(tipoAdelanto, "SinAdelanto", StringComparison.OrdinalIgnoreCase);

        var registrarPago =
            !sinAdelanto &&
            request.MedioPagoId is { } mp && mp != Guid.Empty &&
            (request.RegistrarPagoEnEstaLinea ||
             request.GrupoSolicitudWebId == null ||
             request.GrupoSolicitudWebId == Guid.Empty);

        if (registrarPago)
        {
            var medio = await _context.MediosPago.FirstOrDefaultAsync(m =>
                m.Id == request.MedioPagoId!.Value && m.Activo && m.VisibleEnWeb && !m.EsPasarelaExterna);
            if (medio == null)
            {
                return BadRequest(new { error = "MedioInvalido", mensaje = "Medio de pago no disponible." });
            }

            var montoPago = ResolverMontoAdelantoWeb(
                tipoAdelanto,
                reserva.MontoTotal,
                request.MontoPagoGrupo);

            if (montoPago <= 0)
            {
                return BadRequest(new { error = "MontoInvalido", mensaje = "Indica un monto de pago válido." });
            }

            if (medio.RequiereVoucherOnline &&
                string.IsNullOrWhiteSpace(request.VoucherUrl) &&
                string.IsNullOrWhiteSpace(request.CodigoOperacion))
            {
                return BadRequest(new
                {
                    error = "VoucherRequerido",
                    mensaje = "Sube el comprobante de pago o indica el código de operación."
                });
            }

            var pago = new PagoReserva
            {
                Reserva = reserva,
                MedioPagoId = medio.Id,
                Monto = montoPago,
                CodigoOperacion = string.IsNullOrWhiteSpace(request.CodigoOperacion)
                    ? null
                    : request.CodigoOperacion.Trim(),
                VoucherUrl = string.IsNullOrWhiteSpace(request.VoucherUrl) ? null : request.VoucherUrl.Trim(),
                RegistradoSinVoucher = false,
                Canal = CanalPagoReserva.Online,
                Estado = EstadoPagoReserva.Pendiente,
            };
            _context.PagosReserva.Add(pago);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Solicitud enviada. El negocio confirmará tu reserva pronto.",
            reservaId = reserva.Id,
            holdExpiraEnUtc = reserva.HoldExpiraEnUtc,
            montoTotal = reserva.MontoTotal,
            montoCancha = cotizacion.MontoTotal,
            montoProductos,
        });
    }

    private async Task<ConfiguracionNegocioSport?> ObtenerConfigAsync() =>
        await _context.ConfiguracionNegocio.AsNoTracking().FirstOrDefaultAsync();

    private async Task<bool> ReservaWebHabilitadaAsync()
    {
        var cfg = await ObtenerConfigAsync();
        if (cfg is not { ReservaWebActiva: true })
        {
            return false;
        }

        return await ReservaWebPermitidaPlataformaAsync();
    }

    private async Task<bool> ReservaWebPermitidaPlataformaAsync()
    {
        var tenantId = _tenantProvider.GetTenantId();
        if (!tenantId.HasValue)
        {
            return true;
        }

        var permitida = await _masterDb.Tenants
            .AsNoTracking()
            .Where(t => t.Id == tenantId.Value)
            .Select(t => (bool?)t.ClienteEmpresa.ReservaWebPermitida)
            .FirstOrDefaultAsync();

        return permitida is not false;
    }

    private static string? ExtraerQrUrlMedio(string? configuracionIntegracionJson)
    {
        if (string.IsNullOrWhiteSpace(configuracionIntegracionJson))
        {
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(configuracionIntegracionJson);
            var root = doc.RootElement;
            foreach (var key in new[] { "qrUrl", "imagenQr", "qr", "urlQr" })
            {
                if (root.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.String)
                {
                    var s = prop.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(s))
                    {
                        return s;
                    }
                }
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static object CrearSlot(
        int hora,
        DateTime limaInicio,
        List<TarifaCancha> tarifas,
        bool esFinDeSemana,
        string estadoSlot,
        bool reservable,
        decimal? precioTotal,
        Reserva? reservaPropia = null)
    {
        var tarifaMatch = SportTarifaMatcher.BuscarTarifa(tarifas, hora, esFinDeSemana);
        var ampmInicio = hora >= 12 ? "PM" : "AM";
        var hora12Inicio = hora > 12 ? hora - 12 : hora == 0 ? 12 : hora;
        var ampmFin = hora + 1 >= 12 ? "PM" : "AM";
        var hora12Fin = hora + 1 > 12 ? hora + 1 - 12 : hora + 1;

        string? clienteNombre = null;
        string? reservaEstado = null;
        DateTime? holdExpiraEnUtc = null;
        if (reservaPropia != null)
        {
            clienteNombre = string.IsNullOrWhiteSpace(reservaPropia.NombreClienteReserva)
                ? reservaPropia.Cliente.NombreCompleto
                : reservaPropia.NombreClienteReserva.Trim();
            reservaEstado = reservaPropia.Estado.ToString();
            holdExpiraEnUtc = reservaPropia.HoldExpiraEnUtc;
        }

        return new
        {
            horaInicio = hora,
            horarioTexto = $"{hora12Inicio:D2}:00 {ampmInicio} - {hora12Fin:D2}:00 {ampmFin}",
            estadoSlot,
            reservable,
            precio = precioTotal ?? tarifaMatch?.PrecioPorHora ?? 0m,
            tarifaAplicada = tarifaMatch?.Nombre ?? "Sin tarifa",
            clienteNombre,
            reservaEstado,
            holdExpiraEnUtc,
        };
    }

    private static decimal ResolverMontoAdelantoWeb(
        string tipoAdelanto,
        decimal montoReservaLinea,
        decimal? montoPagoGrupoEnviado)
    {
        if (string.Equals(tipoAdelanto, "SinAdelanto", StringComparison.OrdinalIgnoreCase))
        {
            return 0m;
        }

        // La web envía MontoPagoGrupo ya calculado (adelanto del carrito completo).
        if (montoPagoGrupoEnviado is > 0)
        {
            return Math.Round(montoPagoGrupoEnviado.Value, 2, MidpointRounding.AwayFromZero);
        }

        if (string.Equals(tipoAdelanto, "Porcentaje30", StringComparison.OrdinalIgnoreCase))
        {
            return Math.Round(montoReservaLinea * 0.3m, 2, MidpointRounding.AwayFromZero);
        }

        return montoReservaLinea;
    }
}

public class SolicitarReservaWebRequest
{
    public Guid CanchaId { get; set; }
    public string HoraInicio { get; set; } = string.Empty;
    public int DuracionHoras { get; set; } = 1;
    public string DniCliente { get; set; } = string.Empty;
    public string NombreCompletoCliente { get; set; } = string.Empty;
    public string? TelefonoCliente { get; set; }
    public bool SinTelefonoCliente { get; set; }
    public string? EmailCliente { get; set; }
    public string? Observaciones { get; set; }
    public Guid? MedioPagoId { get; set; }
    public string? CodigoOperacion { get; set; }
    public string? VoucherUrl { get; set; }
    public Guid? GrupoSolicitudWebId { get; set; }
    /// <summary>Solo la primera línea de un grupo registra el pago/voucher.</summary>
    public bool RegistrarPagoEnEstaLinea { get; set; } = true;
    /// <summary>Monto total del grupo en la línea que registra pago.</summary>
    public decimal? MontoPagoGrupo { get; set; }
    /// <summary>Total | Porcentaje30 | SinAdelanto</summary>
    public string? TipoAdelantoWeb { get; set; }
    public List<SolicitarReservaWebProductoRequest>? Productos { get; set; }
}

public class SolicitarReservaWebProductoRequest
{
    public Guid ProductoId { get; set; }
    public int Cantidad { get; set; }
}
