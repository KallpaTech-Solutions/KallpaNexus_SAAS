using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport;

public class ReservaConfiguration : IEntityTypeConfiguration<Reserva>
{
    private static readonly ValueConverter<DateTime, DateTime> UtcInstantConverter = new(
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

    private static readonly ValueConverter<DateTime?, DateTime?> UtcInstantNullableConverter = new(
        v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v,
        v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

    public void Configure(EntityTypeBuilder<Reserva> builder)
    {
        builder.ToTable("Reservas");

        builder.Property(r => r.NombreClienteReserva)
            .HasMaxLength(150);

        builder.Property(r => r.HoraInicio).HasConversion(UtcInstantConverter);
        builder.Property(r => r.HoraFin).HasConversion(UtcInstantConverter);
        builder.Property(r => r.CanceladaEnUtc).HasConversion(UtcInstantNullableConverter);
        builder.Property(r => r.HoldExpiraEnUtc).HasConversion(UtcInstantNullableConverter);
        builder.Property(r => r.Origen).HasConversion<int>();
    }
}
