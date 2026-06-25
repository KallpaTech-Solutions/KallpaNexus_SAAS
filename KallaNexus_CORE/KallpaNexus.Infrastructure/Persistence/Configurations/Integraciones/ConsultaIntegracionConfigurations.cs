using KallpaNexus.Domain.Integraciones;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Integraciones;

public class ConsultaSunatRucCacheConfiguration : IEntityTypeConfiguration<ConsultaSunatRucCache>
{
    public void Configure(EntityTypeBuilder<ConsultaSunatRucCache> builder)
    {
        builder.ToTable("ConsultasSunatRuc");
        builder.HasKey(x => x.NumeroRuc);
        builder.Property(x => x.NumeroRuc).HasMaxLength(11);
        builder.Property(x => x.RazonSocial).HasMaxLength(250);
        builder.Property(x => x.Direccion).HasMaxLength(500);
    }
}

public class TipoCambioSunatCacheConfiguration : IEntityTypeConfiguration<TipoCambioSunatCache>
{
    public void Configure(EntityTypeBuilder<TipoCambioSunatCache> builder)
    {
        builder.ToTable("TiposCambioSunat");
        builder.HasKey(x => x.Fecha);
    }
}
