using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Middleware;

/// <summary>
/// Resuelve tenant desde la ruta /api/public/{slug}/ cuando no hay subdominio (MVP path /t/slug).
/// </summary>
public class PublicTenantSlugMiddleware
{
    private readonly RequestDelegate _next;

    public PublicTenantSlugMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, MasterDbContext masterDb, ITenantProvider tenantProvider)
    {
        if (tenantProvider.GetTenantId() == null)
        {
            var path = context.Request.Path.Value ?? string.Empty;
            const string prefix = "/api/public/";
            if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var rest = path[prefix.Length..];
                var slash = rest.IndexOf('/');
                var slug = (slash >= 0 ? rest[..slash] : rest).Trim().ToLowerInvariant();
                if (!string.IsNullOrEmpty(slug) &&
                    !string.Equals(slug, "hub", StringComparison.OrdinalIgnoreCase))
                {
                    var tenant = await masterDb.Tenants
                        .AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Subdomain == slug && t.IsActive);
                    if (tenant != null)
                    {
                        ((TenantProvider)tenantProvider).SetTenant(tenant);
                    }
                }
            }
        }

        await _next(context);
    }
}
