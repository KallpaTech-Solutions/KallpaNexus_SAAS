using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace KallpaNexus.API.Swagger;

/// <summary>
/// En localhost, documenta el header X-Tenant-Subdomain para resolver el tenant.
/// </summary>
public class SwaggerTenantSubdomainOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var path = context.ApiDescription.RelativePath ?? string.Empty;
        if (path.StartsWith("api/platform", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("api/onboarding", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("api/auth/consumidor", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (!path.StartsWith("api/", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        operation.Parameters ??= [];
        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-Tenant-Subdomain",
            In = ParameterLocation.Header,
            Required = false,
            Description =
                "Opcional si envías Bearer staff (el token trae tenant_id). " +
                "Obligatorio sin token en localhost. En producción suele bastar {subdomain}.tudominio.com.",
            Schema = new OpenApiSchema { Type = JsonSchemaType.String }
        });
    }
}
