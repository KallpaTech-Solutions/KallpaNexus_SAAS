using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class ReservaProductoSolicitadoConfiguration : IEntityTypeConfiguration<ReservaProductoSolicitado>
{
    private static readonly ValueConverter<DateTime, DateTime> UtcInstantConverter = new(
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

    public void Configure(EntityTypeBuilder<ReservaProductoSolicitado> builder)
    {
        builder.ToTable("ReservaProductosSolicitados");
        builder.Property(x => x.NombreProducto).HasMaxLength(200);
        builder.Property(x => x.PrecioUnitario).HasPrecision(18, 2);
        builder.Property(x => x.Subtotal).HasPrecision(18, 2);
        builder.HasOne(x => x.Reserva)
            .WithMany(r => r.ProductosSolicitados)
            .HasForeignKey(x => x.ReservaId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Producto)
            .WithMany()
            .HasForeignKey(x => x.ProductoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
