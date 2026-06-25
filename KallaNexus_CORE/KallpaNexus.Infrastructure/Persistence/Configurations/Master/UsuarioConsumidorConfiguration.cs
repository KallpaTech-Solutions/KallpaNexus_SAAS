using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class UsuarioConsumidorConfiguration : IEntityTypeConfiguration<UsuarioConsumidor>
{
    public void Configure(EntityTypeBuilder<UsuarioConsumidor> builder)
    {
        builder.ToTable("UsuariosConsumidor", "admin");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Dni).HasMaxLength(15).IsRequired();
        builder.Property(x => x.NombreCompleto).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Telefono).HasMaxLength(20).IsRequired();
        builder.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();

        builder.HasIndex(x => x.Dni).IsUnique();
        builder.HasIndex(x => x.Email).IsUnique();
    }
}
