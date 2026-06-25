using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using System.Reflection;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Entities.Compartido;
using KallpaNexus.Domain.Integraciones;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
    
public class ApplicationDbContext : DbContext
{
    private readonly ITenantProvider _tenantProvider;
    private readonly IConfiguration _configuration;

    // Propiedad calculada para obtener el Guid actual
    private Guid? CurrentTenantId => _tenantProvider.GetTenantId();

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ITenantProvider tenantProvider,
        IConfiguration configuration) : base(options)
    {
        _tenantProvider = tenantProvider;
        _configuration = configuration;
    }

    // ==========================================
    // COMPARTIDO (transversal a módulos)
    // ==========================================
    public DbSet<Cliente> Clientes => Set<Cliente>();

    // ==========================================
    // TABLAS DEL MÓDULO: NEXUS SPORT (en español)
    // ==========================================
    public DbSet<Sucursal> Sucursales => Set<Sucursal>();
    public DbSet<Cancha> Canchas => Set<Cancha>();
    public DbSet<Reserva> Reservas => Set<Reserva>();
    public DbSet<ReservaProductoSolicitado> ReservaProductosSolicitados => Set<ReservaProductoSolicitado>();
    public DbSet<TarifaCancha> TarifasCanchas => Set<TarifaCancha>();
    public DbSet<CanchaTarifa> CanchasTarifas => Set<CanchaTarifa>();
    public DbSet<MedioPagoTenant> MediosPago => Set<MedioPagoTenant>();
    public DbSet<ConfiguracionNegocioSport> ConfiguracionNegocio => Set<ConfiguracionNegocioSport>();
    public DbSet<PagoReserva> PagosReserva => Set<PagoReserva>();
    public DbSet<ReporteFinancieroArchivo> ReportesFinancierosArchivo => Set<ReporteFinancieroArchivo>();
    public DbSet<Producto>       Productos       => Set<Producto>();
    public DbSet<Venta>          Ventas          => Set<Venta>();
    public DbSet<VentaItem>      VentaItems      => Set<VentaItem>();
    public DbSet<CompraProducto> ComprasProducto => Set<CompraProducto>();
    public DbSet<Egreso>         Egresos         => Set<Egreso>();
    public DbSet<Persona> Personas => Set<Persona>();
    public DbSet<ConsultaSunatRucCache> ConsultasSunatRuc => Set<ConsultaSunatRucCache>();
    public DbSet<TipoCambioSunatCache> TiposCambioSunat => Set<TipoCambioSunatCache>();

    public DbSet<RolTenant> RolesTenant => Set<RolTenant>();
    public DbSet<RolTenantPermiso> RolesTenantPermisos => Set<RolTenantPermiso>();
    public DbSet<UsuarioStaff> UsuariosStaff => Set<UsuarioStaff>();
    public DbSet<UsuarioStaffSucursal> UsuariosStaffSucursales => Set<UsuarioStaffSucursal>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // Prioridad 1: ConnectionString dedicada del Tenant
        // Prioridad 2: ConnectionString compartida (Shared) del appsettings
        var connectionString = _tenantProvider.GetConnectionString()
                               ?? _configuration.GetConnectionString("SharedTenantConnection");

        if (!string.IsNullOrEmpty(connectionString))
        {
            optionsBuilder.UseNpgsql(connectionString);
        }

        optionsBuilder.ConfigureWarnings(w =>
            w.Ignore(RelationalEventId.PendingModelChangesWarning));

        base.OnConfiguring(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Aplica automáticamente SucursalConfiguration, CanchaConfiguration, etc.
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly,
            t => t.Namespace != null &&
                 (t.Namespace.Contains("Configurations.Sport") ||
                  t.Namespace.Contains("Configurations.Compartido") ||
                  t.Namespace.Contains("Configurations.Integraciones") ||
                  t.Namespace.Contains("Configurations.TenantRbac")));

        // BUSCAR TODAS LAS ENTIDADES QUE HEREDAN DE BaseTenantEntity
        var tenantEntities = modelBuilder.Model
            .GetEntityTypes()
            .Where(t => typeof(BaseTenantEntity).IsAssignableFrom(t.ClrType));

        foreach (var entityType in tenantEntities)
        {
            // Usamos reflexión para llamar al método genérico de filtrado
            var method = typeof(ApplicationDbContext)
                .GetMethod(nameof(SetTenantFilter), BindingFlags.NonPublic | BindingFlags.Instance)
                ?.MakeGenericMethod(entityType.ClrType);

            method?.Invoke(this, new object[] { modelBuilder });
        }
    }

    // El "Guardián" de las consultas
    private void SetTenantFilter<TEntity>(ModelBuilder modelBuilder) where TEntity : BaseTenantEntity
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            CurrentTenantId != null && e.TenantId == CurrentTenantId);
    }

    // El "Guardaespaldas" de las inserciones
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = CurrentTenantId;

        if (tenantId.HasValue)
        {
            var entries = ChangeTracker.Entries<BaseTenantEntity>()
                .Where(e => e.State == EntityState.Added);

            foreach (var entry in entries)
            {
                entry.Entity.TenantId = tenantId.Value;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}