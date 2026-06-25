using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class MedioPagoTenantConfiguration : IEntityTypeConfiguration<MedioPagoTenant>
{
    public void Configure(EntityTypeBuilder<MedioPagoTenant> builder)
    {
        builder.ToTable("MediosPago");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Nombre).HasMaxLength(80).IsRequired();
        builder.Property(x => x.ConfiguracionIntegracionJson).HasMaxLength(4000);
        builder.HasIndex(x => x.TenantId);
    }
}
