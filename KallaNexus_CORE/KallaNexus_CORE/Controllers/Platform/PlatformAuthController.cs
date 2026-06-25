using System.Security.Claims;
using KallpaNexus.Domain.Common;
using KallpaNexus.Infrastructure.Auth;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Platform;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Platform)]
[ApiController]
[Route("api/platform/auth")]
public class PlatformAuthController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly PlatformJwtService _jwt;
    private readonly PlatformRbacService _rbac;

    public PlatformAuthController(
        MasterDbContext masterDb,
        PlatformJwtService jwt,
        PlatformRbacService rbac)
    {
        _masterDb = masterDb;
        _jwt = jwt;
        _rbac = rbac;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] PlatformLoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var usuario = await _masterDb.UsuariosPlataforma
            .Include(u => u.RolPlataforma)
            .FirstOrDefaultAsync(u => u.Email == email && u.Activo);

        if (usuario == null || !PlatformPasswordHasher.Verify(request.Password, usuario.PasswordHash))
        {
            return Unauthorized(new { error = "CredencialesInvalidas", mensaje = "Email o contraseña incorrectos." });
        }

        var permisos = await _rbac.ObtenerPermisosUsuarioAsync(usuario.Id);
        var token = _jwt.GenerarToken(usuario, permisos);

        return Ok(new
        {
            mensaje = "Login exitoso. Usa Authorization: Bearer {token} en Swagger.",
            token,
            usuario.Id,
            usuario.NombreCompleto,
            usuario.Email,
            rol = usuario.RolPlataforma.Codigo,
            permisos
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { mensaje = "Elimina el token Bearer en el cliente o en Swagger." });
    }

    [Authorize(AuthenticationSchemes = PlatformJwtService.SchemeName)]
    [HttpGet("yo")]
    public async Task<IActionResult> PerfilActual()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(idClaim, out var usuarioId))
        {
            return Unauthorized();
        }

        var usuario = await _masterDb.UsuariosPlataforma
            .AsNoTracking()
            .Include(u => u.RolPlataforma)
            .FirstOrDefaultAsync(u => u.Id == usuarioId && u.Activo);

        if (usuario == null)
        {
            return NotFound();
        }

        var permisos = User.FindAll(AuthClaims.Permiso).Select(c => c.Value).ToList();

        return Ok(new
        {
            usuario.Id,
            usuario.NombreCompleto,
            usuario.Email,
            Rol = usuario.RolPlataforma.Codigo,
            usuario.RolPlataforma.Nombre,
            Permisos = permisos
        });
    }
}

public class PlatformLoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
