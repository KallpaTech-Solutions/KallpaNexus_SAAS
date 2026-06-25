using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Tenancy;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace KallpaNexus.Infrastructure.Auth;

public class ConsumidorJwtService
{
    public const string SchemeName = "Consumidor";
    public const string ClaimConsumidorId = "consumidor_id";
    public const string ClaimDni = "dni";

    private readonly IConfiguration _configuration;

    public ConsumidorJwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerarToken(UsuarioConsumidor usuario)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetSigningKey()));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var horas = _configuration.GetValue("Jwt:ExpiresHours", 168);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimConsumidorId, usuario.Id.ToString()),
            new Claim(ClaimDni, usuario.Dni),
            new Claim(ClaimTypes.Email, usuario.Email),
            new Claim(ClaimTypes.Name, usuario.NombreCompleto),
            new Claim(AuthClaims.ActorType, AuthClaims.ActorConsumidor)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
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
}
