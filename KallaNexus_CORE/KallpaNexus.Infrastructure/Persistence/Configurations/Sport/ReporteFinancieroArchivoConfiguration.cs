using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class ReporteFinancieroArchivoConfiguration : IEntityTypeConfiguration<ReporteFinancieroArchivo>
{
    public void Configure(EntityTypeBuilder<ReporteFinancieroArchivo> builder)
    {
        builder.ToTable("ReportesFinancierosArchivo");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Codigo).HasMaxLength(32).IsRequired();
        builder.Property(x => x.SucursalNombre).HasMaxLength(200);
        builder.Property(x => x.Ciudad).HasMaxLength(120);
        builder.Property(x => x.GeneradoPorNombre).HasMaxLength(200);
        builder.Property(x => x.DatosJson).IsRequired();
        builder.HasIndex(x => new { x.TenantId, x.Codigo }).IsUnique();
        builder.HasIndex(x => x.TenantId);
        builder.HasIndex(x => x.GeneradoEnUtc);
    }
}
