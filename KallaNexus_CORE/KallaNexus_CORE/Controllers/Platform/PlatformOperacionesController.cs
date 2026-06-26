using System.Text.RegularExpressions;
using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using TenantNegocio = KallpaNexus.Domain.Tenancy.Tenant;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Platform;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Platform)]
[ApiController]
[Route("api/platform/operaciones")]
public class PlatformOperacionesController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly ApplicationDbContext _appDb;
    private readonly TenantProvider _tenantProvider;
    private readonly TenantStaffSucursalService _staffSucursales;
    private readonly TenantSuscripcionService _suscripcion;

    public PlatformOperacionesController(
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ITenantProvider tenantProvider,
        TenantStaffSucursalService staffSucursales,
        TenantSuscripcionService suscripcion)
    {
        _masterDb = masterDb;
        _appDb = appDb;
        _tenantProvider = (TenantProvider)tenantProvider;
        _staffSucursales = staffSucursales;
        _suscripcion = suscripcion;
    }

    [HttpGet("permisos-sport-catalogo")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public IActionResult CatalogoPermisosSport() =>
        Ok(PermisosApp.TodosSport.Select(c => new { Codigo = c }));

    /// <summary>Staff de todos los negocios (tenants), con empresa pagadora y sucursales asignadas.</summary>
    [HttpGet("staff-negocios")]
    [HasPermission(PermisosApp.PlatformTenantsVer)]
    public async Task<IActionResult> ListarStaffNegocios(
        [FromQuery] string? q,
        [FromQuery] Guid? tenantId,
        [FromQuery] Guid? clienteEmpresaId,
        [FromQuery] bool? soloActivos = true)
    {
        var tenants = await _masterDb.Tenants
            .Include(t => t.ClienteEmpresa)
            .AsNoTracking()
            .ToListAsync();

        var tenantMap = tenants.ToDictionary(t => t.Id);

        if (tenantId.HasValue)
        {
            tenantMap = tenantMap
                .Where(kv => kv.Key == tenantId.Value)
                .ToDictionary(kv => kv.Key, kv => kv.Value);
        }

        if (clienteEmpresaId.HasValue)
        {
            tenantMap = tenantMap
                .Where(kv => kv.Value.ClienteEmpresaId == clienteEmpresaId.Value)
                .ToDictionary(kv => kv.Key, kv => kv.Value);
        }

        var tenantIds = tenantMap.Keys.ToList();
        if (tenantIds.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var staffQuery = _appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .Where(u => tenantIds.Contains(u.TenantId));

        if (soloActivos == true)
        {
            staffQuery = staffQuery.Where(u => u.Activo);
        }

        var ql = q?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(ql))
        {
            staffQuery = staffQuery.Where(u =>
                u.Dni.Contains(ql) ||
                u.NombreCompleto.ToLower().Contains(ql) ||
                (u.Email != null && u.Email.ToLower().Contains(ql)));
        }

        var staffList = await staffQuery
            .AsNoTracking()
            .OrderBy(u => u.NombreCompleto)
            .Select(u => new
            {
                u.Id,
                u.TenantId,
                u.Dni,
                u.NombreCompleto,
                u.Email,
                u.Activo,
                u.DebeCambiarPassword,
                u.RolTenantId
            })
            .ToListAsync();

        var rolIds = staffList.Select(s => s.RolTenantId).Distinct().ToList();
        var rolesMap = await _appDb.RolesTenant
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(r => rolIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r);

        var staffIds = staffList.Select(s => s.Id).ToList();
        var sucursalesAsignadasPorStaff = await _appDb.UsuariosStaffSucursales
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(l => staffIds.Contains(l.UsuarioStaffId))
            .GroupBy(l => l.UsuarioStaffId)
            .Select(g => new { UsuarioStaffId = g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.UsuarioStaffId, x => x.Total);

        var staffRows = staffList.Select(s =>
        {
            rolesMap.TryGetValue(s.RolTenantId, out var rol);
            sucursalesAsignadasPorStaff.TryGetValue(s.Id, out var sucAsign);
            return new
            {
                s.Id,
                s.TenantId,
                s.Dni,
                s.NombreCompleto,
                s.Email,
                s.Activo,
                s.DebeCambiarPassword,
                Rol = rol?.Nombre ?? "—",
                RolCodigo = rol?.Codigo ?? "—",
                SucursalesAsignadas = sucAsign
            };
        }).ToList();

        var sucursalesPorTenant = await _appDb.Sucursales
            .IgnoreQueryFilters()
            .Where(s => tenantIds.Contains(s.TenantId))
            .GroupBy(s => s.TenantId)
            .Select(g => new { TenantId = g.Key, Total = g.Count(), Activas = g.Count(s => s.Activa) })
            .ToListAsync();

        var sucMap = sucursalesPorTenant.ToDictionary(x => x.TenantId);

        var result = staffRows.Select(s =>
        {
            tenantMap.TryGetValue(s.TenantId, out var tenant);
            sucMap.TryGetValue(s.TenantId, out var suc);
            return new
            {
                s.Id,
                s.TenantId,
                Subdomain = tenant?.Subdomain ?? "—",
                Negocio = tenant?.NombreComercialNegocio ?? "—",
                ClienteEmpresaId = tenant?.ClienteEmpresaId,
                EmpresaPagadora = tenant?.ClienteEmpresa?.NombreComercial ?? "—",
                EmpresaDocumento = tenant?.ClienteEmpresa?.DocumentoFiscal,
                EmpresaEmail = tenant?.ClienteEmpresa?.EmailFacturacion,
                s.Dni,
                s.NombreCompleto,
                s.Email,
                s.Activo,
                s.DebeCambiarPassword,
                s.Rol,
                s.RolCodigo,
                s.SucursalesAsignadas,
                TotalSucursalesTenant = suc?.Total ?? 0,
                SucursalesActivasTenant = suc?.Activas ?? 0
            };
        });

        return Ok(result);
    }

    [HttpPost("staff-negocios")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> CrearStaffNegocio([FromBody] PlatformCrearStaffNegocioRequest request)
    {
        var tenant = await BindTenantAsync(request.TenantId);
        if (tenant == null)
        {
            return NotFound(new { error = "TenantNoEncontrado", mensaje = "Negocio (tenant) no encontrado." });
        }

        var dni = StaffCredencialesHelper.NormalizarDni(request.Dni);
        if (!StaffCredencialesHelper.EsDniValidoParaStaff(dni))
        {
            return BadRequest(new { error = "DniInvalido", mensaje = "El DNI debe tener 8 dígitos." });
        }

        if (await _appDb.UsuariosStaff.IgnoreQueryFilters()
                .AnyAsync(u => u.TenantId == tenant.Id && u.Dni == dni))
        {
            return BadRequest(new { error = "DniDuplicado", mensaje = "Ya existe un usuario con ese DNI en este negocio." });
        }

        var rol = await _appDb.RolesTenant
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == request.RolTenantId && r.TenantId == tenant.Id);

        if (rol == null)
        {
            return BadRequest(new { error = "RolInvalido", mensaje = "Rol no encontrado en este negocio." });
        }

        var esGerente = rol.Codigo == nameof(RolTenantCodigo.Gerente);
        if (esGerente)
        {
            var yaHayGerente = await _appDb.UsuariosStaff
                .IgnoreQueryFilters()
                .Include(u => u.RolTenant)
                .AnyAsync(u => u.TenantId == tenant.Id && u.Activo &&
                               u.RolTenant.Codigo == nameof(RolTenantCodigo.Gerente));
            if (yaHayGerente)
            {
                return BadRequest(new
                {
                    error = "GerenteDuplicado",
                    mensaje = "Este negocio ya tiene un gerente activo."
                });
            }
        }

        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        if (esGerente && string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { error = "EmailRequerido", mensaje = "El gerente debe tener correo electrónico." });
        }

        var limiteStaff = await _suscripcion.ValidarPuedeAgregarStaffAsync();
        if (!limiteStaff.Ok)
        {
            return BadRequest(new { error = limiteStaff.Codigo, mensaje = limiteStaff.Mensaje });
        }

        var sucursalIds = request.SucursalIds?.Where(id => id != Guid.Empty).Distinct().ToList() ?? [];
        if (!esGerente && sucursalIds.Count == 0)
        {
            return BadRequest(new
            {
                error = "SucursalRequerida",
                mensaje = "Asigna al menos una sucursal (excepto rol Gerente)."
            });
        }

        if (!esGerente && sucursalIds.Count > 0)
        {
            var validas = await _appDb.Sucursales
                .IgnoreQueryFilters()
                .CountAsync(s => s.TenantId == tenant.Id && sucursalIds.Contains(s.Id) && s.Activa);
            if (validas != sucursalIds.Count)
            {
                return BadRequest(new { error = "SucursalInvalida", mensaje = "Sucursal inexistente o inactiva." });
            }
        }

        var usuario = new UsuarioStaff
        {
            TenantId = tenant.Id,
            Dni = dni,
            NombreCompleto = request.NombreCompleto.Trim(),
            Email = email,
            PasswordHash = PlatformPasswordHasher.Hash(dni),
            RolTenantId = rol.Id,
            Activo = true,
            DebeCambiarPassword = true
        };

        _appDb.UsuariosStaff.Add(usuario);
        await _appDb.SaveChangesAsync();
        await _staffSucursales.AsignarSucursalesAsync(usuario.Id, sucursalIds, esGerente);

        return Ok(new
        {
            Mensaje = "Usuario staff creado. Contraseña inicial: DNI (debe cambiarla al ingresar).",
            UsuarioId = usuario.Id,
            tenant.Subdomain,
            ClienteEmpresaId = tenant.ClienteEmpresaId
        });
    }

    [HttpGet("tenants/{tenantId:guid}/sucursales")]
    [HasPermission(PermisosApp.PlatformTenantsVer)]
    public async Task<IActionResult> ListarSucursalesTenant(Guid tenantId)
    {
        if (await _masterDb.Tenants.FindAsync(tenantId) == null)
        {
            return NotFound();
        }

        var sucursales = await _appDb.Sucursales
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId)
            .OrderBy(s => s.Nombre)
            .Select(s => new { s.Id, s.Nombre, s.Activa, s.Direccion })
            .ToListAsync();

        return Ok(sucursales);
    }

    [HttpGet("tenants/{tenantId:guid}/roles")]
    [HasPermission(PermisosApp.PlatformTenantsVer)]
    public async Task<IActionResult> ListarRolesTenant(Guid tenantId)
    {
        var tenant = await BindTenantAsync(tenantId);
        if (tenant == null)
        {
            return NotFound();
        }

        await TenantRbacSeeder.SeedRolesInicialesAsync(_appDb, tenantId);

        var roles = await _appDb.RolesTenant
            .IgnoreQueryFilters()
            .Include(r => r.Permisos)
            .Where(r => r.TenantId == tenantId)
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

    [HttpPost("tenants/{tenantId:guid}/roles")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> CrearRolTenant(Guid tenantId, [FromBody] PlatformCrearRolTenantRequest request)
    {
        var tenant = await BindTenantAsync(tenantId);
        if (tenant == null)
        {
            return NotFound();
        }

        await TenantRbacSeeder.SeedRolesInicialesAsync(_appDb, tenantId);

        var nombre = request.Nombre.Trim();
        if (string.IsNullOrWhiteSpace(nombre))
        {
            return BadRequest(new { error = "NombreRequerido", mensaje = "Indica el nombre del rol." });
        }

        var nivel = request.Nivel ?? (int)RolTenantCodigo.Cajero;
        if (nivel < 1 || nivel >= (int)RolTenantCodigo.Gerente)
        {
            return BadRequest(new
            {
                error = "NivelInvalido",
                mensaje = "El nivel debe ser entre 1 y el nivel de Cajero (no puede ser Gerente)."
            });
        }

        var codigo = NormalizarCodigoRol(request.Codigo, nombre);
        if (EsCodigoRolSistema(codigo))
        {
            return BadRequest(new
            {
                error = "CodigoReservado",
                mensaje = "Gerente y Cajero son roles del sistema. Edita sus permisos o usa otro nombre."
            });
        }

        if (await _appDb.RolesTenant.IgnoreQueryFilters().AnyAsync(r =>
                r.TenantId == tenantId && r.Codigo.ToLower() == codigo.ToLower()))
        {
            return BadRequest(new { error = "CodigoDuplicado", mensaje = "Ya existe un rol con ese código en el negocio." });
        }

        var permisos = (request.PermisoCodigos ?? []).Distinct().ToList();
        var invalidos = permisos.Where(c => !PermisosApp.TodosSport.Contains(c)).ToList();
        if (invalidos.Count > 0)
        {
            return BadRequest(new { error = "PermisoInvalido", mensaje = "Permisos no válidos.", invalidos });
        }

        if (permisos.Count == 0)
        {
            return BadRequest(new { error = "SinPermisos", mensaje = "Marca al menos un permiso." });
        }

        var rol = new RolTenant
        {
            TenantId = tenantId,
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
            Mensaje = "Rol creado en el negocio.",
            rol.Id,
            rol.Codigo,
            rol.Nombre,
            rol.Nivel
        });
    }

    [HttpPut("tenants/{tenantId:guid}/roles/{rolId:guid}/permisos")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> ActualizarPermisosRolTenant(
        Guid tenantId,
        Guid rolId,
        [FromBody] PlatformActualizarPermisosRolRequest request)
    {
        if (await BindTenantAsync(tenantId) == null)
        {
            return NotFound();
        }

        var rol = await _appDb.RolesTenant
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == rolId && r.TenantId == tenantId);

        if (rol == null)
        {
            return NotFound();
        }

        var permisos = request.PermisoCodigos.Distinct().ToList();
        var invalidos = permisos.Where(c => !PermisosApp.TodosSport.Contains(c)).ToList();
        if (invalidos.Count > 0)
        {
            return BadRequest(new { error = "PermisoInvalido", invalidos });
        }

        if (permisos.Count == 0)
        {
            return BadRequest(new { error = "SinPermisos", mensaje = "El rol debe tener al menos un permiso." });
        }

        var pivotes = await _appDb.RolesTenantPermisos.Where(p => p.RolTenantId == rolId).ToListAsync();
        _appDb.RolesTenantPermisos.RemoveRange(pivotes);
        foreach (var codigo in permisos)
        {
            _appDb.RolesTenantPermisos.Add(new RolTenantPermiso
            {
                RolTenantId = rolId,
                PermisoCodigo = codigo
            });
        }

        await _appDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Permisos actualizados.", RolId = rolId });
    }

    [HttpPut("staff-negocios/{staffId:guid}")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> ActualizarStaffNegocio(
        Guid staffId,
        [FromBody] PlatformStaffNegocioPatchRequest request)
    {
        var staff = await _appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .Include(u => u.RolTenant)
            .FirstOrDefaultAsync(u => u.Id == staffId);

        if (staff == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Usuario staff no encontrado." });
        }

        if (request.Activo.HasValue)
        {
            staff.Activo = request.Activo.Value;
        }

        await _appDb.SaveChangesAsync();
        return Ok(new
        {
            Mensaje = "Staff actualizado.",
            staff.Id,
            staff.Activo,
            TenantId = staff.TenantId
        });
    }

    [HttpPost("staff-negocios/{staffId:guid}/restablecer-password")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> RestablecerPasswordStaffNegocio(Guid staffId)
    {
        var staff = await _appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == staffId);

        if (staff == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Usuario staff no encontrado." });
        }

        staff.PasswordHash = PlatformPasswordHasher.Hash(staff.Dni);
        staff.DebeCambiarPassword = true;
        await _appDb.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Contraseña restablecida al DNI. Deberá cambiarla en el próximo ingreso.",
            staff.Id,
            staff.TenantId
        });
    }

    [HttpDelete("staff-negocios/{staffId:guid}")]
    [HasPermission(PermisosApp.PlatformTenantsGestionar)]
    public async Task<IActionResult> EliminarStaffNegocio(Guid staffId)
    {
        var staff = await _appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .Include(u => u.SucursalesAsignadas)
            .FirstOrDefaultAsync(u => u.Id == staffId);

        if (staff == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Usuario staff no encontrado." });
        }

        if (staff.SucursalesAsignadas.Count > 0)
        {
            _appDb.UsuariosStaffSucursales.RemoveRange(staff.SucursalesAsignadas);
        }

        _appDb.UsuariosStaff.Remove(staff);
        await _appDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Usuario staff eliminado del negocio.", StaffId = staffId });
    }

    private async Task<TenantNegocio?> BindTenantAsync(Guid tenantId)
    {
        var tenant = await _masterDb.Tenants.FindAsync(tenantId);
        if (tenant == null)
        {
            return null;
        }

        _tenantProvider.SetTenant(tenant);
        return tenant;
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

public class PlatformStaffNegocioPatchRequest
{
    public bool? Activo { get; set; }
}

public class PlatformCrearStaffNegocioRequest
{
    public Guid TenantId { get; set; }
    public string Dni { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Email { get; set; }
    public Guid RolTenantId { get; set; }
    public List<Guid>? SucursalIds { get; set; }
}

public class PlatformCrearRolTenantRequest
{
    public string Nombre { get; set; } = string.Empty;
    public string? Codigo { get; set; }
    public int? Nivel { get; set; }
    public List<string>? PermisoCodigos { get; set; }
}

public class PlatformActualizarPermisosRolRequest
{
    public List<string> PermisoCodigos { get; set; } = [];
}
