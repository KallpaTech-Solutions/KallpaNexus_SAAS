using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class PermisoConfiguration : IEntityTypeConfiguration<Permiso>
{
    public void Configure(EntityTypeBuilder<Permiso> builder)
    {
        builder.ToTable("Permisos", "admin");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Codigo).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Modulo).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Descripcion).HasMaxLength(200).IsRequired();
        builder.HasIndex(x => x.Codigo).IsUnique();
    }
}
