using KallpaNexus.API.Middleware;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using KallpaNexus.API.Media;
using KallpaNexus.Infrastructure.Integraciones;
using KallpaNexus.Infrastructure.Integraciones.Decolecta;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using KallpaNexus.API.Auth;
using KallpaNexus.API.Json;
using KallpaNexus.API.Swagger;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Render inyecta PORT numérico; ASPNETCORE_URLS con "$PORT" literal deja Kestrel en :80 y falla el health check.
var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(renderPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
}

// --- 1. CONFIGURACIÓN DE SERVICIOS ---

// Agregamos el parche para ignorar ciclos JSON y mostrar ENUMS como texto
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new UtcNullableDateTimeJsonConverter());
    });

builder.Services.AddHttpContextAccessor();
builder.Services.AddNexusJwtAuth(builder.Configuration);

// Registramos el proveedor de Tenants para el SaaS
builder.Services.AddScoped<ITenantProvider, TenantProvider>();

// Base de Datos Maestra (Usuarios/Tenants)
builder.Services.AddDbContext<MasterDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("MasterConnection")));

// Base de Datos de Aplicación (Dinámica)
builder.Services.AddDbContext<ApplicationDbContext>();

builder.Services.Configure<DecolectaOptions>(
    builder.Configuration.GetSection(DecolectaOptions.SectionName));
builder.Services.AddHttpClient<DecolectaApiClient>();
builder.Services.AddScoped<ConsultasIntegracionService>();
builder.Services.AddScoped<TenantWebMediaService>();

// Configuración de Swagger sin usar namespaces complejos
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddNexusSwaggerAudienceDocuments();
    options.AddNexusSwaggerJwt();
});

// Soporte nativo .NET (opcional, lo dejamos por compatibilidad)
builder.Services.AddOpenApi();
// Hace que Npgsql herede el comportamiento antiguo y no explote con DateTime locales
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
var app = builder.Build();

app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

app.MapGet("/health", () => Results.Text("OK", "text/plain; charset=utf-8"));

app.MapGet("/", () =>
    Results.Ok(new
    {
        service = "Kallpa Nexus API",
        status = "ok",
        healthCheck = "/healthz",
        ping = "/health",
        api = "/api",
    }));

// --- 2. CONFIGURACIÓN DEL PIPELINE (EL ORDEN IMPORTA) ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(ui =>
    {
        ui.ConfigObject.PersistAuthorization = true;
        ui.DisplayRequestDuration();
        foreach (var doc in ApiDocumentationGroups.Documents)
        {
            ui.SwaggerEndpoint($"/swagger/{doc.Id}/swagger.json", doc.Title);
        }

        ui.DefaultModelsExpandDepth(1);
        ui.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.List);
    });
    app.MapOpenApi();
}

if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();

// Subdominio por URL o header (opcional)
app.UseMiddleware<TenantResolverMiddleware>();
app.UseMiddleware<PublicTenantSlugMiddleware>();

app.UseAuthentication();

// Sin header: tenant desde JWT staff (email/contraseña ya fijaron el negocio al login)
app.UseMiddleware<TenantJwtResolverMiddleware>();

app.UseMiddleware<TenantSecurityMiddleware>();
app.UseMiddleware<PlatformAuthorizationMiddleware>();
app.UseAuthorization();

app.MapControllers();

if (app.Environment.IsDevelopment())
{
    LogConnectionTarget(app.Logger, app.Configuration, "MasterConnection", "Master DB");
    LogConnectionTarget(app.Logger, app.Configuration, "SharedTenantConnection", "Shared tenant DB");
}

using (var scope = app.Services.CreateScope())
{
    var masterDb = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
    var appDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();

    try
    {
        await PlatformRbacSeeder.SeedAsync(masterDb, config);
        await SaaSPlanesSeeder.EnsureCatalogoAsync(masterDb);
        await masterDb.Database.MigrateAsync();
        await appDb.Database.MigrateAsync();
        await DevelopmentTenantDataSeeder.SeedAsync(
            app.Environment.IsDevelopment(),
            masterDb,
            appDb,
            tenantProvider,
            config);
    }
    catch (Exception ex) when (app.Environment.IsDevelopment() && IsDbConnectivityFailure(ex))
    {
        app.Logger.LogError(
            "PostgreSQL inaccesible en Development (revisa la línea 'Master DB → Host=...' arriba). " +
            "User Secrets en este proyecto sobrescriben appsettings.Development.json. " +
            "Usa el pooler Supabase (aws-1-us-east-1.pooler.supabase.com) o Postgres local localhost:5433.");
        throw;
    }
}

app.Run();

static void LogConnectionTarget(
    ILogger logger,
    IConfiguration configuration,
    string name,
    string label)
{
    var cs = configuration.GetConnectionString(name);
    if (string.IsNullOrWhiteSpace(cs))
    {
        logger.LogWarning("{Label}: sin ConnectionStrings:{Name}", label, name);
        return;
    }

    try
    {
        var b = new NpgsqlConnectionStringBuilder(cs);
        logger.LogInformation(
            "{Label} → Host={Host}, Port={Port}, Database={Database}, Username={Username}",
            label,
            b.Host,
            b.Port,
            b.Database,
            b.Username);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "{Label}: ConnectionStrings:{Name} inválida", label, name);
    }
}

static bool IsDbConnectivityFailure(Exception ex)
{
    for (var e = ex; e != null; e = e.InnerException)
    {
        if (e is System.Net.Sockets.SocketException or NpgsqlException or TimeoutException)
        {
            return true;
        }
    }

    return ex is InvalidOperationException;
}