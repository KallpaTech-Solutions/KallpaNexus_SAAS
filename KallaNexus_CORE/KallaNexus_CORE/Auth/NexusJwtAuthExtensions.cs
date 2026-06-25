using System.IdentityModel.Tokens.Jwt;
using System.Text;
using KallpaNexus.Infrastructure.Auth;
using KallpaNexus.Infrastructure.Platform;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace KallpaNexus.API.Auth;

public static class NexusJwtAuthExtensions
{
    public const string SmartBearerScheme = "SmartBearer";

    public static IServiceCollection AddNexusJwtAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
        {
            key = "KallpaNexus_Dev_SigningKey_Min32Chars_2026!";
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var issuer = configuration["Jwt:Issuer"] ?? "KallpaNexus";
        var audiencePlatform = configuration["Jwt:AudiencePlatform"] ?? "KallpaNexus.Platform";
        var audienceConsumidor = configuration["Jwt:Audience"] ?? "KallpaNexus.Consumidor";
        var audienceTenantStaff = configuration["Jwt:AudienceTenantStaff"] ?? "KallpaNexus.TenantStaff";

        services.AddSingleton<ConsumidorJwtService>();
        services.AddSingleton<PlatformJwtService>();
        services.AddSingleton<TenantStaffJwtService>();
        services.AddScoped<PlatformRbacService>();
        services.AddScoped<TenantRbacService>();
        services.AddScoped<TenantSuscripcionService>();
        services.AddScoped<TenantStaffSucursalService>();
        services.AddScoped<TenantStaffSucursalScopeService>();

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = SmartBearerScheme;
                options.DefaultChallengeScheme = SmartBearerScheme;
            })
            .AddPolicyScheme(SmartBearerScheme, "Bearer JWT", policy =>
            {
                policy.ForwardDefaultSelector = context =>
                {
                    var authorization = context.Request.Headers.Authorization.ToString();
                    if (string.IsNullOrWhiteSpace(authorization) ||
                        !authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        return NoBearerAuthenticationHandler.SchemeName;
                    }

                    var token = authorization["Bearer ".Length..].Trim();
                    if (string.IsNullOrEmpty(token))
                    {
                        return NoBearerAuthenticationHandler.SchemeName;
                    }

                    try
                    {
                        var handler = new JwtSecurityTokenHandler();
                        if (!handler.CanReadToken(token))
                        {
                            return NoBearerAuthenticationHandler.SchemeName;
                        }

                        var jwt = handler.ReadJwtToken(token);
                        var aud = jwt.Audiences.FirstOrDefault()
                                  ?? jwt.Claims.FirstOrDefault(c =>
                                      c.Type is "aud" or JwtRegisteredClaimNames.Aud)?.Value;

                        if (string.Equals(aud, audiencePlatform, StringComparison.Ordinal))
                        {
                            return PlatformJwtService.SchemeName;
                        }

                        if (string.Equals(aud, audienceTenantStaff, StringComparison.Ordinal))
                        {
                            return TenantStaffJwtService.SchemeName;
                        }

                        if (string.Equals(aud, audienceConsumidor, StringComparison.Ordinal))
                        {
                            return ConsumidorJwtService.SchemeName;
                        }
                    }
                    catch
                    {
                        return NoBearerAuthenticationHandler.SchemeName;
                    }

                    return NoBearerAuthenticationHandler.SchemeName;
                };
            })
            .AddScheme<AuthenticationSchemeOptions, NoBearerAuthenticationHandler>(
                NoBearerAuthenticationHandler.SchemeName,
                _ => { })
            .AddJwtBearer(PlatformJwtService.SchemeName, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audiencePlatform,
                    IssuerSigningKey = signingKey
                };
            })
            .AddJwtBearer(ConsumidorJwtService.SchemeName, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audienceConsumidor,
                    IssuerSigningKey = signingKey
                };
            })
            .AddJwtBearer(TenantStaffJwtService.SchemeName, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audienceTenantStaff,
                    IssuerSigningKey = signingKey
                };
            });

        services.AddAuthorization();
        return services;
    }
}
