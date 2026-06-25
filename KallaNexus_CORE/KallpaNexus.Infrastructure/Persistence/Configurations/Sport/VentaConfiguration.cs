using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class VentaConfiguration : IEntityTypeConfiguration<Venta>
{
    public void Configure(EntityTypeBuilder<Venta> builder)
    {
        builder.ToTable("Ventas");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ClienteNombre).HasMaxLength(120);
        builder.Property(x => x.MedioPagoNombre).HasMaxLength(80);
        builder.Property(x => x.Observaciones).HasMaxLength(500);
        builder.Property(x => x.RegistradoPorNombre).HasMaxLength(120);
        builder.Property(x => x.MontoTotal).HasPrecision(12, 2);
        builder.HasIndex(x => new { x.SucursalId, x.FechaHora });

        builder.HasMany(v => v.Items)
               .WithOne()
               .HasForeignKey(i => i.VentaId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class VentaItemConfiguration : IEntityTypeConfiguration<VentaItem>
{
    public void Configure(EntityTypeBuilder<VentaItem> builder)
    {
        builder.ToTable("VentaItems");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ProductoNombre).HasMaxLength(120).IsRequired();
        builder.Property(x => x.PrecioUnitario).HasPrecision(12, 2);
        builder.Property(x => x.Subtotal).HasPrecision(12, 2);
        builder.HasIndex(x => x.VentaId);
    }
}
