using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.API.Swagger;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.NexusSport;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
[ApiController]
[Route("api/Reservas/{reservaId:guid}/pagos")]
public class PagosReservaController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PagosReservaController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.ReservasVer)]
    public async Task<IActionResult> Listar(Guid reservaId)
    {
        if (!await _context.Reservas.AnyAsync(r => r.Id == reservaId))
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Reserva no encontrada." });
        }

        var items = await _context.PagosReserva
            .Where(p => p.ReservaId == reservaId)
            .OrderByDescending(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.ReservaId,
                p.MedioPagoId,
                MedioPagoNombre = p.MedioPago.Nombre,
                p.Monto,
                p.CodigoOperacion,
                p.VoucherUrl,
                RegistradoSinVoucher = p.RegistradoSinVoucher,
                Canal = p.Canal.ToString(),
                Estado = p.Estado.ToString()
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.ReservasCrear)]
    public async Task<IActionResult> Registrar(
        Guid reservaId,
        [FromBody] RegistrarPagoReservaRequest request,
        CancellationToken ct)
    {
        var reserva = await _context.Reservas.FirstOrDefaultAsync(r => r.Id == reservaId);
        if (reserva == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Reserva no encontrada." });
        }

        var medio = await _context.MediosPago.FirstOrDefaultAsync(m => m.Id == request.MedioPagoId && m.Activo);
        if (medio == null)
        {
            return BadRequest(new { error = "MedioInvalido", mensaje = "Medio de pago no encontrado o inactivo." });
        }

        if (request.Monto <= 0)
        {
            return BadRequest(new { error = "MontoInvalido", mensaje = "El monto debe ser mayor a cero." });
        }

        var totalConfirmado = await _context.PagosReserva
            .Where(p => p.ReservaId == reservaId && p.Estado == EstadoPagoReserva.Confirmado)
            .SumAsync(p => p.Monto);
        var pendiente = reserva.MontoTotal - totalConfirmado;
        if (pendiente <= 0)
        {
            return BadRequest(new
            {
                error = "CobroCompleto",
                mensaje = "Esta reserva ya está cubierta por los pagos registrados."
            });
        }

        if (request.Monto > pendiente + 0.01m)
        {
            return BadRequest(new
            {
                error = "MontoExcedePendiente",
                mensaje = $"El monto no puede superar el pendiente ({pendiente:N2})."
            });
        }

        var sinVoucher = request.RegistradoSinVoucher;
        if (!sinVoucher && string.IsNullOrWhiteSpace(request.VoucherUrl) && string.IsNullOrWhiteSpace(request.CodigoOperacion))
        {
            if (medio.RequiereVoucherOnline && !medio.PermiteSinVoucherPresencial)
            {
                return BadRequest(new
                {
                    error = "VoucherRequerido",
                    mensaje = "Este medio exige código de operación o URL de voucher, o marcar registro sin voucher si el medio lo permite."
                });
            }
        }

        if (!medio.PermiteSinVoucherPresencial && sinVoucher)
        {
            return BadRequest(new
            {
                error = "SinVoucherNoPermitido",
                mensaje = "Este medio no permite registrar cobro sin comprobante."
            });
        }

        var pago = new PagoReserva
        {
            ReservaId = reservaId,
            MedioPagoId = request.MedioPagoId,
            Monto = request.Monto,
            CodigoOperacion = string.IsNullOrWhiteSpace(request.CodigoOperacion) ? null : request.CodigoOperacion.Trim(),
            VoucherUrl = string.IsNullOrWhiteSpace(request.VoucherUrl) ? null : request.VoucherUrl.Trim(),
            RegistradoSinVoucher = sinVoucher,
            Canal = CanalPagoReserva.Presencial,
            Estado = EstadoPagoReserva.Confirmado
        };

        _context.PagosReserva.Add(pago);
        await _context.SaveChangesAsync();

        totalConfirmado = await ReservaCobroSync.TotalConfirmadoAsync(_context, reservaId, ct);
        await ReservaCobroSync.SincronizarEstadoReservaAsync(_context, reserva, ct);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Pago registrado.",
            pagoId = pago.Id,
            pago.Monto,
            Estado = pago.Estado.ToString(),
            reservaEstado = reserva.Estado.ToString(),
            totalConfirmado,
            pendiente = Math.Max(0, reserva.MontoTotal - totalConfirmado),
            excedente = Math.Max(0, totalConfirmado - reserva.MontoTotal)
        });
    }

    /// <summary>
    /// Anula un cobro confirmado (no borra el registro: deja de sumar en caja y reportes).
    /// </summary>
    [HttpPost("{pagoId:guid}/anular")]
    [HasTenantPermission(PermisosApp.ReservasCrear)]
    public async Task<IActionResult> Anular(Guid reservaId, Guid pagoId, CancellationToken ct)
    {
        var reserva = await _context.Reservas.FirstOrDefaultAsync(r => r.Id == reservaId, ct);
        if (reserva == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Reserva no encontrada." });
        }

        if (reserva.Estado is EstadoReserva.Cancelada or EstadoReserva.Completada)
        {
            return BadRequest(new
            {
                error = "EstadoFinal",
                mensaje = "No se pueden anular cobros de una reserva cancelada o completada."
            });
        }

        var pago = await _context.PagosReserva
            .FirstOrDefaultAsync(p => p.Id == pagoId && p.ReservaId == reservaId, ct);
        if (pago == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Pago no encontrado." });
        }

        if (pago.Estado != EstadoPagoReserva.Confirmado)
        {
            return BadRequest(new { error = "YaAnulado", mensaje = "Este cobro ya está anulado." });
        }

        pago.Estado = EstadoPagoReserva.Rechazado;
        await ReservaCobroSync.SincronizarEstadoReservaAsync(_context, reserva, ct);
        await _context.SaveChangesAsync(ct);

        var totalConfirmado = await ReservaCobroSync.TotalConfirmadoAsync(_context, reservaId, ct);

        return Ok(new
        {
            mensaje = "Cobro anulado. Ya no cuenta en caja ni en reportes.",
            reservaEstado = reserva.Estado.ToString(),
            totalConfirmado,
            pendiente = Math.Max(0, reserva.MontoTotal - totalConfirmado),
            excedente = Math.Max(0, totalConfirmado - reserva.MontoTotal)
        });
    }
}

public class RegistrarPagoReservaRequest
{
    public Guid MedioPagoId { get; set; }
    public decimal Monto { get; set; }
    public string? CodigoOperacion { get; set; }
    public string? VoucherUrl { get; set; }
    public bool RegistradoSinVoucher { get; set; }
}
