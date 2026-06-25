using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class UsuarioPlataformaConfiguration : IEntityTypeConfiguration<UsuarioPlataforma>
{
    public void Configure(EntityTypeBuilder<UsuarioPlataforma> builder)
    {
        builder.ToTable("UsuariosPlataforma", "admin");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.NombreCompleto).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(150).IsRequired();
        builder.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();

        builder.HasIndex(x => x.Email).IsUnique();
        builder.HasIndex(x => x.Oculto);

        builder.HasOne(x => x.RolPlataforma)
            .WithMany(r => r.Usuarios)
            .HasForeignKey(x => x.RolPlataformaId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
