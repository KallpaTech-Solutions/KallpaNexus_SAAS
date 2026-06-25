using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class RolPlataformaPermisoConfiguration : IEntityTypeConfiguration<RolPlataformaPermiso>
{
    public void Configure(EntityTypeBuilder<RolPlataformaPermiso> builder)
    {
        builder.ToTable("RolesPlataformaPermisos", "admin");
        builder.HasKey(x => new { x.RolPlataformaId, x.PermisoId });

        builder.HasOne(x => x.RolPlataforma)
            .WithMany(r => r.Permisos)
            .HasForeignKey(x => x.RolPlataformaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Permiso)
            .WithMany(p => p.Roles)
            .HasForeignKey(x => x.PermisoId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
