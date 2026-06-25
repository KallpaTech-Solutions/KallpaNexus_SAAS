using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Middleware
{
    public class TenantResolverMiddleware
    {
        private readonly RequestDelegate _next;

        public TenantResolverMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, MasterDbContext masterDb, ITenantProvider tenantProvider)
        {
            if (IsInfrastructurePath(context.Request.Path))
            {
                await _next(context);
                return;
            }

            // 1. Extraer el host (ej: sportza.kallpanexus.com)
            var host = context.Request.Host.Host;

            // 2. Obtener el subdominio (la primera parte antes del punto)
            // Si entras por localhost:5000, el subdominio será "localhost"
            var subdomain = host.Split('.')[0];

            if (string.Equals(subdomain, "localhost", StringComparison.OrdinalIgnoreCase) ||
                subdomain == "127")
            {
                if (context.Request.Headers.TryGetValue("X-Tenant-Subdomain", out var headerSub) &&
                    !string.IsNullOrWhiteSpace(headerSub))
                {
                    subdomain = headerSub.ToString().Trim().ToLowerInvariant();
                }
            }

            if (!string.IsNullOrEmpty(subdomain))
            {
                // 3. Buscar el cliente en la Base de Datos Maestra
                var tenant = await masterDb.Tenants
                    .FirstOrDefaultAsync(t => t.Subdomain == subdomain && t.IsActive);

                if (tenant != null)
                {
                    // 4. Inyectar el tenant encontrado en nuestro proveedor de contexto
                    // Hacemos un cast para acceder al método SetTenant
                    ((TenantProvider)tenantProvider).SetTenant(tenant);
                }
            }

            // Seguir con el siguiente middleware en la tubería
            await _next(context);
        }

        private static bool IsInfrastructurePath(PathString path) =>
            path.StartsWithSegments("/healthz") || path == "/";
    }
 }
