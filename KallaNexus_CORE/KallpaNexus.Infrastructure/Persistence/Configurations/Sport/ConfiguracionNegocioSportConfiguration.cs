using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class ConfiguracionNegocioSportConfiguration : IEntityTypeConfiguration<ConfiguracionNegocioSport>
{
    public void Configure(EntityTypeBuilder<ConfiguracionNegocioSport> builder)
    {
        builder.ToTable("ConfiguracionNegocio");
        builder.HasIndex(x => x.TenantId).IsUnique();
        builder.Property(x => x.NombreComercial).HasMaxLength(200);
        builder.Property(x => x.RazonSocial).HasMaxLength(250);
        builder.Property(x => x.TelefonoWhatsAppNegocio).HasMaxLength(20);
        builder.Property(x => x.MensajeWhatsAppReserva).HasMaxLength(2000);
        builder.Property(x => x.TituloWebLanding).HasMaxLength(200);
        builder.Property(x => x.MensajeWebLanding).HasMaxLength(800);
        builder.Property(x => x.ImagenHeroRuta).HasMaxLength(500);
    }
}
