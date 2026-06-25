using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class PlanSaaSConfiguration : IEntityTypeConfiguration<PlanSaaS>
{
    public void Configure(EntityTypeBuilder<PlanSaaS> builder)
    {
        builder.ToTable("PlanesSaaS", "admin");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
        builder.Property(x => x.PrecioMensual).HasColumnType("numeric(12,2)");
        builder.Property(x => x.DiasDuracionDemo);
    }
}
