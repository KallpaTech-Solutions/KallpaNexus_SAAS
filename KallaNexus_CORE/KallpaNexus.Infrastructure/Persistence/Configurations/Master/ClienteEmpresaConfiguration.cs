using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class ClienteEmpresaConfiguration : IEntityTypeConfiguration<ClienteEmpresa>
{
    public void Configure(EntityTypeBuilder<ClienteEmpresa> builder)
    {
        builder.ToTable("ClientesEmpresas", "admin");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.DocumentoFiscal).HasMaxLength(20).IsRequired();
        builder.Property(x => x.RazonSocial).HasMaxLength(200).IsRequired();
        builder.Property(x => x.NombreComercial).HasMaxLength(200).IsRequired();
        builder.Property(x => x.EmailFacturacion).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Telefono).HasMaxLength(20).IsRequired();
        builder.Property(x => x.DireccionFiscal).HasMaxLength(300);
        builder.Property(x => x.Pais).HasMaxLength(50).IsRequired();

        builder.HasIndex(x => x.DocumentoFiscal).IsUnique();

        builder.HasOne(x => x.PlanSaaS)
            .WithMany(p => p.ClientesEmpresas)
            .HasForeignKey(x => x.PlanSaaSId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
