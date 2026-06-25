using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Tenancy;

/// <summary>
/// Catálogo inicial de medios de pago por tenant (efectivo, Yape, Plin, etc.).
/// </summary>
public static class TenantMediosPagoSeeder
{
    public static async Task EnsureDefaultsAsync(ApplicationDbContext appDb)
    {
        if (await appDb.MediosPago.AnyAsync())
        {
            return;
        }

        var defaults = new (string Nombre, TipoMedioPago Tipo, bool VoucherOnline, bool SinVoucherPresencial, int Orden)[]
        {
            ("Efectivo en caja", TipoMedioPago.Efectivo, false, true, 1),
            ("Transferencia bancaria", TipoMedioPago.Transferencia, true, true, 2),
            ("Yape", TipoMedioPago.Yape, true, true, 3),
            ("Plin", TipoMedioPago.Plin, true, true, 4),
            ("Izipay (POS)", TipoMedioPago.Izipay, true, true, 5),
            ("Pasarela en línea (futuro)", TipoMedioPago.Pasarela, true, false, 99),
        };

        foreach (var d in defaults)
        {
            appDb.MediosPago.Add(new MedioPagoTenant
            {
                Nombre = d.Nombre,
                Tipo = d.Tipo,
                RequiereVoucherOnline = d.VoucherOnline,
                PermiteSinVoucherPresencial = d.SinVoucherPresencial,
                EsPasarelaExterna = d.Tipo == TipoMedioPago.Pasarela,
                Orden = d.Orden,
                Activo = d.Tipo != TipoMedioPago.Pasarela,
            });
        }

        await appDb.SaveChangesAsync();
    }
}
