using System.Text.RegularExpressions;
using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Tenant;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantStaff)]
[ApiController]
[Route("api/tenant")]
public class TenantRolesController : ControllerBase
{
    private readonly ApplicationDbContext _appDb;
    private readonly TenantRbacService _rbac;

    public TenantRolesController(ApplicationDbContext appDb, TenantRbacService rbac)
    {
        _appDb = appDb;
        _rbac = rbac;
    }

    [HttpGet("permisos-catalogo")]
    [HasTenantPermission(PermisosApp.SportRolesVer)]
    public IActionResult CatalogoPermisos() =>
        Ok(PermisosApp.TodosSport.Select(c => new { Codigo = c }));

    /// <summary>Roles asignables a usuarios (nivel inferior al tuyo). Por tenant/negocio.</summary>
    [HttpGet("roles")]
    [HasTenantPermission(PermisosApp.SportRolesVer)]
    public async Task<IActionResult> ListarRoles()
    {
        if (Guid.TryParse(User.FindFirst(AuthClaims.TenantId)?.Value, out var tenantId))
        {
            await TenantRbacSeeder.SeedRolesInicialesAsync(_appDb, tenantId);
        }

        var nivel = _rbac.ObtenerNivelDesdeClaims(User);
        var roles = await _appDb.RolesTenant
            .Where(r => r.Nivel < nivel)
            .OrderByDescending(r => r.Nivel)
            .ThenBy(r => r.Nombre)
            .Select(r => new
            {
                r.Id,
                r.Codigo,
                r.Nombre,
                r.Nivel,
                r.EsSistema,
                Permisos = r.Permisos.Select(p => p.PermisoCodigo).OrderBy(c => c).ToList()
            })
            .ToListAsync();

        return Ok(roles);
    }

    [HttpPost("roles")]
    [HasTenantPermission(PermisosApp.SportRolesGestionar)]
    public async Task<IActionResult> CrearRol([FromBody] CrearRolTenantRequest request)
    {
        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        var nivel = request.Nivel ?? (int)RolTenantCodigo.Cajero;
        if (nivel >= nivelCaller || nivel < 1)
        {
            return BadRequest(new
            {
                error = "NivelInvalido",
                mensaje = "El nivel del rol debe ser menor que el tuyo y mayor que cero."
            });
        }

        var nombre = request.Nombre.Trim();
        if (string.IsNullOrWhiteSpace(nombre))
        {
            return BadRequest(new { error = "NombreRequerido", mensaje = "Indica el nombre del rol." });
        }

        var codigo = NormalizarCodigoRol(request.Codigo, nombre);
        if (EsCodigoRolSistema(codigo))
        {
            return BadRequest(new
            {
                error = "CodigoReservado",
                mensaje =
                    "«Gerente» y «Cajero» son roles del sistema que ya trae tu negocio. " +
                    "En la tabla de abajo usa «Editar permisos» en Cajero, o crea un rol con otro nombre (ej. Recepción)."
            });
        }

        if (await _appDb.RolesTenant.AnyAsync(r =>
                r.Codigo.ToLower() == codigo.ToLower()))
        {
            return BadRequest(new
            {
                error = "CodigoDuplicado",
                mensaje =
                    "Ya existe un rol con ese nombre/código en tu negocio. Si buscas Cajero, edítalo en la lista; no lo crees de nuevo."
            });
        }

        var permisosCaller = User.FindAll(AuthClaims.Permiso).Select(c => c.Value).ToHashSet();
        var permisos = (request.PermisoCodigos ?? []).Distinct().ToList();
        var invalidos = permisos
            .Where(c => !PermisosApp.TodosSport.Contains(c) || !permisosCaller.Contains(c))
            .ToList();
        if (invalidos.Count > 0)
        {
            return StatusCode(403, new
            {
                error = "Prohibido",
                mensaje = "Permisos inválidos o que no posees.",
                invalidos
            });
        }

        if (permisos.Count == 0)
        {
            return BadRequest(new { error = "SinPermisos", mensaje = "Marca al menos un permiso para el rol." });
        }

        var rol = new RolTenant
        {
            Codigo = codigo,
            Nombre = nombre,
            Nivel = nivel,
            EsSistema = false
        };
        _appDb.RolesTenant.Add(rol);
        await _appDb.SaveChangesAsync();

        foreach (var codigoPermiso in permisos)
        {
            _appDb.RolesTenantPermisos.Add(new RolTenantPermiso
            {
                RolTenantId = rol.Id,
                PermisoCodigo = codigoPermiso
            });
        }

        await _appDb.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Rol creado.",
            rol.Id,
            rol.Codigo,
            rol.Nombre,
            rol.Nivel
        });
    }

    [HttpPut("roles/{rolId:guid}/permisos")]
    [HasTenantPermission(PermisosApp.SportRolesGestionar)]
    public async Task<IActionResult> ActualizarPermisos(Guid rolId, [FromBody] ActualizarPermisosTenantRequest request)
    {
        var rol = await _appDb.RolesTenant.FirstOrDefaultAsync(r => r.Id == rolId);
        if (rol == null)
        {
            return NotFound();
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (rol.Nivel >= nivelCaller)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes editar un rol de tu nivel o superior." });
        }

        var permisosCaller = User.FindAll(AuthClaims.Permiso).Select(c => c.Value).ToHashSet();
        var invalidos = request.PermisoCodigos
            .Where(c => !PermisosApp.TodosSport.Contains(c) || !permisosCaller.Contains(c))
            .ToList();
        if (invalidos.Count > 0)
        {
            return StatusCode(403, new
            {
                error = "Prohibido",
                mensaje = "Permisos inválidos o que no posees.",
                invalidos
            });
        }

        if (request.PermisoCodigos.Count == 0)
        {
            return BadRequest(new { error = "SinPermisos", mensaje = "El rol debe tener al menos un permiso." });
        }

        var pivotes = await _appDb.RolesTenantPermisos.Where(p => p.RolTenantId == rolId).ToListAsync();
        _appDb.RolesTenantPermisos.RemoveRange(pivotes);
        foreach (var codigo in request.PermisoCodigos.Distinct())
        {
            _appDb.RolesTenantPermisos.Add(new RolTenantPermiso
            {
                RolTenantId = rolId,
                PermisoCodigo = codigo
            });
        }

        await _appDb.SaveChangesAsync();
        return Ok(new { mensaje = "Permisos del rol actualizados.", RolId = rolId });
    }

    [HttpDelete("roles/{rolId:guid}")]
    [HasTenantPermission(PermisosApp.SportRolesGestionar)]
    public async Task<IActionResult> EliminarRol(Guid rolId)
    {
        var rol = await _appDb.RolesTenant
            .Include(r => r.Usuarios)
            .FirstOrDefaultAsync(r => r.Id == rolId);

        if (rol == null)
        {
            return NotFound();
        }

        if (rol.EsSistema)
        {
            return BadRequest(new { error = "RolSistema", mensaje = "No se pueden eliminar roles del sistema." });
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (rol.Nivel >= nivelCaller)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes eliminar un rol de tu nivel o superior." });
        }

        if (rol.Usuarios.Any())
        {
            return BadRequest(new
            {
                error = "RolEnUso",
                mensaje = "Hay usuarios con este rol. Reasígnalos o desactívalos antes de eliminar el rol."
            });
        }

        var pivotes = await _appDb.RolesTenantPermisos.Where(p => p.RolTenantId == rolId).ToListAsync();
        _appDb.RolesTenantPermisos.RemoveRange(pivotes);
        _appDb.RolesTenant.Remove(rol);
        await _appDb.SaveChangesAsync();

        return Ok(new { mensaje = "Rol eliminado." });
    }

    private static bool EsCodigoRolSistema(string codigo) =>
        string.Equals(codigo, nameof(RolTenantCodigo.Gerente), StringComparison.OrdinalIgnoreCase) ||
        string.Equals(codigo, nameof(RolTenantCodigo.Cajero), StringComparison.OrdinalIgnoreCase);

    private static string NormalizarCodigoRol(string? codigo, string nombre)
    {
        var raw = string.IsNullOrWhiteSpace(codigo) ? nombre : codigo.Trim();
        var limpio = Regex.Replace(raw, @"[^a-zA-Z0-9]+", "");
        if (limpio.Length < 2)
        {
            limpio = "Rol" + Guid.NewGuid().ToString("N")[..6];
        }

        return limpio.Length > 50 ? limpio[..50] : limpio;
    }
}

public class CrearRolTenantRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string? Codigo { get; set; }
    public int? Nivel { get; set; }
    public List<string>? PermisoCodigos { get; set; }
}

public class ActualizarPermisosTenantRequest
{
    public List<string> PermisoCodigos { get; set; } = [];
}
