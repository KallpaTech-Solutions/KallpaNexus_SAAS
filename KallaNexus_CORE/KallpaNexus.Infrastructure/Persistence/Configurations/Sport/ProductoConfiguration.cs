using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class ProductoConfiguration : IEntityTypeConfiguration<Producto>
{
    public void Configure(EntityTypeBuilder<Producto> builder)
    {
        builder.ToTable("Productos");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Nombre).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Descripcion).HasMaxLength(500);
        builder.Property(x => x.Categoria).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Precio).HasPrecision(12, 2);
        builder.HasIndex(x => new { x.SucursalId, x.Activo });
    }
}
