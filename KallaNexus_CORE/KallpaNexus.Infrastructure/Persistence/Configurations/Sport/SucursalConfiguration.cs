using KallpaNexus.Domain.Modulos.Sport.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Infrastructure.Persistence.Configurations.Sport
{
    public class SucursalConfiguration : IEntityTypeConfiguration<Sucursal>
    {
        public void Configure(EntityTypeBuilder<Sucursal> builder) 
        { 
            builder.ToTable("Sucursales"); 
            builder.HasKey(x => x.Id); 
            builder.Property(x => x.Nombre).HasMaxLength(150).IsRequired(); 
            builder.Property(x => x.Direccion).HasMaxLength(300);
            builder.Property(x => x.Ciudad).HasMaxLength(80);
            builder.Property(x => x.Telefono).HasMaxLength(20);
            builder.Property(x => x.TelefonoWhatsApp).HasMaxLength(20);
            builder.Property(x => x.EnlaceGoogleMaps).HasMaxLength(2048);
            builder.HasIndex(x => x.TenantId); }
    }
}
