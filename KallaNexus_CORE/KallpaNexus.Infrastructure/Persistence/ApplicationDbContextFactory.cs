using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace KallpaNexus.Infrastructure.Persistence;

/// <summary>
/// Diseño EF: dotnet ef migrations add ... --project KallpaNexus.Infrastructure --startup-project KallaNexus_CORE
/// </summary>
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var basePath = Path.Combine(Directory.GetCurrentDirectory(), "..", "KallaNexus_CORE");
        var config = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddUserSecrets("a842ce80-3d80-48b3-b361-0abef646cb6f")
            .AddEnvironmentVariables()
            .Build();

        var cs =
            config.GetConnectionString("SharedTenantConnection")
            ?? "Host=localhost;Database=kallpanexus_tenant;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(cs)
            .Options;

        return new ApplicationDbContext(
            options,
            new DesignTimeTenantProvider(),
            config);
    }

    private sealed class DesignTimeTenantProvider : KallpaNexus.Domain.Interfaces.ITenantProvider
    {
        public Guid? GetTenantId() => null;
        public string? GetConnectionString() => null;
        public string? GetSubdomain() => null;
    }
}
