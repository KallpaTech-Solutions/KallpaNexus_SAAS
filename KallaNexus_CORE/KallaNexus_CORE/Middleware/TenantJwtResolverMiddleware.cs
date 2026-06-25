using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Middleware;

/// <summary>
/// Si no hay tenant por host/header, lo toma del JWT staff (claim tenant_id).
/// </summary>
public class TenantJwtResolverMiddleware
{
    private readonly RequestDelegate _next;

    public TenantJwtResolverMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        ITenantProvider tenantProvider,
        MasterDbContext masterDb)
    {
        if (tenantProvider.GetTenantId() == null &&
            context.User.Identity?.IsAuthenticated == true &&
            context.User.HasClaim(AuthClaims.ActorType, AuthClaims.ActorTenantStaff))
        {
            var claim = context.User.FindFirst(AuthClaims.TenantId)?.Value;
            if (Guid.TryParse(claim, out var tenantId))
            {
                var tenant = await masterDb.Tenants
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Id == tenantId && t.IsActive);

                if (tenant != null && tenantProvider is TenantProvider provider)
                {
                    provider.SetTenant(tenant);
                }
            }
        }

        await _next(context);
    }
}
