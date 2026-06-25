using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Platform;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Platform)]
[ApiController]
[Route("api/platform/usuarios")]
public class PlatformUsuariosController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly PlatformRbacService _rbac;

    public PlatformUsuariosController(MasterDbContext masterDb, PlatformRbacService rbac)
    {
        _masterDb = masterDb;
        _rbac = rbac;
    }

    [HttpGet]
    [HasPermission(PermisosApp.PlatformUsuariosVer)]
    public async Task<IActionResult> Listar()
    {
        var usuarios = await _rbac.QueryUsuariosVisibles(User)
            .OrderBy(u => u.NombreCompleto)
            .Select(u => new
            {
                u.Id,
                u.NombreCompleto,
                u.Email,
                Rol = u.RolPlataforma.Codigo,
                RolNombre = u.RolPlataforma.Nombre,
                u.RolPlataforma.Nivel,
                u.Activo,
                u.Oculto,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(usuarios);
    }

    [HttpGet("{usuarioId:guid}")]
    [HasPermission(PermisosApp.PlatformUsuariosVer)]
    public async Task<IActionResult> Obtener(Guid usuarioId)
    {
        var usuario = await _rbac.QueryUsuariosVisibles(User)
            .Where(u => u.Id == usuarioId)
            .Select(u => new
            {
                u.Id,
                u.NombreCompleto,
                u.Email,
                Rol = u.RolPlataforma.Codigo,
                RolNombre = u.RolPlataforma.Nombre,
                u.RolPlataforma.Nivel,
                u.Activo,
                u.Oculto,
                u.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (usuario == null)
        {
            return NotFound();
        }

        return Ok(usuario);
    }

    [HttpPost]
    [HasPermission(PermisosApp.PlatformUsuariosCrear)]
    public async Task<IActionResult> Crear([FromBody] CrearUsuarioPlataformaRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _masterDb.UsuariosPlataforma.AnyAsync(u => u.Email == email))
        {
            return BadRequest(new { error = "EmailDuplicado", mensaje = "Ya existe un usuario con ese email." });
        }

        var rol = await _rbac.ObtenerRolPorIdAsync(request.RolPlataformaId);
        if (rol == null)
        {
            return BadRequest(new { error = "RolInvalido", mensaje = "Rol de plataforma no encontrado." });
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (!_rbac.PuedeAsignarRol(nivelCaller, rol.Nivel))
        {
            return StatusCode(403, new
            {
                error = "Prohibido",
                mensaje = "Solo puedes crear usuarios con un rol de nivel inferior al tuyo."
            });
        }

        if (request.Oculto && !_rbac.TienePermiso(User, PermisosApp.PlatformUsuariosOcultosGestionar))
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "Solo SuperAdmin puede crear usuarios ocultos." });
        }

        if (rol.Codigo == nameof(RolPlataformaCodigo.SuperAdmin) &&
            await _masterDb.UsuariosPlataforma.AnyAsync(u =>
                u.Activo && !u.Oculto && u.RolPlataforma.Codigo == nameof(RolPlataformaCodigo.SuperAdmin)))
        {
            return BadRequest(new { error = "SuperAdminUnico", mensaje = "Ya hay un SuperAdmin activo visible." });
        }

        var usuario = new UsuarioPlataforma
        {
            NombreCompleto = request.NombreCompleto.Trim(),
            Email = email,
            PasswordHash = PlatformPasswordHasher.Hash(request.Password),
            RolPlataformaId = rol.Id,
            Activo = request.Activo ?? true,
            Oculto = request.Oculto
        };

        _masterDb.UsuariosPlataforma.Add(usuario);
        await _masterDb.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Usuario de plataforma creado.",
            UsuarioId = usuario.Id,
            Rol = rol.Codigo
        });
    }

    [HttpPut("{usuarioId:guid}")]
    [HasPermission(PermisosApp.PlatformUsuariosActivar)]
    public async Task<IActionResult> Actualizar(Guid usuarioId, [FromBody] ActualizarUsuarioPlataformaRequest request)
    {
        var usuario = await _masterDb.UsuariosPlataforma
            .Include(u => u.RolPlataforma)
            .FirstOrDefaultAsync(u => u.Id == usuarioId);

        if (usuario == null || (! _rbac.PuedeVerUsuariosOcultos(User) && usuario.Oculto))
        {
            return NotFound();
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (usuario.RolPlataforma.Nivel >= nivelCaller && nivelCaller < (int)RolPlataformaCodigo.SuperAdmin)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes modificar usuarios de tu nivel o superior." });
        }

        if (!string.IsNullOrWhiteSpace(request.NombreCompleto))
        {
            usuario.NombreCompleto = request.NombreCompleto.Trim();
        }

        if (request.Activo.HasValue)
        {
            if (usuario.RolPlataforma.Codigo == nameof(RolPlataformaCodigo.SuperAdmin) &&
                usuario.Activo && !request.Activo.Value)
            {
                var otrosSuper = await _rbac.ContarSuperAdminsActivosExceptoAsync(usuarioId);
                if (otrosSuper == 0)
                {
                    return BadRequest(new
                    {
                        error = "UltimoSuperAdmin",
                        mensaje = "No puedes desactivar al único SuperAdmin activo."
                    });
                }
            }

            usuario.Activo = request.Activo.Value;
        }

        if (request.Oculto.HasValue)
        {
            if (!_rbac.TienePermiso(User, PermisosApp.PlatformUsuariosOcultosGestionar))
            {
                return StatusCode(403, new { error = "Prohibido", mensaje = "Solo SuperAdmin gestiona usuarios ocultos." });
            }

            usuario.Oculto = request.Oculto.Value;
        }

        if (request.RolPlataformaId.HasValue && request.RolPlataformaId != usuario.RolPlataformaId)
        {
            if (!_rbac.TienePermiso(User, PermisosApp.PlatformUsuariosCrear))
            {
                return StatusCode(403, new { error = "Prohibido", mensaje = "No tienes permiso para cambiar el rol del usuario." });
            }

            var nuevoRol = await _rbac.ObtenerRolPorIdAsync(request.RolPlataformaId.Value);
            if (nuevoRol == null || !_rbac.PuedeAsignarRol(nivelCaller, nuevoRol.Nivel))
            {
                return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes asignar ese rol." });
            }

            usuario.RolPlataformaId = nuevoRol.Id;
        }

        if (!string.IsNullOrWhiteSpace(request.NuevaPassword))
        {
            usuario.PasswordHash = PlatformPasswordHasher.Hash(request.NuevaPassword);
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Usuario actualizado.", usuario.Id });
    }

    /// <summary>Desactivar (baja lógica). Gerente y superiores con permiso activar.</summary>
    [HttpPost("{usuarioId:guid}/desactivar")]
    [HasPermission(PermisosApp.PlatformUsuariosActivar)]
    public async Task<IActionResult> Desactivar(Guid usuarioId) =>
        await Actualizar(usuarioId, new ActualizarUsuarioPlataformaRequest { Activo = false });

    [HttpDelete("{usuarioId:guid}")]
    [HasPermission(PermisosApp.PlatformUsuariosEliminar)]
    public async Task<IActionResult> Eliminar(Guid usuarioId)
    {
        var usuario = await _masterDb.UsuariosPlataforma
            .Include(u => u.RolPlataforma)
            .FirstOrDefaultAsync(u => u.Id == usuarioId);

        if (usuario == null || (!_rbac.PuedeVerUsuariosOcultos(User) && usuario.Oculto))
        {
            return NotFound();
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (usuario.RolPlataforma.Nivel >= nivelCaller)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes eliminar usuarios de tu nivel o superior." });
        }

        if (usuario.RolPlataforma.Codigo == nameof(RolPlataformaCodigo.SuperAdmin) && usuario.Activo)
        {
            var otrosSuper = await _rbac.ContarSuperAdminsActivosExceptoAsync(usuarioId);
            if (otrosSuper == 0)
            {
                return BadRequest(new
                {
                    error = "UltimoSuperAdmin",
                    mensaje = "No puedes eliminar al único SuperAdmin activo."
                });
            }
        }

        _masterDb.UsuariosPlataforma.Remove(usuario);
        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Usuario eliminado permanentemente.", UsuarioId = usuario.Id });
    }
}

public class CrearUsuarioPlataformaRequest
{
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Guid RolPlataformaId { get; set; }
    public bool? Activo { get; set; }
    public bool Oculto { get; set; }
}

public class ActualizarUsuarioPlataformaRequest
{
    public string? NombreCompleto { get; set; }
    public string? NuevaPassword { get; set; }
    public bool? Activo { get; set; }
    public bool? Oculto { get; set; }
    public Guid? RolPlataformaId { get; set; }
}
