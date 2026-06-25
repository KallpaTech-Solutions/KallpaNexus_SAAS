using KallpaNexus.Domain.Interfaces;
using System.Net;
using System.Text.Json;

namespace KallpaNexus.API.Middleware
{
    /// <summary>
    /// Middleware encargado de blindar las rutas de negocio.
    /// Bloquea cualquier intento de acceso a módulos transaccionales desde el dominio raíz (localhost).
    /// </summary>
    public class TenantSecurityMiddleware
    {
        private readonly RequestDelegate _next;

        // Lista de rutas blancas (Excepciones que SÍ se pueden ver desde localhost/Master)
        private readonly List<string> _prefijosSinTenant = new()
        {
            "/api/tenanttest",
            "/api/onboarding",
            "/api/platform",
            "/api/auth/consumidor",
            "/api/tenant/auth/login",
            "/api/tenant/auth/login-global",
            "/api/public/hub",
            "/swagger"
        };

        public TenantSecurityMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, ITenantProvider tenantProvider)
        {
            var rutaActual = context.Request.Path.Value?.ToLower() ?? string.Empty;

            // 1. Verificar si la ruta actual requiere protección (todas las de /api/ menos las excluidas)
            bool requiereTenant = rutaActual.StartsWith("/api/")
                && !_prefijosSinTenant.Any(p => rutaActual.StartsWith(p));

            if (requiereTenant)
            {
                // 2. Si requiere Tenant pero el proveedor no tiene un ID, bloqueamos la petición
                if (tenantProvider.GetTenantId() == null)
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    context.Response.ContentType = "application/json";

                    var respuestaError = new
                    {
                        error = "SubdominioRequerido",
                        mensaje =
                            $"Acceso denegado a '{context.Request.Path}'. Inicia sesión staff (POST /api/tenant/auth/login-global) y envía Bearer, " +
                            "o usa el subdominio en la URL / header X-Tenant-Subdomain."
                    };

                    var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                    await context.Response.WriteAsync(JsonSerializer.Serialize(respuestaError, jsonOptions));

                    return; // 🛑 Cortamos el circuito aquí, la petición nunca llega al controlador
                }
            }

            // Si todo está en orden o es una ruta maestra, dejamos pasar la petición
            await _next(context);
        }
    }
}
