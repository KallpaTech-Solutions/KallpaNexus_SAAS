using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Master;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("Tenants", "admin");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Subdomain).HasMaxLength(63).IsRequired();
        builder.Property(x => x.NombreComercialNegocio).HasMaxLength(200).IsRequired();

        builder.HasIndex(x => x.Subdomain).IsUnique();

        builder.HasOne(x => x.ClienteEmpresa)
            .WithMany(c => c.Tenants)
            .HasForeignKey(x => x.ClienteEmpresaId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
