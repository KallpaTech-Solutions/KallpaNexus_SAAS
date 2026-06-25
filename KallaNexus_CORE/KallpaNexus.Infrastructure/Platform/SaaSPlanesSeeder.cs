using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Platform;

public static class SaaSPlanesSeeder
{
    private static readonly Guid PlanEstandarId = Guid.Parse("a1000000-0000-4000-8000-000000000002");

    public static async Task EnsureCatalogoAsync(MasterDbContext masterDb)
    {
        if (!await masterDb.PlanesSaaS.AnyAsync(p => p.Id == PlanEstandarId))
        {
            masterDb.PlanesSaaS.Add(new PlanSaaS
            {
                Id = PlanEstandarId,
                Nombre = "Sport Estándar",
                PrecioMensual = 149m,
                LimiteSucursales = 10,
                LimiteUsuariosStaff = 15,
                SoportaModuloSport = true,
                SoportaModuloStay = false,
                SoportaModuloCare = false,
                SoportaFidelizacionPuntos = false,
                Activo = true
            });
            await masterDb.SaveChangesAsync();
        }
    }
}
