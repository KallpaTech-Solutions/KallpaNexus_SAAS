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
[Route("api/platform")]
public class PlatformRolesController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly PlatformRbacService _rbac;

    public PlatformRolesController(MasterDbContext masterDb, PlatformRbacService rbac)
    {
        _masterDb = masterDb;
        _rbac = rbac;
    }

    [HttpGet("permisos")]
    [HasPermission(PermisosApp.PlatformPermisosVer)]
    public async Task<IActionResult> ListarPermisosCatalogo()
    {
        var permisos = await _masterDb.Permisos
            .Where(p => PermisosApp.TodosPlataforma.Contains(p.Codigo))
            .OrderBy(p => p.Modulo)
            .ThenBy(p => p.Codigo)
            .Select(p => new
            {
                p.Id,
                p.Codigo,
                p.Modulo,
                p.Descripcion
            })
            .ToListAsync();

        return Ok(permisos);
    }

    [HttpGet("roles")]
    [HasPermission(PermisosApp.PlatformRolesVer)]
    public async Task<IActionResult> ListarRoles()
    {
        var nivel = _rbac.ObtenerNivelDesdeClaims(User);
        var roles = await _masterDb.RolesPlataforma
            .Where(r => r.Nivel < nivel || nivel >= (int)RolPlataformaCodigo.SuperAdmin)
            .OrderByDescending(r => r.Nivel)
            .Select(r => new
            {
                r.Id,
                r.Codigo,
                r.Nombre,
                r.Nivel,
                r.EsSistema,
                Permisos = r.Permisos.Select(rp => rp.Permiso.Codigo).OrderBy(c => c).ToList()
            })
            .ToListAsync();

        return Ok(roles);
    }

    [HttpGet("roles/{rolId:guid}")]
    [HasPermission(PermisosApp.PlatformRolesVer)]
    public async Task<IActionResult> ObtenerRol(Guid rolId)
    {
        var nivel = _rbac.ObtenerNivelDesdeClaims(User);
        var rol = await _masterDb.RolesPlataforma
            .Where(r => r.Id == rolId && (r.Nivel < nivel || nivel >= (int)RolPlataformaCodigo.SuperAdmin))
            .Select(r => new
            {
                r.Id,
                r.Codigo,
                r.Nombre,
                r.Nivel,
                r.EsSistema,
                PermisoIds = r.Permisos.Select(rp => rp.PermisoId).ToList(),
                Permisos = r.Permisos.Select(rp => rp.Permiso.Codigo).OrderBy(c => c).ToList()
            })
            .FirstOrDefaultAsync();

        if (rol == null)
        {
            return NotFound();
        }

        return Ok(rol);
    }

    [HttpPost("roles")]
    [HasPermission(PermisosApp.PlatformRolesGestionar)]
    public async Task<IActionResult> CrearRol([FromBody] CrearRolPlataformaRequest request)
    {
        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (request.Nivel >= nivelCaller)
        {
            return BadRequest(new
            {
                error = "NivelRolInvalido",
                mensaje = "Solo puedes crear roles con nivel menor al tuyo."
            });
        }

        var codigo = request.Codigo.Trim();
        if (await _masterDb.RolesPlataforma.AnyAsync(r => r.Codigo == codigo))
        {
            return BadRequest(new { error = "CodigoDuplicado", mensaje = "Ya existe un rol con ese código." });
        }

        var rol = new RolPlataforma
        {
            Codigo = codigo,
            Nombre = request.Nombre.Trim(),
            Nivel = request.Nivel,
            EsSistema = false
        };

        _masterDb.RolesPlataforma.Add(rol);
        await _masterDb.SaveChangesAsync();

        if (request.PermisoIds?.Count > 0)
        {
            var error = await ValidarYAsignarPermisosAsync(rol.Id, request.PermisoIds);
            if (error != null)
            {
                return error;
            }
        }

        return Ok(new { Mensaje = "Rol creado.", RolId = rol.Id });
    }

    [HttpPut("roles/{rolId:guid}")]
    [HasPermission(PermisosApp.PlatformRolesGestionar)]
    public async Task<IActionResult> ActualizarRol(Guid rolId, [FromBody] ActualizarRolPlataformaRequest request)
    {
        var rol = await _masterDb.RolesPlataforma.FirstOrDefaultAsync(r => r.Id == rolId);
        if (rol == null)
        {
            return NotFound();
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (rol.Nivel >= nivelCaller && nivelCaller < (int)RolPlataformaCodigo.SuperAdmin)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes modificar un rol de tu mismo nivel o superior." });
        }

        if (rol.EsSistema && request.Nivel.HasValue && request.Nivel != rol.Nivel)
        {
            return BadRequest(new { error = "RolSistema", mensaje = "No se puede cambiar el nivel de un rol de sistema." });
        }

        if (!string.IsNullOrWhiteSpace(request.Nombre))
        {
            rol.Nombre = request.Nombre.Trim();
        }

        if (request.Nivel.HasValue)
        {
            if (request.Nivel >= nivelCaller)
            {
                return BadRequest(new { error = "NivelRolInvalido", mensaje = "El nivel del rol debe ser menor al tuyo." });
            }

            rol.Nivel = request.Nivel.Value;
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Rol actualizado.", rol.Id });
    }

    [HttpPut("roles/{rolId:guid}/permisos")]
    [HasPermission(PermisosApp.PlatformRolesGestionar)]
    public async Task<IActionResult> ActualizarPermisosRol(Guid rolId, [FromBody] ActualizarPermisosRolRequest request)
    {
        var rol = await _masterDb.RolesPlataforma.FirstOrDefaultAsync(r => r.Id == rolId);
        if (rol == null)
        {
            return NotFound();
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (rol.Nivel >= nivelCaller && nivelCaller < (int)RolPlataformaCodigo.SuperAdmin)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes editar permisos de un rol de tu nivel o superior." });
        }

        if (rol.Codigo == nameof(RolPlataformaCodigo.SuperAdmin) &&
            !_rbac.TienePermiso(User, PermisosApp.PlatformUsuariosOcultosGestionar))
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "Solo SuperAdmin puede alterar permisos del rol SuperAdmin." });
        }

        var pivotes = await _masterDb.RolesPlataformaPermisos.Where(rp => rp.RolPlataformaId == rolId).ToListAsync();
        _masterDb.RolesPlataformaPermisos.RemoveRange(pivotes);

        var error = await ValidarYAsignarPermisosAsync(rolId, request.PermisoIds);
        if (error != null)
        {
            return error;
        }

        return Ok(new { Mensaje = "Permisos del rol actualizados.", RolId = rolId });
    }

    [HttpDelete("roles/{rolId:guid}")]
    [HasPermission(PermisosApp.PlatformRolesGestionar)]
    public async Task<IActionResult> EliminarRol(Guid rolId)
    {
        var rol = await _masterDb.RolesPlataforma.FirstOrDefaultAsync(r => r.Id == rolId);
        if (rol == null)
        {
            return NotFound();
        }

        if (rol.EsSistema)
        {
            return BadRequest(new { error = "RolSistema", mensaje = "No se pueden eliminar roles de sistema." });
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (rol.Nivel >= nivelCaller)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes eliminar un rol de tu nivel o superior." });
        }

        if (await _masterDb.UsuariosPlataforma.AnyAsync(u => u.RolPlataformaId == rolId))
        {
            return BadRequest(new { error = "RolEnUso", mensaje = "Hay usuarios con este rol. Reasígnalos antes de eliminar." });
        }

        _masterDb.RolesPlataforma.Remove(rol);
        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Rol eliminado.", RolId = rolId });
    }

    private async Task<IActionResult?> ValidarYAsignarPermisosAsync(Guid rolId, List<Guid> permisoIds)
    {
        var permisos = await _masterDb.Permisos
            .Where(p => permisoIds.Contains(p.Id) && PermisosApp.TodosPlataforma.Contains(p.Codigo))
            .ToListAsync();

        if (permisos.Count != permisoIds.Distinct().Count())
        {
            return BadRequest(new { error = "PermisoInvalido", mensaje = "Uno o más permisos no existen en el catálogo de plataforma." });
        }

        var esSuper = _rbac.TienePermiso(User, PermisosApp.PlatformUsuariosOcultosGestionar);
        if (!esSuper)
        {
            var permisosCaller = User.FindAll(AuthClaims.Permiso).Select(c => c.Value).ToHashSet();
            var noAutorizados = permisos.Where(p => !permisosCaller.Contains(p.Codigo)).Select(p => p.Codigo).ToList();
            if (noAutorizados.Count > 0)
            {
                return StatusCode(403, new
                {
                    error = "Prohibido",
                    mensaje = "No puedes asignar permisos que tú mismo no tienes.",
                    permisos = noAutorizados
                });
            }
        }

        foreach (var permiso in permisos)
        {
            _masterDb.RolesPlataformaPermisos.Add(new RolPlataformaPermiso
            {
                RolPlataformaId = rolId,
                PermisoId = permiso.Id
            });
        }

        await _masterDb.SaveChangesAsync();
        return null;
    }
}

public class CrearRolPlataformaRequest
{
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public int Nivel { get; set; }
    public List<Guid>? PermisoIds { get; set; }
}

public class ActualizarRolPlataformaRequest
{
    public string? Nombre { get; set; }
    public int? Nivel { get; set; }
}

public class ActualizarPermisosRolRequest
{
    public List<Guid> PermisoIds { get; set; } = [];
}
