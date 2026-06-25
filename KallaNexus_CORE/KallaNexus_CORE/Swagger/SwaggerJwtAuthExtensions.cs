using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace KallpaNexus.API.Swagger;

public static class SwaggerJwtAuthExtensions
{
    public const string PlatformBearerSchemeId = "PlatformBearer";
    public const string ConsumidorBearerSchemeId = "ConsumidorBearer";
    public const string TenantStaffBearerSchemeId = "TenantStaffBearer";

    public static void AddNexusSwaggerJwt(this SwaggerGenOptions options)
    {
        options.AddSecurityDefinition(PlatformBearerSchemeId, new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Name = "Authorization",
            Description =
                "Plataforma (super admin SaaS): POST /api/platform/auth/login con usuario de **UsuariosPlataforma** " +
                "(Development: `Platform:SuperAdminEmail` / `Platform:SuperAdminPassword` en appsettings). " +
                "No uses gerente@sportza — ese correo es **staff del tenant** (documento Tenant — Staff). " +
                "Luego **Authorize** aquí (solo el token JWT)."
        });

        options.AddSecurityDefinition(ConsumidorBearerSchemeId, new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Name = "Authorization",
            Description =
                "Consumidor: POST /api/auth/consumidor/login → Authorize global con el token."
        });

        options.AddSecurityDefinition(TenantStaffBearerSchemeId, new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Name = "Authorization",
            Description =
                "Staff del negocio (panel Sport): header **X-Tenant-Subdomain** (ej. sportza) + POST /api/tenant/auth/login " +
                "(Development: `Development:Tenants` en appsettings, ej. gerente@sportza.com). " +
                "Documento Swagger: **Tenant — Staff**, no Plataforma."
        });

        options.OperationFilter<SwaggerJwtOperationFilter>();
        options.OperationFilter<SwaggerTenantSubdomainOperationFilter>();
    }
}

/// <summary>
/// Aplica el esquema Bearer global por operación (sin campo Authorization manual en cada endpoint).
/// </summary>
public class SwaggerJwtOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var path = context.ApiDescription.RelativePath ?? string.Empty;

        if (path.StartsWith("api/platform", StringComparison.OrdinalIgnoreCase))
        {
            if (path.Contains("auth/login", StringComparison.OrdinalIgnoreCase) ||
                path.Contains("auth/logout", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            AplicarEsquema(operation, context, SwaggerJwtAuthExtensions.PlatformBearerSchemeId);
            return;
        }

        if (path.StartsWith("api/auth/consumidor", StringComparison.OrdinalIgnoreCase))
        {
            if (path.Contains("registro", StringComparison.OrdinalIgnoreCase) ||
                path.Contains("login", StringComparison.OrdinalIgnoreCase) ||
                path.Contains("logout", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            AplicarEsquema(operation, context, SwaggerJwtAuthExtensions.ConsumidorBearerSchemeId);
            return;
        }

        if (path.StartsWith("api/tenant", StringComparison.OrdinalIgnoreCase))
        {
            if (path.Contains("auth/login", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            AplicarEsquema(operation, context, SwaggerJwtAuthExtensions.TenantStaffBearerSchemeId);
            return;
        }

        if (EsRutaSportTenant(path))
        {
            AplicarEsquema(operation, context, SwaggerJwtAuthExtensions.TenantStaffBearerSchemeId);
        }
    }

    private static bool EsRutaSportTenant(string path) =>
        path.StartsWith("api/canchas", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("api/sucursales", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("api/tarifas", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("api/reservas", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("api/mediospago", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("api/configuracionnegocio", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("api/consultas", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("api/reportes", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("/pagos", StringComparison.OrdinalIgnoreCase);

    private static void AplicarEsquema(OpenApiOperation operation, OperationFilterContext context, string schemeId)
    {
        if (operation.Parameters != null)
        {
            for (var i = operation.Parameters.Count - 1; i >= 0; i--)
            {
                var p = operation.Parameters[i];
                if (string.Equals(p.Name, "Authorization", StringComparison.OrdinalIgnoreCase) &&
                    p.In == ParameterLocation.Header)
                {
                    operation.Parameters.RemoveAt(i);
                }
            }
        }

        var schemeRef = new OpenApiSecuritySchemeReference(schemeId, context.Document);
        operation.Security ??= [];
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            [schemeRef] = []
        });
    }
}
