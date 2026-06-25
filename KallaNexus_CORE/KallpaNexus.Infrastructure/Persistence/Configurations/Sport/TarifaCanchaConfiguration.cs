using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class TarifaCanchaConfiguration : IEntityTypeConfiguration<TarifaCancha>
{
    public void Configure(EntityTypeBuilder<TarifaCancha> builder)
    {
        builder.ToTable("TarifasCanchas");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Nombre)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.PrecioPorHora)
            .HasColumnType("numeric(12,2)")
            .IsRequired();

        builder.HasIndex(x => x.TenantId);

        // 🧙‍♂️ LA MAGIA DEL DESACOPLAMIENTO: Configuración de la tabla intermedia
        builder.HasMany(x => x.Canchas)
            .WithMany(c => c.Tarifas)
            .UsingEntity<CanchaTarifa>( // 👈 Usamos nuestra clase física en lugar de Dictionary
                j => j.HasOne(ct => ct.Cancha).WithMany().HasForeignKey(ct => ct.CanchaId),
                j => j.HasOne(ct => ct.TarifaCancha).WithMany().HasForeignKey(ct => ct.TarifaCanchaId),
                j => {
                    j.ToTable("CanchasTarifas");
                    j.HasKey(ct => new { ct.CanchaId, ct.TarifaCanchaId }); // Llave primaria compuesta
                }
            );
    }
}