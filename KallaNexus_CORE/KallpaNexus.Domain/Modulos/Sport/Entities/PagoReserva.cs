using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

public enum CanalPagoReserva
{
    Presencial = 0,
    Online = 1
}

public enum EstadoPagoReserva
{
    Pendiente = 0,
    Confirmado = 1,
    Rechazado = 2
}

/// <summary>
/// Registro de cobro asociado a una reserva (voucher, código de operación, etc.).
/// </summary>
public class PagoReserva : BaseTenantEntity
{
    public Guid ReservaId { get; set; }
    public Reserva Reserva { get; set; } = null!;
    public Guid MedioPagoId { get; set; }
    public MedioPagoTenant MedioPago { get; set; } = null!;
    public decimal Monto { get; set; }
    public string? CodigoOperacion { get; set; }
    public string? VoucherUrl { get; set; }
    public bool RegistradoSinVoucher { get; set; }
    public CanalPagoReserva Canal { get; set; }
    public EstadoPagoReserva Estado { get; set; } = EstadoPagoReserva.Pendiente;
}
