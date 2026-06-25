using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Tenancy;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace KallpaNexus.Infrastructure.Auth;

public class PlatformJwtService
{
    public const string SchemeName = "Platform";

    private readonly IConfiguration _configuration;

    public PlatformJwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerarToken(UsuarioPlataforma usuario, IReadOnlyList<string> permisos)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetSigningKey()));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var horas = _configuration.GetValue("Jwt:ExpiresHours", 168);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Email, usuario.Email),
            new(ClaimTypes.Name, usuario.NombreCompleto),
            new(AuthClaims.ActorType, AuthClaims.ActorPlatform),
            new(AuthClaims.RolCodigo, usuario.RolPlataforma.Codigo),
            new(AuthClaims.RolNivel, usuario.RolPlataforma.Nivel.ToString())
        };

        foreach (var permiso in permisos.Distinct(StringComparer.Ordinal))
        {
            claims.Add(new Claim(AuthClaims.Permiso, permiso));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: GetAudience(),
            claims: claims,
            expires: DateTime.UtcNow.AddHours(horas),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GetSigningKey()
    {
        var key = _configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
        {
            throw new InvalidOperationException("Jwt:Key debe tener al menos 32 caracteres en configuración.");
        }

        return key;
    }

    public string GetAudience() =>
        _configuration["Jwt:AudiencePlatform"] ?? "KallpaNexus.Platform";
}
