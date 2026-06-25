using System.Security.Claims;
using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Application.Modulos.Sport.Reservas;
using KallpaNexus.Application.Modulos.Sport.Reservas.Commands.ActualizarReserva;
using KallpaNexus.Application.Modulos.Sport.Reservas.Commands.CrearReserva;
using KallpaNexus.Domain.Entities.Compartido;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.API.Swagger;
using KallpaNexus.Domain.Common;
using KallpaNexus.Infrastructure.Auth;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.API.Infrastructure;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/[controller]")]
public class ReservasController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly TenantStaffSucursalScopeService _sucursalScope;

    public ReservasController(ApplicationDbContext context, TenantStaffSucursalScopeService sucursalScope)
    {
        _context = context;
        _sucursalScope = sucursalScope;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.ReservasVer)]
    public async Task<IActionResult> ObtenerTodas(
        [FromQuery] Guid? canchaId,
        [FromQuery] Guid? sucursalId,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] EstadoReserva? estado,
        [FromQuery] string? dniCliente)
    {
        var query = _context.Reservas.AsQueryable();

        var (queryAlcance, errorAlcance) = await _sucursalScope.AplicarAlcanceReservasAsync(
            User,
            query,
            sucursalId);
        if (errorAlcance != null)
        {
            return errorAlcance.ToActionResult();
        }

        query = queryAlcance!;

        if (canchaId.HasValue)
        {
            query = query.Where(r => r.CanchaId == canchaId.Value);
        }

        if (desde.HasValue && hasta.HasValue)
        {
            var desdeUtc = DateTime.SpecifyKind(desde.Value, DateTimeKind.Utc);
            var hastaUtc = DateTime.SpecifyKind(hasta.Value, DateTimeKind.Utc);
            query = query.Where(r => r.HoraInicio < hastaUtc && r.HoraFin > desdeUtc);
        }
        else if (desde.HasValue)
        {
            var desdeUtc = DateTime.SpecifyKind(desde.Value, DateTimeKind.Utc);
            query = query.Where(r => r.HoraFin > desdeUtc);
        }
        else if (hasta.HasValue)
        {
            var hastaUtc = DateTime.SpecifyKind(hasta.Value, DateTimeKind.Utc);
            query = query.Where(r => r.HoraInicio < hastaUtc);
        }

        if (estado.HasValue)
        {
            query = query.Where(r => r.Estado == estado.Value);
        }

        if (!string.IsNullOrWhiteSpace(dniCliente))
        {
            var dni = dniCliente.Trim();
            query = query.Where(r => r.Cliente.Dni == dni);
        }

        var filas = await query
            .OrderByDescending(r => r.HoraInicio)
            .Select(r => new
            {
                r.Id,
                r.CanchaId,
                NombreCancha = r.Cancha.Nombre,
                r.SucursalId,
                r.ClienteId,
                ClienteDni = r.Cliente.Dni,
                ClienteNombre = r.NombreClienteReserva ?? r.Cliente.NombreCompleto,
                ClienteTelefono = r.Cliente.Telefono,
                r.HoraInicio,
                r.HoraFin,
                Estado = r.Estado.ToString(),
                r.MontoTotal,
                MontoConfirmado = _context.PagosReserva
                    .Where(p => p.ReservaId == r.Id && p.Estado == EstadoPagoReserva.Confirmado)
                    .Sum(p => (decimal?)p.Monto) ?? 0m,
                r.Observaciones,
                r.AdelantoDevuelto,
                r.CanceladaEnUtc,
                Origen = r.Origen.ToString(),
                r.HoldExpiraEnUtc,
                CantidadProductosWeb = r.ProductosSolicitados.Count,
                r.GrupoSolicitudWebId,
                VoucherWebPendiente = _context.PagosReserva
                    .Where(p =>
                        p.ReservaId == r.Id &&
                        p.Estado == EstadoPagoReserva.Pendiente &&
                        p.Canal == CanalPagoReserva.Online)
                    .OrderByDescending(p => p.Id)
                    .Select(p => p.VoucherUrl)
                    .FirstOrDefault(),
                MedioPagoWebPendiente = _context.PagosReserva
                    .Where(p =>
                        p.ReservaId == r.Id &&
                        p.Estado == EstadoPagoReserva.Pendiente &&
                        p.Canal == CanalPagoReserva.Online)
                    .OrderByDescending(p => p.Id)
                    .Select(p => p.MedioPago.Nombre)
                    .FirstOrDefault(),
                MontoPagoWebPendiente = _context.PagosReserva
                    .Where(p =>
                        p.ReservaId == r.Id &&
                        p.Estado == EstadoPagoReserva.Pendiente &&
                        p.Canal == CanalPagoReserva.Online)
                    .OrderByDescending(p => p.Id)
                    .Select(p => (decimal?)p.Monto)
                    .FirstOrDefault()
            })
            .ToListAsync();

        var estadoCorregido = new Dictionary<Guid, string>();
        var idsDesinc = filas
            .Where(f => f.Estado == "Pendiente")
            .Where(f => f.MontoConfirmado >= f.MontoTotal - 0.01m)
            .Select(f => f.Id)
            .ToList();

        if (idsDesinc.Count > 0)
        {
            var entidades = await _context.Reservas
                .Where(r => idsDesinc.Contains(r.Id))
                .ToListAsync();
            foreach (var ent in entidades)
            {
                await ReservaCobroSync.SincronizarEstadoReservaAsync(_context, ent);
                estadoCorregido[ent.Id] = ent.Estado.ToString();
            }

            await _context.SaveChangesAsync();
        }

        var metaGrupoWeb = new Dictionary<Guid, (decimal Adelanto, decimal TotalGrupo, string? Medio, string? Voucher)>();
        foreach (var g in filas.Where(f => f.GrupoSolicitudWebId != null).GroupBy(f => f.GrupoSolicitudWebId!.Value))
        {
            var miembros = g.ToList();
            var totalGrupo = miembros.Sum(m => m.MontoTotal);
            var conPago = miembros
                .Where(m => m.MontoPagoWebPendiente is > 0)
                .OrderByDescending(m => m.MontoPagoWebPendiente)
                .FirstOrDefault();
            if (conPago?.MontoPagoWebPendiente is decimal adelanto && adelanto > 0)
            {
                metaGrupoWeb[g.Key] = (adelanto, totalGrupo, conPago.MedioPagoWebPendiente, conPago.VoucherWebPendiente);
            }
        }

        var reservas = filas.Select(r =>
        {
            decimal? montoAdelantoGrupo = null;
            decimal? montoTotalGrupo = null;
            var voucher = r.VoucherWebPendiente;
            var medio = r.MedioPagoWebPendiente;
            if (r.GrupoSolicitudWebId is { } gid && metaGrupoWeb.TryGetValue(gid, out var meta))
            {
                montoAdelantoGrupo = meta.Adelanto;
                montoTotalGrupo = meta.TotalGrupo;
                voucher ??= meta.Voucher;
                medio ??= meta.Medio;
            }

            return new
            {
                r.Id,
                r.CanchaId,
                r.NombreCancha,
                r.SucursalId,
                r.ClienteId,
                r.ClienteDni,
                r.ClienteNombre,
                r.ClienteTelefono,
                r.HoraInicio,
                r.HoraFin,
                Estado = estadoCorregido.TryGetValue(r.Id, out var est) ? est : r.Estado,
                r.MontoTotal,
                r.MontoConfirmado,
                MontoPendiente = Math.Max(0m, r.MontoTotal - r.MontoConfirmado),
                MontoExcedente = Math.Max(0m, r.MontoConfirmado - r.MontoTotal),
                r.Observaciones,
                r.AdelantoDevuelto,
                r.CanceladaEnUtc,
                Origen = r.Origen,
                r.HoldExpiraEnUtc,
                r.CantidadProductosWeb,
                r.GrupoSolicitudWebId,
                VoucherWebPendiente = voucher,
                MedioPagoWebPendiente = medio,
                r.MontoPagoWebPendiente,
                MontoAdelantoWebGrupoPendiente = montoAdelantoGrupo,
                MontoTotalGrupoWeb = montoTotalGrupo,
            };
        });

        return Ok(reservas);
    }

    [HttpGet("cotizar")]
    [HasTenantPermission(PermisosApp.ReservasVer)]
    public async Task<IActionResult> Cotizar(
        [FromQuery] Guid canchaId,
        [FromQuery] string? horaInicio,
        [FromQuery] string? fecha,
        [FromQuery] int? horaLocal,
        [FromQuery] int duracionHoras = 1)
    {
        var rechazoCotizar = await RechazarSiSinAccesoCanchaAsync(canchaId);
        if (rechazoCotizar != null)
        {
            return rechazoCotizar;
        }

        if (duracionHoras < 1)
        {
            duracionHoras = 1;
        }

        DateTime limaInicio;
        if (!string.IsNullOrWhiteSpace(fecha) && horaLocal is >= 0 and <= 23)
        {
            var compuesto = $"{fecha.Trim()}T{horaLocal.Value:D2}:00:00";
            if (!SportTimeHelper.TryParseLimaDesdeCliente(compuesto, out limaInicio))
            {
                return BadRequest(new { error = "Invalido", mensaje = "Fecha/hora inválida (hora Lima)." });
            }
        }
        else if (!SportTimeHelper.TryParseLimaDesdeCliente(horaInicio, out limaInicio))
        {
            return BadRequest(new { error = "Invalido", mensaje = "Fecha/hora inválida (hora Lima)." });
        }

        var tarifas = await _context.CanchasTarifas
            .Where(ct => ct.CanchaId == canchaId && ct.TarifaCancha.Activa)
            .Select(ct => ct.TarifaCancha)
            .ToListAsync();

        var cotizacion = SportTarifaCalculator.Cotizar(tarifas, limaInicio, duracionHoras);
        if (!cotizacion.Exito)
        {
            return BadRequest(new { error = "SinTarifa", mensaje = cotizacion.Mensaje });
        }

        return Ok(new
        {
            montoTotal = cotizacion.MontoTotal,
            detalle = cotizacion.Detalle.Select(d => new
            {
                horaLocal = d.HoraLocal,
                tarifaNombre = d.TarifaNombre,
                precioPorHora = d.PrecioPorHora
            })
        });
    }

    [HttpGet("{reservaId:guid}")]
    [HasTenantPermission(PermisosApp.ReservasVer)]
    public async Task<IActionResult> ObtenerPorId(Guid reservaId)
    {
        var reserva = await _context.Reservas
            .Where(r => r.Id == reservaId)
            .Select(r => new
            {
                r.Id,
                r.CanchaId,
                NombreCancha = r.Cancha.Nombre,
                r.SucursalId,
                r.ClienteId,
                ClienteDni = r.Cliente.Dni,
                ClienteNombre = r.NombreClienteReserva ?? r.Cliente.NombreCompleto,
                ClienteTelefono = r.Cliente.Telefono,
                ClienteEmail = r.Cliente.Email,
                r.HoraInicio,
                r.HoraFin,
                Estado = r.Estado.ToString(),
                r.MontoTotal,
                r.Observaciones
            })
            .FirstOrDefaultAsync();

        if (reserva == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La reserva no existe en tu cuenta." });
        }

        var rechazoVer = await RechazarSiSinAccesoSucursalAsync(reserva.SucursalId);
        if (rechazoVer != null)
        {
            return rechazoVer;
        }

        return Ok(reserva);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearReservaEvolucionadaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DniCliente))
        {
            return BadRequest(new { error = "DniRequerido", mensaje = "El DNI del cliente es obligatorio." });
        }

        if (!SportTimeHelper.TryParseLimaDesdeCliente(request.HoraInicio, out var limaInicio))
        {
            return BadRequest(new
            {
                error = "HoraInvalida",
                mensaje = "Hora de inicio inválida. Usa fecha y hora en horario Perú (ej. 2026-06-08T16:00)."
            });
        }

        var horaInicioUtc = SportTimeHelper.EnsureUtc(SportTimeHelper.ToUtcFromLimaLocal(limaInicio));
        var horaFinUtc = SportTimeHelper.EnsureUtc(
            SportTimeHelper.ToUtcFromLimaLocal(limaInicio.AddHours(request.DuracionHoras)));

        if (horaInicioUtc <= DateTime.UtcNow)
        {
            return BadRequest(new { error = "FechaInvalida", mensaje = "No puedes reservar en el pasado." });
        }

        var cancha = await _context.Canchas.FirstOrDefaultAsync(c => c.Id == request.CanchaId);
        if (cancha == null)
        {
            return BadRequest(new { error = "Invalido", mensaje = "La cancha seleccionada no existe o no pertenece a tu cuenta." });
        }

        if (!cancha.EstaActiva)
        {
            return BadRequest(new { error = "CanchaInactiva", mensaje = "La cancha no está disponible para reservas." });
        }

        var rechazoCrear = await RechazarSiSinAccesoCanchaAsync(request.CanchaId);
        if (rechazoCrear != null)
        {
            return rechazoCrear;
        }

        if (await HayConflictoHorarioAsync(request.CanchaId, horaInicioUtc, horaFinUtc, excluirReservaId: null))
        {
            return BadRequest(new { error = "CanchaOcupada", mensaje = "Este horario ya fue reservado por otro usuario." });
        }

        var consumidorIdClaim = User.FindFirstValue(ConsumidorJwtService.ClaimConsumidorId);
        Guid? usuarioConsumidorId = Guid.TryParse(consumidorIdClaim, out var cid) ? cid : null;

        var dni = SportDniHelper.Normalizar(request.DniCliente);
        if (string.IsNullOrEmpty(dni))
        {
            return BadRequest(new { error = "DniRequerido", mensaje = "Indica DNI o documento (ej. 123 para cliente varios)." });
        }
        if (usuarioConsumidorId.HasValue)
        {
            var dniToken = User.FindFirstValue(ConsumidorJwtService.ClaimDni);
            if (!string.Equals(dni, dniToken, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { error = "DniNoCoincide", mensaje = "El DNI debe coincidir con tu cuenta iniciada." });
            }
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
                UsuarioConsumidorId = usuarioConsumidorId
            };
            _context.Clientes.Add(cliente);
        }
        else
        {
            if (usuarioConsumidorId.HasValue && cliente.UsuarioConsumidorId == null)
            {
                cliente.UsuarioConsumidorId = usuarioConsumidorId;
            }

            cliente.Telefono = telefonoCliente;
            if (!SportDniHelper.EsClienteVarios(dni) &&
                !string.IsNullOrWhiteSpace(request.NombreCompletoCliente))
            {
                cliente.NombreCompleto = request.NombreCompletoCliente.Trim();
            }
        }

        var nombreReserva = request.NombreCompletoCliente.Trim();
        if (string.IsNullOrEmpty(nombreReserva))
        {
            return BadRequest(new { error = "NombreRequerido", mensaje = "El nombre del cliente es obligatorio." });
        }

        var esFinDeSemana = SportTimeHelper.EsFinDeSemana(limaInicio);
        var horaMilitar = limaInicio.Hour;

        var tarifasCancha = await _context.CanchasTarifas
            .Where(ct => ct.CanchaId == request.CanchaId && ct.TarifaCancha.Activa)
            .Select(ct => ct.TarifaCancha)
            .ToListAsync();

        decimal montoTotal;
        if (request.MontoTotalCobrado.HasValue)
        {
            montoTotal = request.MontoTotalCobrado.Value;
        }
        else
        {
            var cotizacion = SportTarifaCalculator.Cotizar(tarifasCancha, limaInicio, request.DuracionHoras);
            if (!cotizacion.Exito)
            {
                return BadRequest(new { error = "SinTarifa", mensaje = cotizacion.Mensaje });
            }

            montoTotal = cotizacion.MontoTotal;
        }
        if (montoTotal < 0)
        {
            return BadRequest(new { error = "MontoInvalido", mensaje = "El monto cobrado no puede ser negativo." });
        }

        var estado = EstadoReserva.Pendiente;
        if (!string.IsNullOrWhiteSpace(request.Estado) &&
            Enum.TryParse<EstadoReserva>(request.Estado, true, out var parsed) &&
            parsed is not EstadoReserva.Completada and not EstadoReserva.NoAsistio)
        {
            estado = parsed;
        }

        var reserva = new Reserva
        {
            SucursalId = cancha.SucursalId,
            CanchaId = request.CanchaId,
            Cliente = cliente,
            NombreClienteReserva = nombreReserva,
            HoraInicio = horaInicioUtc,
            HoraFin = horaFinUtc,
            MontoTotal = montoTotal,
            Estado = estado,
            Observaciones = request.Observaciones?.Trim()
        };

        _context.Reservas.Add(reserva);
        await _context.SaveChangesAsync();
        await ReservaCobroSync.SincronizarEstadoReservaAsync(_context, reserva);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "¡Reserva y Cliente procesados con éxito!",
            ReservaId = reserva.Id,
            ClienteId = cliente.Id,
            ClienteNombre = cliente.NombreCompleto,
            MontoTotal = montoTotal
        });
    }

    [HttpPut("{reservaId:guid}")]
    [HasTenantPermission(PermisosApp.ReservasCrear)]
    public async Task<IActionResult> Actualizar(Guid reservaId, [FromBody] ActualizarReservaRequest request)
    {
        var reserva = await _context.Reservas
            .Include(r => r.Cancha)
            .Include(r => r.Cliente)
            .FirstOrDefaultAsync(r => r.Id == reservaId);

        if (reserva == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La reserva no existe en tu cuenta." });
        }

        if (reserva.Estado is EstadoReserva.Cancelada or EstadoReserva.Completada)
        {
            return BadRequest(new { error = "EstadoFinal", mensaje = "No se puede modificar una reserva cancelada o completada." });
        }

        var rechazoEditar = await RechazarSiSinAccesoSucursalAsync(reserva.SucursalId);
        if (rechazoEditar != null)
        {
            return rechazoEditar;
        }

        DateTime limaInicio;
        if (!string.IsNullOrWhiteSpace(request.HoraInicio))
        {
            if (!SportTimeHelper.TryParseLimaDesdeCliente(request.HoraInicio, out limaInicio))
            {
                return BadRequest(new { error = "HoraInvalida", mensaje = "Hora de inicio inválida." });
            }
        }
        else
        {
            limaInicio = SportTimeHelper.ToLimaFromUtc(reserva.HoraInicio);
        }

        var duracion = request.DuracionHoras ?? (int)(reserva.HoraFin - reserva.HoraInicio).TotalHours;
        if (duracion < 1)
        {
            return BadRequest(new { error = "DuracionInvalida", mensaje = "La duración debe ser de al menos 1 hora." });
        }

        var horaInicioUtc = SportTimeHelper.EnsureUtc(SportTimeHelper.ToUtcFromLimaLocal(limaInicio));
        var horaFinUtc = SportTimeHelper.EnsureUtc(
            SportTimeHelper.ToUtcFromLimaLocal(limaInicio.AddHours(duracion)));
        var reprogramar = !string.IsNullOrWhiteSpace(request.HoraInicio) || request.DuracionHoras.HasValue;

        if (reprogramar)
        {
            if (horaInicioUtc <= DateTime.UtcNow)
            {
                return BadRequest(new { error = "FechaInvalida", mensaje = "No puedes reprogramar al pasado." });
            }

            if (await HayConflictoHorarioAsync(reserva.CanchaId, horaInicioUtc, horaFinUtc, reservaId))
            {
                return BadRequest(new { error = "CanchaOcupada", mensaje = "El nuevo horario choca con otra reserva." });
            }

            reserva.HoraInicio = horaInicioUtc;
            reserva.HoraFin = horaFinUtc;
        }

        if (!string.IsNullOrWhiteSpace(request.NombreCompletoCliente))
        {
            var nombre = request.NombreCompletoCliente.Trim();
            reserva.Cliente.NombreCompleto = nombre;
            reserva.NombreClienteReserva = nombre;
        }

        if (request.SinTelefonoCliente == true || request.TelefonoCliente != null)
        {
            try
            {
                reserva.Cliente.Telefono = SportTelefonoHelper.NormalizarTelefonoCliente(
                    request.TelefonoCliente,
                    request.SinTelefonoCliente == true) ?? string.Empty;
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = "TelefonoInvalido", mensaje = ex.Message });
            }
        }

        if (request.EmailCliente != null)
        {
            reserva.Cliente.Email = string.IsNullOrWhiteSpace(request.EmailCliente)
                ? null
                : request.EmailCliente.Trim();
        }

        if (request.Observaciones != null)
        {
            reserva.Observaciones = string.IsNullOrWhiteSpace(request.Observaciones)
                ? null
                : request.Observaciones.Trim();
        }

        if (request.Estado.HasValue)
        {
            reserva.Estado = request.Estado.Value;
        }

        if (request.MontoTotalCobrado.HasValue)
        {
            if (request.MontoTotalCobrado.Value < 0)
            {
                return BadRequest(new { error = "MontoInvalido", mensaje = "El monto cobrado no puede ser negativo." });
            }

            reserva.MontoTotal = request.MontoTotalCobrado.Value;
        }

        await ReservaCobroSync.SincronizarEstadoReservaAsync(_context, reserva);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Reserva actualizada con éxito.",
            ReservaId = reserva.Id,
            reserva.ClienteId,
            reserva.HoraInicio,
            reserva.HoraFin,
            Estado = reserva.Estado.ToString(),
            reserva.MontoTotal
        });
    }

    [HttpPost("{reservaId:guid}/confirmar-solicitud-web")]
    [HasTenantPermission(PermisosApp.ReservasCrear)]
    public async Task<IActionResult> ConfirmarSolicitudWeb(
        Guid reservaId,
        [FromBody] ConfirmarSolicitudWebRequest? request)
    {
        var reserva = await _context.Reservas
            .Include(r => r.ProductosSolicitados)
            .ThenInclude(l => l.Producto)
            .FirstOrDefaultAsync(r => r.Id == reservaId);

        if (reserva == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Reserva no encontrada." });
        }

        var rechazo = await RechazarSiSinAccesoSucursalAsync(reserva.SucursalId);
        if (rechazo != null)
        {
            return rechazo;
        }

        if (reserva.Origen != OrigenReserva.WebPublica)
        {
            return BadRequest(new { error = "NoEsSolicitudWeb", mensaje = "Esta reserva no proviene de la web." });
        }

        if (reserva.Estado != EstadoReserva.Pendiente)
        {
            return BadRequest(new { error = "EstadoInvalido", mensaje = "Solo se confirman solicitudes pendientes." });
        }

        if (await HayConflictoHorarioAsync(reserva.CanchaId, reserva.HoraInicio, reserva.HoraFin, reservaId))
        {
            return BadRequest(new
            {
                error = "CanchaOcupada",
                mensaje = "El horario ya está ocupado por otra reserva confirmada. Rechaza o reprograma esta solicitud."
            });
        }

        foreach (var linea in reserva.ProductosSolicitados)
        {
            var prod = linea.Producto;
            if (prod.ControlStock && prod.StockActual < linea.Cantidad)
            {
                return BadRequest(new
                {
                    error = "StockInsuficiente",
                    mensaje = $"Stock insuficiente de {prod.Nombre} para confirmar."
                });
            }
        }

        foreach (var linea in reserva.ProductosSolicitados)
        {
            var prod = linea.Producto;
            if (prod.ControlStock)
            {
                prod.StockActual -= linea.Cantidad;
            }
        }

        var pagosPendientes = await _context.PagosReserva
            .Where(p =>
                p.ReservaId == reservaId &&
                p.Canal == CanalPagoReserva.Online &&
                p.Estado == EstadoPagoReserva.Pendiente)
            .ToListAsync();

        var modo = (request?.ModoCobro ?? "AceptarRegistrado").Trim();
        foreach (var pago in pagosPendientes)
        {
            AplicarModoCobroConfirmacionWeb(pago, reserva.MontoTotal, modo);
        }

        if (string.Equals(modo, "SinAdelanto", StringComparison.OrdinalIgnoreCase) && pagosPendientes.Count == 0)
        {
            /* reserva sin pago online previo */
        }

        reserva.Estado = EstadoReserva.Confirmada;
        reserva.HoldExpiraEnUtc = null;
        await ReservaCobroSync.SincronizarEstadoReservaAsync(_context, reserva);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Solicitud web confirmada.",
            reservaId = reserva.Id,
            estado = reserva.Estado.ToString(),
        });
    }

    [HttpPost("{reservaId:guid}/rechazar-solicitud-web")]
    [HasTenantPermission(PermisosApp.ReservasCancelar)]
    public async Task<IActionResult> RechazarSolicitudWeb(Guid reservaId, [FromBody] RechazarSolicitudWebRequest? request)
    {
        var reserva = await _context.Reservas.FirstOrDefaultAsync(r => r.Id == reservaId);
        if (reserva == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Reserva no encontrada." });
        }

        var rechazo = await RechazarSiSinAccesoSucursalAsync(reserva.SucursalId);
        if (rechazo != null)
        {
            return rechazo;
        }

        if (reserva.Origen != OrigenReserva.WebPublica)
        {
            return BadRequest(new { error = "NoEsSolicitudWeb", mensaje = "Esta reserva no proviene de la web." });
        }

        if (reserva.Estado == EstadoReserva.Cancelada)
        {
            return Ok(new { mensaje = "La solicitud ya estaba rechazada/cancelada.", reservaId });
        }

        if (reserva.Estado != EstadoReserva.Pendiente)
        {
            return BadRequest(new { error = "EstadoInvalido", mensaje = "Solo se rechazan solicitudes pendientes." });
        }

        reserva.Estado = EstadoReserva.Cancelada;
        reserva.CanceladaEnUtc = DateTime.UtcNow;
        reserva.HoldExpiraEnUtc = null;

        var pagosPendientes = await _context.PagosReserva
            .Where(p =>
                p.ReservaId == reservaId &&
                p.Canal == CanalPagoReserva.Online &&
                p.Estado == EstadoPagoReserva.Pendiente)
            .ToListAsync();
        foreach (var pago in pagosPendientes)
        {
            pago.Estado = EstadoPagoReserva.Rechazado;
        }

        var motivo = request?.Motivo?.Trim();
        if (!string.IsNullOrEmpty(motivo))
        {
            reserva.Observaciones = string.IsNullOrWhiteSpace(reserva.Observaciones)
                ? $"Rechazada (web): {motivo}"
                : $"{reserva.Observaciones} | Rechazada (web): {motivo}";
        }

        await _context.SaveChangesAsync();

        return Ok(new { mensaje = "Solicitud web rechazada.", reservaId = reserva.Id });
    }

    [HttpDelete("{reservaId:guid}")]
    [HasTenantPermission(PermisosApp.ReservasCancelar)]
    public async Task<IActionResult> Eliminar(
        Guid reservaId,
        [FromQuery] bool permanente = false,
        [FromQuery] bool adelantoDevuelto = false)
    {
        var reserva = await _context.Reservas.FirstOrDefaultAsync(r => r.Id == reservaId);
        if (reserva == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "La reserva no existe en tu cuenta." });
        }

        var rechazoCancelar = await RechazarSiSinAccesoSucursalAsync(reserva.SucursalId);
        if (rechazoCancelar != null)
        {
            return rechazoCancelar;
        }

        if (permanente)
        {
            _context.Reservas.Remove(reserva);
            await _context.SaveChangesAsync();
            return Ok(new { Mensaje = "Reserva eliminada permanentemente.", ReservaId = reservaId });
        }

        if (reserva.Estado == EstadoReserva.Cancelada)
        {
            return Ok(new
            {
                Mensaje = "La reserva ya estaba cancelada.",
                ReservaId = reserva.Id,
                Estado = reserva.Estado.ToString()
            });
        }

        reserva.Estado = EstadoReserva.Cancelada;
        reserva.CanceladaEnUtc = DateTime.UtcNow;
        reserva.AdelantoDevuelto = adelantoDevuelto;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Reserva cancelada. El horario quedó libre; el registro se conserva para reportes.",
            ReservaId = reserva.Id,
            Estado = reserva.Estado.ToString(),
            reserva.AdelantoDevuelto
        });
    }

    private bool EsJwtConsumidor() =>
        User.FindFirstValue(ConsumidorJwtService.ClaimConsumidorId) != null;

    private async Task<IActionResult?> RechazarSiSinAccesoCanchaAsync(Guid canchaId)
    {
        if (EsJwtConsumidor())
        {
            return null;
        }

        var error = await _sucursalScope.ValidarAccesoCanchaAsync(User, canchaId);
        return error?.ToActionResult();
    }

    private async Task<IActionResult?> RechazarSiSinAccesoSucursalAsync(Guid sucursalId)
    {
        if (EsJwtConsumidor())
        {
            return null;
        }

        var error = await _sucursalScope.ValidarAccesoSucursalAsync(User, sucursalId);
        return error?.ToActionResult();
    }

    private async Task<bool> HayConflictoHorarioAsync(
        Guid canchaId,
        DateTime horaInicioUtc,
        DateTime horaFinUtc,
        Guid? excluirReservaId)
    {
        var utcNow = DateTime.UtcNow;
        var candidatas = await _context.Reservas
            .Where(r =>
                r.CanchaId == canchaId &&
                r.HoraInicio < horaFinUtc &&
                r.HoraFin > horaInicioUtc &&
                (r.Estado == EstadoReserva.Confirmada || r.Estado == EstadoReserva.Pendiente))
            .ToListAsync();

        foreach (var r in candidatas)
        {
            if (excluirReservaId.HasValue && r.Id == excluirReservaId.Value)
            {
                continue;
            }

            if (ReservaHorarioBloqueo.ReservaBloqueaHorario(r, utcNow))
            {
                return true;
            }
        }

        return false;
    }

    private static void AplicarModoCobroConfirmacionWeb(
        PagoReserva pago,
        decimal montoTotalReserva,
        string modo)
    {
        if (string.Equals(modo, "SinAdelanto", StringComparison.OrdinalIgnoreCase))
        {
            pago.Estado = EstadoPagoReserva.Rechazado;
            return;
        }

        if (string.Equals(modo, "Adelanto30", StringComparison.OrdinalIgnoreCase))
        {
            pago.Monto = Math.Round(montoTotalReserva * 0.3m, 2, MidpointRounding.AwayFromZero);
            pago.Estado = EstadoPagoReserva.Confirmado;
            return;
        }

        if (string.Equals(modo, "PagoTotal", StringComparison.OrdinalIgnoreCase))
        {
            pago.Monto = montoTotalReserva;
            pago.Estado = EstadoPagoReserva.Confirmado;
            return;
        }

        pago.Estado = EstadoPagoReserva.Confirmado;
    }
}

public class ConfirmarSolicitudWebRequest
{
    /// <summary>AceptarRegistrado | Adelanto30 | PagoTotal | SinAdelanto</summary>
    public string? ModoCobro { get; set; }
}

public class RechazarSolicitudWebRequest
{
    public string? Motivo { get; set; }
}
