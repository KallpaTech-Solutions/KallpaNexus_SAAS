using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.TenantRbac;

public class UsuarioStaffConfiguration : IEntityTypeConfiguration<UsuarioStaff>
{
    public void Configure(EntityTypeBuilder<UsuarioStaff> builder)
    {
        builder.ToTable("UsuariosStaff");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Dni).HasMaxLength(8).IsRequired();
        builder.Property(x => x.NombreCompleto).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
        builder.HasIndex(x => new { x.TenantId, x.Dni }).IsUnique();
        builder.HasOne(x => x.RolTenant)
            .WithMany(r => r.Usuarios)
            .HasForeignKey(x => x.RolTenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
