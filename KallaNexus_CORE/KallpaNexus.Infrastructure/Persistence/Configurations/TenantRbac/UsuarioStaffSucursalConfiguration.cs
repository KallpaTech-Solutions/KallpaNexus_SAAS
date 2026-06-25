using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.TenantRbac;

public class UsuarioStaffSucursalConfiguration : IEntityTypeConfiguration<UsuarioStaffSucursal>
{
    public void Configure(EntityTypeBuilder<UsuarioStaffSucursal> builder)
    {
        builder.ToTable("UsuariosStaffSucursales");
        builder.HasKey(x => new { x.UsuarioStaffId, x.SucursalId });
        builder.HasOne(x => x.UsuarioStaff)
            .WithMany(u => u.SucursalesAsignadas)
            .HasForeignKey(x => x.UsuarioStaffId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Sucursal>()
            .WithMany()
            .HasForeignKey(x => x.SucursalId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
