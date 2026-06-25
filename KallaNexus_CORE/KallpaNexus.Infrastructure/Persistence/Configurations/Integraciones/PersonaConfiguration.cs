using KallpaNexus.Domain.Integraciones;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Integraciones;

public class PersonaConfiguration : IEntityTypeConfiguration<Persona>
{
    public void Configure(EntityTypeBuilder<Persona> builder)
    {
        builder.ToTable("Personas");
        builder.HasKey(x => x.NumeroDocumento);
        builder.Property(x => x.NumeroDocumento).HasMaxLength(15);
        builder.Property(x => x.FirstName).HasMaxLength(120);
        builder.Property(x => x.FirstLastName).HasMaxLength(80);
        builder.Property(x => x.SecondLastName).HasMaxLength(80);
        builder.Property(x => x.FullName).HasMaxLength(200);
        builder.Property(x => x.Telefono).HasMaxLength(20);
        builder.Property(x => x.Email).HasMaxLength(150);
        builder.Property(x => x.FuenteUltimaActualizacion).HasMaxLength(40);
    }
}
