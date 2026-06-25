using System.Security.Claims;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Auth;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Auth;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Consumer)]
[ApiController]
[Route("api/auth/consumidor")]
public class ConsumidorAuthController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly ApplicationDbContext _appDb;
    private readonly ConsumidorJwtService _jwt;

    public ConsumidorAuthController(
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ConsumidorJwtService jwt)
    {
        _masterDb = masterDb;
        _appDb = appDb;
        _jwt = jwt;
    }

    [HttpPost("registro")]
    public async Task<IActionResult> Registro([FromBody] RegistroConsumidorRequest request)
    {
        var dni = request.Dni.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

        if (dni.Length < 8)
        {
            return BadRequest(new { error = "DniInvalido", mensaje = "DNI inválido." });
        }

        if (await _masterDb.UsuariosConsumidor.AnyAsync(u => u.Dni == dni))
        {
            return BadRequest(new { error = "DniDuplicado", mensaje = "Ya existe una cuenta con este DNI." });
        }

        if (await _masterDb.UsuariosConsumidor.AnyAsync(u => u.Email == email))
        {
            return BadRequest(new { error = "EmailDuplicado", mensaje = "Ya existe una cuenta con este email." });
        }

        var usuario = new UsuarioConsumidor
        {
            Dni = dni,
            NombreCompleto = request.NombreCompleto.Trim(),
            Email = email,
            Telefono = request.Telefono.Trim(),
            PasswordHash = PlatformPasswordHasher.Hash(request.Password),
            Activo = true
        };

        _masterDb.UsuariosConsumidor.Add(usuario);
        await _masterDb.SaveChangesAsync();

        var token = _jwt.GenerarToken(usuario);

        return Ok(new
        {
            Mensaje = "Cuenta de consumidor creada.",
            Token = token,
            usuario.Id,
            usuario.Dni,
            usuario.NombreCompleto,
            usuario.Email
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginConsumidorRequest request)
    {
        var identificador = request.EmailODni.Trim().ToLowerInvariant();

        var usuario = await _masterDb.UsuariosConsumidor
            .FirstOrDefaultAsync(u =>
                (u.Email == identificador || u.Dni == identificador) && u.Activo);

        if (usuario == null || !PlatformPasswordHasher.Verify(request.Password, usuario.PasswordHash))
        {
            return Unauthorized(new { error = "CredencialesInvalidas", mensaje = "DNI/email o contraseña incorrectos." });
        }

        var token = _jwt.GenerarToken(usuario);

        return Ok(new
        {
            Mensaje = "Login exitoso.",
            Token = token,
            usuario.Id,
            usuario.Dni,
            usuario.NombreCompleto,
            usuario.Email
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { mensaje = "Cierra sesión eliminando el token en el cliente (Bearer)." });
    }

    [Authorize(AuthenticationSchemes = ConsumidorJwtService.SchemeName)]
    [HttpGet("yo")]
    public async Task<IActionResult> Yo()
    {
        var id = ObtenerConsumidorId();
        if (id == null)
        {
            return Unauthorized();
        }

        var usuario = await _masterDb.UsuariosConsumidor
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id.Value && u.Activo);

        if (usuario == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            usuario.Id,
            usuario.Dni,
            usuario.NombreCompleto,
            usuario.Email,
            usuario.Telefono
        });
    }

    [Authorize(AuthenticationSchemes = ConsumidorJwtService.SchemeName)]
    [HttpGet("mis-reservas")]
    public async Task<IActionResult> MisReservas()
    {
        var consumidorId = ObtenerConsumidorId();
        if (consumidorId == null)
        {
            return Unauthorized();
        }

        var reservas = await _appDb.Reservas
            .IgnoreQueryFilters()
            .Where(r => r.Cliente.UsuarioConsumidorId == consumidorId.Value)
            .OrderByDescending(r => r.HoraInicio)
            .Select(r => new
            {
                r.Id,
                r.TenantId,
                r.CanchaId,
                NombreCancha = r.Cancha.Nombre,
                r.HoraInicio,
                r.HoraFin,
                Estado = r.Estado.ToString(),
                r.MontoTotal
            })
            .ToListAsync();

        var tenantIds = reservas.Select(r => r.TenantId).Distinct().ToList();
        var tenants = await _masterDb.Tenants
            .Where(t => tenantIds.Contains(t.Id))
            .Select(t => new { t.Id, t.Subdomain, t.NombreComercialNegocio })
            .ToListAsync();

        var resultado = reservas.Select(r =>
        {
            var t = tenants.FirstOrDefault(x => x.Id == r.TenantId);
            return new
            {
                r.Id,
                r.TenantId,
                Subdomain = t?.Subdomain,
                Negocio = t?.NombreComercialNegocio,
                r.CanchaId,
                r.NombreCancha,
                r.HoraInicio,
                r.HoraFin,
                r.Estado,
                r.MontoTotal
            };
        });

        return Ok(resultado);
    }

    private Guid? ObtenerConsumidorId()
    {
        var claim = User.FindFirstValue(ConsumidorJwtService.ClaimConsumidorId);
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

public class RegistroConsumidorRequest
{
    public string Dni { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginConsumidorRequest
{
    public string EmailODni { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
