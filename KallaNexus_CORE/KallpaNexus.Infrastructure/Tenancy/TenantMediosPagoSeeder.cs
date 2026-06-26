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
    private static readonly (string Nombre, TipoMedioPago Tipo, bool VoucherOnline, bool SinVoucherPresencial, bool VisibleWeb, int Orden)[] Defaults =
    [
        ("Efectivo en caja", TipoMedioPago.Efectivo, false, true, false, 1),
        ("Transferencia bancaria", TipoMedioPago.Transferencia, true, true, true, 2),
        ("Yape", TipoMedioPago.Yape, true, true, true, 3),
        ("Plin", TipoMedioPago.Plin, true, true, true, 4),
        ("Izipay (POS)", TipoMedioPago.Izipay, true, true, false, 5),
        ("Pasarela en línea (futuro)", TipoMedioPago.Pasarela, true, false, false, 99),
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
                VisibleEnWeb = d.VisibleWeb,
                Orden = d.Orden,
                Activo = d.Tipo != TipoMedioPago.Pasarela,
            });
            agregados = true;
        }

        if (agregados)
        {
            await appDb.SaveChangesAsync();
        }

        await AlinearVisibleEnWebPagablesAsync(appDb);
    }

    /// <summary>Medios Yape/Plin/transferencia creados antes del flag VisibleEnWeb.</summary>
    public static async Task AlinearVisibleEnWebPagablesAsync(ApplicationDbContext appDb)
    {
        var tiposWeb = new[] { TipoMedioPago.Transferencia, TipoMedioPago.Yape, TipoMedioPago.Plin };
        var medios = await appDb.MediosPago
            .Where(m => tiposWeb.Contains(m.Tipo) && m.Activo && !m.EsPasarelaExterna && !m.VisibleEnWeb)
            .ToListAsync();

        if (medios.Count == 0)
        {
            return;
        }

        foreach (var m in medios)
        {
            m.VisibleEnWeb = true;
        }

        await appDb.SaveChangesAsync();
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
