using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.TenantRbac;

public class RolTenantConfiguration : IEntityTypeConfiguration<RolTenant>
{
    public void Configure(EntityTypeBuilder<RolTenant> builder)
    {
        builder.ToTable("RolesTenant");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Codigo).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => new { x.TenantId, x.Codigo }).IsUnique();
    }
}
