using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class EgresoConfiguration : IEntityTypeConfiguration<Egreso>
{
    public void Configure(EntityTypeBuilder<Egreso> builder)
    {
        builder.ToTable("Egresos");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Categoria).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Descripcion).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Monto).HasPrecision(12, 2);
        builder.Property(x => x.MedioPagoNombre).HasMaxLength(80);
        builder.Property(x => x.Observaciones).HasMaxLength(500);
        builder.Property(x => x.RegistradoPorNombre).HasMaxLength(120);
        builder.HasIndex(x => new { x.SucursalId, x.FechaHora });
    }
}
