using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.TenantRbac;

public class RolTenantPermisoConfiguration : IEntityTypeConfiguration<RolTenantPermiso>
{
    public void Configure(EntityTypeBuilder<RolTenantPermiso> builder)
    {
        builder.ToTable("RolesTenantPermisos");
        builder.HasKey(x => new { x.RolTenantId, x.PermisoCodigo });
        builder.Property(x => x.PermisoCodigo).HasMaxLength(80).IsRequired();
        builder.HasOne(x => x.RolTenant)
            .WithMany(r => r.Permisos)
            .HasForeignKey(x => x.RolTenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
