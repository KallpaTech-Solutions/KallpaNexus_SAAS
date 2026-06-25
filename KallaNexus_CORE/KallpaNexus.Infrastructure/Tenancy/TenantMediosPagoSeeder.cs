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
    private static readonly (string Nombre, TipoMedioPago Tipo, bool VoucherOnline, bool SinVoucherPresencial, int Orden)[] Defaults =
    [
        ("Efectivo en caja", TipoMedioPago.Efectivo, false, true, 1),
        ("Transferencia bancaria", TipoMedioPago.Transferencia, true, true, 2),
        ("Yape", TipoMedioPago.Yape, true, true, 3),
        ("Plin", TipoMedioPago.Plin, true, true, 4),
        ("Izipay (POS)", TipoMedioPago.Izipay, true, true, 5),
        ("Pasarela en línea (futuro)", TipoMedioPago.Pasarela, true, false, 99),
    ];

    public static async Task EnsureDefaultsAsync(ApplicationDbContext appDb, Guid tenantId)
    {
        if (tenantId == Guid.Empty)
        {
            return;
        }

        await DeduplicateByNombreAsync(appDb);

        var tiposExistentes = await appDb.MediosPago
            .AsNoTracking()
            .Select(m => m.Tipo)
            .ToListAsync();

        var tiposSet = tiposExistentes.ToHashSet();
        var agregados = false;

        foreach (var d in Defaults)
        {
            if (tiposSet.Contains(d.Tipo))
            {
                continue;
            }

            appDb.MediosPago.Add(new MedioPagoTenant
            {
                TenantId = tenantId,
                Nombre = d.Nombre,
                Tipo = d.Tipo,
                RequiereVoucherOnline = d.VoucherOnline,
                PermiteSinVoucherPresencial = d.SinVoucherPresencial,
                EsPasarelaExterna = d.Tipo == TipoMedioPago.Pasarela,
                Orden = d.Orden,
                Activo = d.Tipo != TipoMedioPago.Pasarela,
            });
            agregados = true;
        }

        if (agregados)
        {
            await appDb.SaveChangesAsync();
        }
    }

    private static async Task DeduplicateByNombreAsync(ApplicationDbContext appDb)
    {
        var medios = await appDb.MediosPago
            .OrderBy(m => m.Orden)
            .ThenBy(m => m.Id)
            .ToListAsync();

        var vistos = new HashSet<(Guid TenantId, string Nombre)>();
        var eliminar = new List<MedioPagoTenant>();

        foreach (var m in medios)
        {
            if (!vistos.Add((m.TenantId, m.Nombre)))
            {
                eliminar.Add(m);
            }
        }

        if (eliminar.Count == 0)
        {
            return;
        }

        appDb.MediosPago.RemoveRange(eliminar);
        await appDb.SaveChangesAsync();
    }
}
