using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class SolicitudContratoPlanConfiguration : IEntityTypeConfiguration<SolicitudContratoPlan>
{
    public void Configure(EntityTypeBuilder<SolicitudContratoPlan> builder)
    {
        builder.ToTable("SolicitudesContratoPlan", "admin");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Subdomain).HasMaxLength(80);
        builder.Property(x => x.MensajeCliente).HasMaxLength(2000);
        builder.Property(x => x.NotasPlataforma).HasMaxLength(4000);
        builder.Property(x => x.SolicitanteNombre).HasMaxLength(200).IsRequired();
        builder.Property(x => x.SolicitanteDni).HasMaxLength(20).IsRequired();
        builder.Property(x => x.SolicitanteEmail).HasMaxLength(256);

        builder.HasIndex(x => new { x.ClienteEmpresaId, x.Estado });

        builder.HasOne(x => x.ClienteEmpresa)
            .WithMany()
            .HasForeignKey(x => x.ClienteEmpresaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.PlanSaaS)
            .WithMany()
            .HasForeignKey(x => x.PlanSaaSId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
