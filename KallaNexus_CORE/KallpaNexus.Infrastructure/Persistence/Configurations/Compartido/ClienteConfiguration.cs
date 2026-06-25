using KallpaNexus.Domain.Entities.Compartido;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Compartido;

public class ClienteConfiguration : IEntityTypeConfiguration<Cliente>
{
    public void Configure(EntityTypeBuilder<Cliente> builder)
    {
        builder.ToTable("Clientes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Dni)
            .HasMaxLength(15)
            .IsRequired();

        builder.Property(x => x.NombreCompleto)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(x => x.Telefono)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Email)
            .HasMaxLength(150);

        builder.HasIndex(x => new { x.TenantId, x.Dni })
            .IsUnique();

        builder.HasIndex(x => x.UsuarioConsumidorId);

        builder.HasMany(x => x.Reservas)
            .WithOne(r => r.Cliente)
            .HasForeignKey(r => r.ClienteId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
