namespace KallpaNexus.API.Swagger;

/// <summary>
/// Grupos de OpenAPI (un JSON por audiencia en /swagger).
/// </summary>
public static class ApiDocumentationGroups
{
    public const string Platform = "platform";
    public const string TenantSport = "tenant-sport";
    public const string TenantStaff = "tenant-staff";
    public const string Consumer = "consumer";
    public const string Public = "public";
    public const string Dev = "dev";

    public static readonly IReadOnlyList<SwaggerAudienceDoc> Documents =
    [
        new(
            Platform,
            "Plataforma Kallpa",
            "Super admin Kallpa (tabla UsuariosPlataforma en BD master). " +
            "Login: POST /api/platform/auth/login — en Development usa admin@kallpanexus.com (ver appsettings Platform:SuperAdmin*). " +
            "El gerente@sportza.com es staff del club, no entra aquí. Auth: **PlatformBearer**."),
        new(
            TenantStaff,
            "Tenant — Staff (login y usuarios)",
            "Personal del negocio: login, roles y usuarios staff. " +
            "Login recomendado: POST /api/tenant/auth/login-global (DNI + contraseña; devuelve subdomain o lista de negocios). " +
            "Luego **TenantStaffBearer**; el tenant se carga del JWT (header X-Tenant-Subdomain opcional)."),
        new(
            TenantSport,
            "Tenant — Sport (panel operativo)",
            "Operación del club: canchas, reservas, sucursales, tarifas, medios de pago, configuración, consultas DNI/RUC. " +
            "JWT staff (tenant en el token). Header subdominio opcional en localhost. Usado por tenant-web."),
        new(
            Consumer,
            "Consumidor (B2C)",
            "App o portal del jugador/cliente final: registro, login y mis reservas. " +
            "Auth: POST /api/auth/consumidor/login → **ConsumidorBearer**."),
        new(
            Public,
            "Público — Onboarding y reservas web",
            "Registro de nuevos negocios y API sin login: GET/POST /api/public/{tenantSlug}/… (MVP path /t/{slug})."),
        new(
            Dev,
            "Desarrollo",
            "Utilidades solo para depuración en Development.")
    ];

    public sealed record SwaggerAudienceDoc(string Id, string Title, string Description);

    /// <summary>Resuelve el documento si el controlador no declara GroupName.</summary>
    public static string InferFromPath(string? relativePath)
    {
        var path = relativePath ?? string.Empty;
        if (path.StartsWith("api/platform/", StringComparison.OrdinalIgnoreCase))
        {
            return Platform;
        }

        if (path.StartsWith("api/tenant/", StringComparison.OrdinalIgnoreCase))
        {
            return TenantStaff;
        }

        if (path.StartsWith("api/auth/consumidor", StringComparison.OrdinalIgnoreCase))
        {
            return Consumer;
        }

        if (path.StartsWith("api/onboarding", StringComparison.OrdinalIgnoreCase))
        {
            return Public;
        }

        if (path.StartsWith("api/public/hub", StringComparison.OrdinalIgnoreCase))
        {
            return Public;
        }

        if (path.StartsWith("api/public/", StringComparison.OrdinalIgnoreCase))
        {
            return Public;
        }

        if (path.StartsWith("api/tenanttest", StringComparison.OrdinalIgnoreCase))
        {
            return Dev;
        }

        if (path.StartsWith("api/consultas", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("api/canchas", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("api/sucursales", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("api/tarifas", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("api/reservas", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("api/mediospago", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("api/configuracionnegocio", StringComparison.OrdinalIgnoreCase))
        {
            return TenantSport;
        }

        return TenantSport;
    }
}
