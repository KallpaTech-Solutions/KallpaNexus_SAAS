using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class PagoReservaConfiguration : IEntityTypeConfiguration<PagoReserva>
{
    public void Configure(EntityTypeBuilder<PagoReserva> builder)
    {
        builder.ToTable("PagosReserva");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.CodigoOperacion).HasMaxLength(64);
        builder.Property(x => x.VoucherUrl).HasMaxLength(500);
        builder.HasOne(x => x.Reserva).WithMany().HasForeignKey(x => x.ReservaId);
        builder.HasOne(x => x.MedioPago).WithMany().HasForeignKey(x => x.MedioPagoId);
        builder.HasIndex(x => x.TenantId);
        builder.HasIndex(x => x.ReservaId);
    }
}
