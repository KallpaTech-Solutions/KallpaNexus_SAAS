using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class CompraProductoConfiguration : IEntityTypeConfiguration<CompraProducto>
{
    public void Configure(EntityTypeBuilder<CompraProducto> builder)
    {
        builder.ToTable("ComprasProducto");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ProductoNombre).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Proveedor).HasMaxLength(200);
        builder.Property(x => x.CostoUnitario).HasPrecision(12, 2);
        builder.Property(x => x.CostoTotal).HasPrecision(12, 2);
        builder.Property(x => x.Observaciones).HasMaxLength(500);
        builder.Property(x => x.RegistradoPorNombre).HasMaxLength(120);
        builder.HasIndex(x => new { x.SucursalId, x.FechaHora });
        builder.HasIndex(x => x.ProductoId);
    }
}
