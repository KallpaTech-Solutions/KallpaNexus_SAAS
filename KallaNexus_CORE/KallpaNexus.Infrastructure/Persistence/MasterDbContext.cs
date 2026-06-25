using KallpaNexus.Domain.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.Infrastructure.Persistence;

public class MasterDbContext : DbContext
{
    public MasterDbContext(DbContextOptions<MasterDbContext> options) : base(options)
    {
    }

    public DbSet<PlanSaaS> PlanesSaaS => Set<PlanSaaS>();
    public DbSet<SolicitudContratoPlan> SolicitudesContratoPlan => Set<SolicitudContratoPlan>();
    public DbSet<ClienteEmpresa> ClientesEmpresas => Set<ClienteEmpresa>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Permiso> Permisos => Set<Permiso>();
    public DbSet<RolPlataforma> RolesPlataforma => Set<RolPlataforma>();
    public DbSet<RolPlataformaPermiso> RolesPlataformaPermisos => Set<RolPlataformaPermiso>();
    public DbSet<UsuarioPlataforma> UsuariosPlataforma => Set<UsuarioPlataforma>();
    public DbSet<UsuarioConsumidor> UsuariosConsumidor => Set<UsuarioConsumidor>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(MasterDbContext).Assembly,
            t => t.Namespace != null && t.Namespace.Contains("Configurations.Master"));
    }
}
