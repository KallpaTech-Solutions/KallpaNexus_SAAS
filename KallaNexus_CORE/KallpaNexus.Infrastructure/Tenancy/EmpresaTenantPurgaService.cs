using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Tenancy;

/// <summary>Borrado operativo por <see cref="Guid"/> de tenant (sin tocar Personas ni UsuariosConsumidor).</summary>
public static class EmpresaTenantPurgaService
{
    public static async Task PurgarAsync(ApplicationDbContext db, Guid tenantId, CancellationToken ct = default)
    {
        await db.PagosReserva.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.ReservaProductosSolicitados.IgnoreQueryFilters().Where(e => e.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);
        await db.Reservas.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.VentaItems.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Ventas.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.ComprasProducto.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Egresos.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.CanchasTarifas.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Canchas.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.TarifasCanchas.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Productos.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.ReportesFinancierosArchivo.IgnoreQueryFilters().Where(e => e.TenantId == tenantId)
            .ExecuteDeleteAsync(ct);
        await db.MediosPago.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.ConfiguracionNegocio.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);

        var staffIds = await db.UsuariosStaff.IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId)
            .Select(u => u.Id)
            .ToListAsync(ct);

        if (staffIds.Count > 0)
        {
            await db.UsuariosStaffSucursales
                .Where(l => staffIds.Contains(l.UsuarioStaffId))
                .ExecuteDeleteAsync(ct);
        }

        await db.UsuariosStaff.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);

        var rolIds = await db.RolesTenant.IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId)
            .Select(r => r.Id)
            .ToListAsync(ct);

        if (rolIds.Count > 0)
        {
            await db.RolesTenantPermisos.Where(p => rolIds.Contains(p.RolTenantId)).ExecuteDeleteAsync(ct);
        }

        await db.RolesTenant.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Clientes.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
        await db.Sucursales.IgnoreQueryFilters().Where(e => e.TenantId == tenantId).ExecuteDeleteAsync(ct);
    }
}
