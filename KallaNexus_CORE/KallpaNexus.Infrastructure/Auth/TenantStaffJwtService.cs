using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace KallpaNexus.Infrastructure.Auth;

public class TenantStaffJwtService
{
    public const string SchemeName = "TenantStaff";

    private readonly IConfiguration _configuration;

    public TenantStaffJwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerarToken(UsuarioStaff usuario, IReadOnlyList<string> permisos)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetSigningKey()));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var horas = _configuration.GetValue("Jwt:ExpiresHours", 168);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Email, usuario.Email ?? string.Empty),
            new(ClaimTypes.Name, usuario.NombreCompleto),
            new("dni", usuario.Dni),
            new(AuthClaims.ActorType, AuthClaims.ActorTenantStaff),
            new(AuthClaims.TenantId, usuario.TenantId.ToString()),
            new(AuthClaims.RolCodigo, usuario.RolTenant.Codigo),
            new(AuthClaims.RolNivel, usuario.RolTenant.Nivel.ToString())
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
            throw new InvalidOperationException("Jwt:Key debe tener al menos 32 caracteres.");
        }

        return key;
    }

    public string GetAudience() =>
        _configuration["Jwt:AudienceTenantStaff"] ?? "KallpaNexus.TenantStaff";
}
