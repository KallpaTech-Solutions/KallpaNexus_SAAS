using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using KallpaNexus.Infrastructure.Tenancy;
using KallpaNexus.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Tenant;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantStaff)]
[ApiController]
[Route("api/tenant/usuarios")]
public class TenantUsuariosStaffController : ControllerBase
{
    private readonly ApplicationDbContext _appDb;
    private readonly TenantRbacService _rbac;
    private readonly TenantSuscripcionService _suscripcion;
    private readonly TenantStaffSucursalService _staffSucursales;

    public TenantUsuariosStaffController(
        ApplicationDbContext appDb,
        TenantRbacService rbac,
        TenantSuscripcionService suscripcion,
        TenantStaffSucursalService staffSucursales)
    {
        _appDb = appDb;
        _rbac = rbac;
        _suscripcion = suscripcion;
        _staffSucursales = staffSucursales;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.SportUsuariosVer)]
    public async Task<IActionResult> Listar()
    {
        var nivel = _rbac.ObtenerNivelDesdeClaims(User);
        var filas = await _appDb.UsuariosStaff
            .Include(u => u.RolTenant)
            .Where(u => u.RolTenant.Nivel < nivel)
            .OrderBy(u => u.NombreCompleto)
            .Select(u => new
            {
                u.Id,
                u.Dni,
                u.NombreCompleto,
                u.Email,
                Rol = u.RolTenant.Codigo,
                u.RolTenant.Nivel,
                u.Activo,
                u.DebeCambiarPassword
            })
            .ToListAsync();

        var ids = filas.Select(u => u.Id).ToList();
        var links = await _appDb.UsuariosStaffSucursales
            .AsNoTracking()
            .Where(l => ids.Contains(l.UsuarioStaffId))
            .Join(
                _appDb.Sucursales.AsNoTracking(),
                l => l.SucursalId,
                s => s.Id,
                (l, s) => new { l.UsuarioStaffId, s.Id, s.Nombre })
            .ToListAsync();

        var porUsuario = links
            .GroupBy(x => x.UsuarioStaffId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => new StaffSucursalAccesoDto(x.Id, x.Nombre)).ToList());

        var usuarios = filas.Select(u => new
        {
            u.Id,
            u.Dni,
            u.NombreCompleto,
            u.Email,
            u.Rol,
            u.Nivel,
            u.Activo,
            u.DebeCambiarPassword,
            accesoTodasSucursales = u.Rol == nameof(RolTenantCodigo.Gerente),
            sucursales = u.Rol == nameof(RolTenantCodigo.Gerente)
                ? (IReadOnlyList<StaffSucursalAccesoDto>)Array.Empty<StaffSucursalAccesoDto>()
                : porUsuario.GetValueOrDefault(u.Id, new List<StaffSucursalAccesoDto>())
        });

        return Ok(usuarios);
    }

    [HttpPost]
    [HasTenantPermission(PermisosApp.SportUsuariosCrear)]
    public async Task<IActionResult> Crear([FromBody] CrearStaffRequest request)
    {
        var dni = StaffCredencialesHelper.NormalizarDni(request.Dni);
        if (!StaffCredencialesHelper.EsDniValidoParaStaff(dni))
        {
            return BadRequest(new { error = "DniInvalido", mensaje = "El DNI debe tener 8 dígitos." });
        }

        if (await _appDb.UsuariosStaff.AnyAsync(u => u.Dni == dni))
        {
            return BadRequest(new { error = "DniDuplicado", mensaje = "Ya existe un usuario con ese DNI en este negocio." });
        }

        var rol = await _rbac.ObtenerRolPorIdAsync(request.RolTenantId);
        if (rol == null)
        {
            return BadRequest(new { error = "RolInvalido", mensaje = "Rol no encontrado." });
        }

        var esGerente = rol.Codigo == nameof(RolTenantCodigo.Gerente);
        if (esGerente)
        {
            var yaHayGerente = await _appDb.UsuariosStaff
                .Include(u => u.RolTenant)
                .AnyAsync(u => u.Activo && u.RolTenant.Codigo == nameof(RolTenantCodigo.Gerente));
            if (yaHayGerente)
            {
                return BadRequest(new
                {
                    error = "GerenteDuplicado",
                    mensaje = "Este negocio ya tiene un gerente activo. Desactiva el anterior o crea un cajero/administrador de sucursal."
                });
            }
        }

        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        if (esGerente && string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { error = "EmailRequerido", mensaje = "El gerente debe tener correo electrónico." });
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (!_rbac.PuedeAsignarRol(nivelCaller, rol.Nivel))
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "Solo puedes crear usuarios con rol de nivel inferior." });
        }

        var limiteStaff = await _suscripcion.ValidarPuedeAgregarStaffAsync();
        if (!limiteStaff.Ok)
        {
            return BadRequest(new { error = limiteStaff.Codigo, mensaje = limiteStaff.Mensaje });
        }

        var usuario = new UsuarioStaff
        {
            Dni = dni,
            NombreCompleto = request.NombreCompleto.Trim(),
            Email = email,
            PasswordHash = PlatformPasswordHasher.Hash(dni),
            RolTenantId = rol.Id,
            Activo = true,
            DebeCambiarPassword = true
        };

        var sucursalIds = request.SucursalIds?.Where(id => id != Guid.Empty).Distinct().ToList() ?? [];
        if (!esGerente && sucursalIds.Count == 0)
        {
            return BadRequest(new
            {
                error = "SucursalRequerida",
                mensaje = "Asigna al menos una sucursal a este usuario."
            });
        }

        var errorSucursalesCrear = ValidarSucursalesStaff(rol, sucursalIds);
        if (errorSucursalesCrear != null)
        {
            return errorSucursalesCrear;
        }

        if (!esGerente && sucursalIds.Count > 0)
        {
            var validas = await _appDb.Sucursales.CountAsync(s => sucursalIds.Contains(s.Id) && s.Activa);
            if (validas != sucursalIds.Count)
            {
                return BadRequest(new { error = "SucursalInvalida", mensaje = "Una o más sucursales no existen o están inactivas." });
            }
        }

        _appDb.UsuariosStaff.Add(usuario);
        await _appDb.SaveChangesAsync();

        await _staffSucursales.AsignarSucursalesAsync(usuario.Id, sucursalIds, esGerente);

        return Ok(new
        {
            mensaje = "Usuario creado. La contraseña inicial es su DNI; deberá cambiarla en el primer ingreso.",
            UsuarioId = usuario.Id
        });
    }

    [HttpPut("{usuarioId:guid}")]
    [Authorize(AuthenticationSchemes = TenantStaffJwtService.SchemeName)]
    public async Task<IActionResult> Actualizar(Guid usuarioId, [FromBody] ActualizarStaffRequest request)
    {
        if (!User.HasClaim(AuthClaims.ActorType, AuthClaims.ActorTenantStaff))
        {
            return Unauthorized();
        }

        if (!_rbac.TokenCoincideConTenantActual(User))
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "El token no corresponde al tenant de esta URL." });
        }

        if (!_rbac.TienePermiso(User, PermisosApp.SportUsuariosActivar)
            && !_rbac.TienePermiso(User, PermisosApp.SportUsuariosCrear))
        {
            return StatusCode(403, new
            {
                error = "Prohibido",
                mensaje = "No tienes permiso para editar usuarios (activar o crear usuarios)."
            });
        }

        var usuario = await _appDb.UsuariosStaff.Include(u => u.RolTenant).FirstOrDefaultAsync(u => u.Id == usuarioId);
        if (usuario == null)
        {
            return NotFound();
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (usuario.RolTenant.Nivel >= nivelCaller)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes modificar usuarios de tu nivel o superior." });
        }

        if (!string.IsNullOrWhiteSpace(request.NombreCompleto))
        {
            usuario.NombreCompleto = request.NombreCompleto.Trim();
        }

        if (request.Activo.HasValue)
        {
            usuario.Activo = request.Activo.Value;
        }

        if (request.RolTenantId.HasValue && request.RolTenantId.Value != usuario.RolTenantId)
        {
            var rol = await _rbac.ObtenerRolPorIdAsync(request.RolTenantId.Value);
            if (rol == null)
            {
                return BadRequest(new { error = "RolInvalido", mensaje = "Rol no encontrado." });
            }

            if (!_rbac.PuedeAsignarRol(nivelCaller, rol.Nivel))
            {
                return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes asignar ese rol." });
            }

            usuario.RolTenantId = rol.Id;
            usuario.RolTenant = rol;
        }

        var esGerente = usuario.RolTenant.Codigo == nameof(RolTenantCodigo.Gerente);
        if (request.Email != null)
        {
            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
            if (esGerente && string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { error = "EmailRequerido", mensaje = "El gerente debe tener correo electrónico." });
            }

            usuario.Email = email;
        }

        if (request.SucursalIds != null)
        {
            var ids = request.SucursalIds.Where(id => id != Guid.Empty).Distinct().ToList();
            if (!esGerente && ids.Count == 0)
            {
                return BadRequest(new
                {
                    error = "SucursalRequerida",
                    mensaje = "Asigna al menos una sucursal a este usuario."
                });
            }

            var errorSucursalesEdit = ValidarSucursalesStaff(usuario.RolTenant, ids);
            if (errorSucursalesEdit != null)
            {
                return errorSucursalesEdit;
            }

            if (!esGerente && ids.Count > 0)
            {
                var validas = await _appDb.Sucursales.CountAsync(s => ids.Contains(s.Id) && s.Activa);
                if (validas != ids.Count)
                {
                    return BadRequest(new { error = "SucursalInvalida", mensaje = "Una o más sucursales no existen o están inactivas." });
                }
            }

            await _staffSucursales.AsignarSucursalesAsync(usuario.Id, ids, esGerente);
        }

        await _appDb.SaveChangesAsync();
        return Ok(new { mensaje = "Usuario actualizado." });
    }

    private static IActionResult? ValidarSucursalesStaff(RolTenant rol, List<Guid> sucursalIds)
    {
        if (rol.Codigo == nameof(RolTenantCodigo.Gerente))
        {
            return null;
        }

        if (rol.Codigo == nameof(RolTenantCodigo.Cajero) && sucursalIds.Count > 1)
        {
            return new BadRequestObjectResult(new
            {
                error = "SucursalUnica",
                mensaje = "El rol Cajero solo puede tener una sucursal asignada."
            });
        }

        return null;
    }

    [HttpPost("{usuarioId:guid}/restablecer-password")]
    [HasTenantPermission(PermisosApp.SportUsuariosActivar)]
    public async Task<IActionResult> RestablecerPassword(Guid usuarioId)
    {
        var usuario = await _appDb.UsuariosStaff.Include(u => u.RolTenant).FirstOrDefaultAsync(u => u.Id == usuarioId);
        if (usuario == null)
        {
            return NotFound();
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (usuario.RolTenant.Nivel >= nivelCaller)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes restablecer usuarios de tu nivel o superior." });
        }

        usuario.PasswordHash = PlatformPasswordHasher.Hash(usuario.Dni);
        usuario.DebeCambiarPassword = true;
        await _appDb.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Contraseña restablecida al DNI. El usuario deberá cambiarla al ingresar."
        });
    }

    [HttpDelete("{usuarioId:guid}")]
    [HasTenantPermission(PermisosApp.SportUsuariosEliminar)]
    public async Task<IActionResult> Eliminar(Guid usuarioId)
    {
        var usuario = await _appDb.UsuariosStaff.Include(u => u.RolTenant).FirstOrDefaultAsync(u => u.Id == usuarioId);
        if (usuario == null)
        {
            return NotFound();
        }

        var nivelCaller = _rbac.ObtenerNivelDesdeClaims(User);
        if (usuario.RolTenant.Nivel >= nivelCaller)
        {
            return StatusCode(403, new { error = "Prohibido", mensaje = "No puedes eliminar usuarios de tu nivel o superior." });
        }

        _appDb.UsuariosStaff.Remove(usuario);
        await _appDb.SaveChangesAsync();
        return Ok(new { mensaje = "Usuario eliminado." });
    }
}

public class CrearStaffRequest
{
    public string Dni { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Email { get; set; }
    public Guid RolTenantId { get; set; }
    public List<Guid>? SucursalIds { get; set; }
}

public class ActualizarStaffRequest
{
    public string? NombreCompleto { get; set; }
    public bool? Activo { get; set; }
    public string? Email { get; set; }
    public Guid? RolTenantId { get; set; }
    public List<Guid>? SucursalIds { get; set; }
}
