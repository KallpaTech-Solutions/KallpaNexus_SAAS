using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class RolPlataformaConfiguration : IEntityTypeConfiguration<RolPlataforma>
{
    public void Configure(EntityTypeBuilder<RolPlataforma> builder)
    {
        builder.ToTable("RolesPlataforma", "admin");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Codigo).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Nivel).IsRequired();
        builder.Property(x => x.EsSistema).IsRequired();
        builder.HasIndex(x => x.Codigo).IsUnique();
    }
}
