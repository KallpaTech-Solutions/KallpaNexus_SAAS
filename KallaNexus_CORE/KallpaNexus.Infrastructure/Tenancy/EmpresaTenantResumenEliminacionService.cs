using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Tenancy;

public sealed class EmpresaEliminacionConteos
{
    public int Tenants { get; init; }
    public int Sucursales { get; init; }
    public int Canchas { get; init; }
    public int Tarifas { get; init; }
    public int Reservas { get; init; }
    public int Ventas { get; init; }
    public int Productos { get; init; }
    public int UsuariosStaff { get; init; }
    public int Clientes { get; init; }
    public int MediosPago { get; init; }
    public int Egresos { get; init; }
    public int ReportesArchivados { get; init; }

    public int TotalRegistrosOperativos =>
        Sucursales + Canchas + Tarifas + Reservas + Ventas + Productos + UsuariosStaff + Clientes +
        MediosPago + Egresos + ReportesArchivados;
}

public sealed class EmpresaEliminacionTenantResumen
{
    public Guid TenantId { get; init; }
    public string Subdomain { get; init; } = "";
    public string NombreComercialNegocio { get; init; } = "";
    public EmpresaEliminacionConteos Conteos { get; init; } = new();
}

public static class EmpresaTenantResumenEliminacionService
{
    public static async Task<EmpresaEliminacionConteos> ContarTenantsAsync(
        ApplicationDbContext db,
        IReadOnlyList<Guid> tenantIds,
        CancellationToken ct = default)
    {
        if (tenantIds.Count == 0)
        {
            return new EmpresaEliminacionConteos();
        }

        return new EmpresaEliminacionConteos
        {
            Tenants = tenantIds.Count,
            Sucursales = await db.Sucursales.IgnoreQueryFilters()
                .CountAsync(s => tenantIds.Contains(s.TenantId), ct),
            Canchas = await db.Canchas.IgnoreQueryFilters()
                .CountAsync(c => tenantIds.Contains(c.TenantId), ct),
            Tarifas = await db.TarifasCanchas.IgnoreQueryFilters()
                .CountAsync(t => tenantIds.Contains(t.TenantId), ct),
            Reservas = await db.Reservas.IgnoreQueryFilters()
                .CountAsync(r => tenantIds.Contains(r.TenantId), ct),
            Ventas = await db.Ventas.IgnoreQueryFilters()
                .CountAsync(v => tenantIds.Contains(v.TenantId), ct),
            Productos = await db.Productos.IgnoreQueryFilters()
                .CountAsync(p => tenantIds.Contains(p.TenantId), ct),
            UsuariosStaff = await db.UsuariosStaff.IgnoreQueryFilters()
                .CountAsync(u => tenantIds.Contains(u.TenantId), ct),
            Clientes = await db.Clientes.IgnoreQueryFilters()
                .CountAsync(c => tenantIds.Contains(c.TenantId), ct),
            MediosPago = await db.MediosPago.IgnoreQueryFilters()
                .CountAsync(m => tenantIds.Contains(m.TenantId), ct),
            Egresos = await db.Egresos.IgnoreQueryFilters()
                .CountAsync(e => tenantIds.Contains(e.TenantId), ct),
            ReportesArchivados = await db.ReportesFinancierosArchivo.IgnoreQueryFilters()
                .CountAsync(r => tenantIds.Contains(r.TenantId), ct),
        };
    }

    public static async Task<EmpresaEliminacionConteos> ContarTenantAsync(
        ApplicationDbContext db,
        Guid tenantId,
        CancellationToken ct = default) =>
        await ContarTenantsAsync(db, [tenantId], ct);
}
