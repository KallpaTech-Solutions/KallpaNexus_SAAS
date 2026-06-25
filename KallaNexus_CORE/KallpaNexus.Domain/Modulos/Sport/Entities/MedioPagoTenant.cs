using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Enums;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>
/// Medio de cobro configurado por el tenant (Yape, Plin, efectivo, pasarela futura, etc.).
/// </summary>
public class MedioPagoTenant : BaseTenantEntity
{
    public string Nombre { get; set; } = string.Empty;
    public TipoMedioPago Tipo { get; set; }
    public bool Activo { get; set; } = true;
    /// <summary>Reservas en línea deben adjuntar comprobante.</summary>
    public bool RequiereVoucherOnline { get; set; }
    /// <summary>Pago en el grass: puede registrarse sin voucher (ej. avisan por WhatsApp).</summary>
    public bool PermiteSinVoucherPresencial { get; set; } = true;
    /// <summary>Integración futura (Izipay, Culqi, etc.).</summary>
    public bool EsPasarelaExterna { get; set; }
    /// <summary>Mostrar en checkout de reserva web pública.</summary>
    public bool VisibleEnWeb { get; set; }
    public string? ConfiguracionIntegracionJson { get; set; }
    public int Orden { get; set; }
}
