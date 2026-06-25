using System.Net;
using System.Text.Json;
using KallpaNexus.Domain.Common;

namespace KallpaNexus.API.Middleware;

/// <summary>
/// Protege /api/platform/* exigiendo JWT de plataforma (Bearer).
/// </summary>
public class PlatformAuthorizationMiddleware
{
    private readonly RequestDelegate _next;

    public PlatformAuthorizationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;
        if (!path.StartsWith("/api/platform"))
        {
            await _next(context);
            return;
        }

        if (path.StartsWith("/api/platform/auth/login") ||
            path.StartsWith("/api/platform/auth/logout"))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated == true &&
            context.User.HasClaim(AuthClaims.ActorType, AuthClaims.ActorPlatform))
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
        context.Response.ContentType = "application/json";
        var error = new
        {
            error = "NoAutorizado",
            mensaje = "Inicia sesión en POST /api/platform/auth/login y envía Authorization: Bearer {token}."
        };
        await context.Response.WriteAsync(JsonSerializer.Serialize(error));
    }
}
