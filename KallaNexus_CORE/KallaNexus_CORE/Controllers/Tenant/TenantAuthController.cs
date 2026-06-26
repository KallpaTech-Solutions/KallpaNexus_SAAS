using System.Security.Claims;
using KallpaNexus.API.Swagger;
using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Infrastructure.Auth;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.Tenant;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantStaff)]
[ApiController]
[Route("api/tenant/auth")]
public class TenantAuthController : ControllerBase
{
    private readonly ApplicationDbContext _appDb;
    private readonly MasterDbContext _masterDb;
    private readonly TenantStaffJwtService _jwt;
    private readonly TenantRbacService _rbac;
    private readonly ITenantProvider _tenantProvider;
    private readonly TenantStaffSucursalService _staffSucursales;

    public TenantAuthController(
        ApplicationDbContext appDb,
        MasterDbContext masterDb,
        TenantStaffJwtService jwt,
        TenantRbacService rbac,
        ITenantProvider tenantProvider,
        TenantStaffSucursalService staffSucursales)
    {
        _appDb = appDb;
        _masterDb = masterDb;
        _jwt = jwt;
        _rbac = rbac;
        _tenantProvider = tenantProvider;
        _staffSucursales = staffSucursales;
    }

    /// <summary>DNI + contraseña con tenant resuelto por URL o header.</summary>
    [HttpPost("login")]
    public Task<IActionResult> Login([FromBody] TenantStaffLoginRequest request) =>
        StaffLoginAsync(request, restrictToResolvedTenant: true);

    /// <summary>Portal único: DNI + contraseña; opcional tenantId si hay varios negocios.</summary>
    [HttpPost("login-global")]
    public Task<IActionResult> LoginGlobal([FromBody] TenantStaffLoginRequest request) =>
        StaffLoginAsync(request, restrictToResolvedTenant: false);

    [Authorize(AuthenticationSchemes = TenantStaffJwtService.SchemeName)]
    [HttpPost("cambiar-password")]
    public async Task<IActionResult> CambiarPassword([FromBody] CambiarPasswordStaffRequest request)
    {
        if (!_rbac.TokenCoincideConTenantActual(User))
        {
            return Forbid();
        }

        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(idClaim, out var staffId))
        {
            return Unauthorized();
        }

        var usuario = await _appDb.UsuariosStaff
            .Include(u => u.RolTenant)
            .FirstOrDefaultAsync(u => u.Id == staffId && u.Activo);

        if (usuario == null)
        {
            return NotFound();
        }

        if (!PlatformPasswordHasher.Verify(request.PasswordActual, usuario.PasswordHash))
        {
            return BadRequest(new { error = "PasswordActualInvalida", mensaje = "La contraseña actual no es correcta." });
        }

        var dni = usuario.Dni;
        var politica = StaffCredencialesHelper.ValidarPoliticaNuevaPassword(request.NuevaPassword, dni);
        if (politica != null)
        {
            return BadRequest(new { error = "PasswordInvalida", mensaje = politica });
        }

        usuario.PasswordHash = PlatformPasswordHasher.Hash(request.NuevaPassword);
        usuario.DebeCambiarPassword = false;
        await _appDb.SaveChangesAsync();

        return Ok(new { mensaje = "Contraseña actualizada.", debeCambiarPassword = false });
    }

    [Authorize(AuthenticationSchemes = TenantStaffJwtService.SchemeName)]
    [HttpGet("yo")]
    public async Task<IActionResult> Yo()
    {
        if (!_rbac.TokenCoincideConTenantActual(User))
        {
            return Forbid();
        }

        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(idClaim, out var staffId))
        {
            return Unauthorized();
        }

        var usuario = await _appDb.UsuariosStaff
            .AsNoTracking()
            .Include(u => u.RolTenant)
            .FirstOrDefaultAsync(u => u.Id == staffId && u.Activo);

        if (usuario == null)
        {
            return NotFound();
        }

        await TenantRbacSeeder.SeedRolesInicialesAsync(_appDb, usuario.TenantId);

        var (sucursales, accesoTodas) = await _staffSucursales.ResolverAccesoAsync(staffId);
        var permisos = await _rbac.ObtenerPermisosStaffAsync(staffId);

        var tenantId = usuario.TenantId;
        var tenant = await _masterDb.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
        var empresa = tenant == null
            ? null
            : await _masterDb.ClientesEmpresas.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == tenant.ClienteEmpresaId);

        return Ok(new
        {
            usuario.Id,
            usuario.TenantId,
            usuario.Dni,
            usuario.NombreCompleto,
            usuario.Email,
            usuario.DebeCambiarPassword,
            Rol = usuario.RolTenant.Codigo,
            Permisos = permisos,
            accesoTodasSucursales = accesoTodas,
            sucursales = sucursales.Select(s => new { s.Id, s.Nombre }).ToList(),
            nombreComercialNegocio = tenant?.NombreComercialNegocio,
            nombreEmpresa = empresa?.NombreComercial ?? empresa?.RazonSocial
        });
    }

    private async Task<IActionResult> StaffLoginAsync(
        TenantStaffLoginRequest request,
        bool restrictToResolvedTenant)
    {
        var dni = StaffCredencialesHelper.NormalizarDni(request.Dni);
        if (!StaffCredencialesHelper.EsDniValidoParaStaff(dni))
        {
            return BadRequest(new { error = "DniInvalido", mensaje = "Ingresa un DNI de 8 dígitos." });
        }

        Guid? restrictTenantId = restrictToResolvedTenant ? _tenantProvider.GetTenantId() : null;
        if (request.TenantId.HasValue)
        {
            restrictTenantId = request.TenantId.Value;
        }

        var query = _appDb.UsuariosStaff
            .IgnoreQueryFilters()
            .Include(u => u.RolTenant)
            .Where(u => u.Dni == dni && u.Activo);

        if (restrictTenantId.HasValue)
        {
            query = query.Where(u => u.TenantId == restrictTenantId.Value);
        }

        var candidatos = await query.ToListAsync();
        var coincidencias = candidatos
            .Where(c => PlatformPasswordHasher.Verify(request.Password, c.PasswordHash))
            .ToList();

        if (coincidencias.Count == 0)
        {
            var inactivosQuery = _appDb.UsuariosStaff
                .IgnoreQueryFilters()
                .Where(u => u.Dni == dni && !u.Activo);
            if (restrictTenantId.HasValue)
            {
                inactivosQuery = inactivosQuery.Where(u => u.TenantId == restrictTenantId.Value);
            }

            var inactivos = await inactivosQuery.ToListAsync();
            if (inactivos.Any(u => PlatformPasswordHasher.Verify(request.Password, u.PasswordHash)))
            {
                return Unauthorized(new
                {
                    error = "UsuarioInactivo",
                    mensaje =
                        "Tu usuario está desactivado en este negocio. Pide al gerente que te reactive o comuníquese con su proveedor de servicios."
                });
            }

            return Unauthorized(new { error = "CredencialesInvalidas", mensaje = "DNI o contraseña incorrectos." });
        }

        if (coincidencias.Count > 1 && !request.TenantId.HasValue)
        {
            var tenantIds = coincidencias.Select(c => c.TenantId).Distinct().ToList();
            var tenants = await _masterDb.Tenants
                .AsNoTracking()
                .Where(t => tenantIds.Contains(t.Id) && t.IsActive)
                .Select(t => new
                {
                    t.Id,
                    t.Subdomain,
                    nombreComercial = t.NombreComercialNegocio
                })
                .ToListAsync();

            return Ok(new
            {
                requiereSeleccionNegocio = true,
                mensaje = "Elige en qué negocio quieres entrar.",
                negocios = tenants
            });
        }

        var usuario = coincidencias[0];
        return await CompletarLoginAsync(usuario);
    }

    private async Task<IActionResult> CompletarLoginAsync(UsuarioStaff usuario)
    {
        var tenant = await _masterDb.Tenants
            .FirstOrDefaultAsync(t => t.Id == usuario.TenantId && t.IsActive);

        if (tenant == null)
        {
            return BadRequest(new
            {
                error = "TenantInactivo",
                mensaje = "El negocio asociado a esta cuenta no está activo. Comuníquese con su proveedor de servicios."
            });
        }

        var empresa = await _masterDb.ClientesEmpresas
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == tenant.ClienteEmpresaId);

        if (empresa?.Estado == EstadoSuscripcion.Suspendido)
        {
            return BadRequest(new
            {
                error = "SuscripcionSuspendida",
                mensaje =
                    "La suscripción de tu empresa está suspendida. Comuníquese con su proveedor de servicios."
            });
        }

        if (_tenantProvider is TenantProvider provider)
        {
            provider.SetTenant(tenant);
        }

        await TenantRbacSeeder.SeedRolesInicialesAsync(_appDb, usuario.TenantId);

        var permisos = await _rbac.ObtenerPermisosStaffAsync(usuario.Id);
        var (sucursales, accesoTodas) = await _staffSucursales.ResolverAccesoAsync(usuario.Id);
        if (!accesoTodas && sucursales.Count == 0)
        {
            return BadRequest(new
            {
                error = "SinSucursalAsignada",
                mensaje =
                    "Tu usuario no tiene sucursal asignada. Pide al gerente que te asigne al menos una sede en Equipo."
            });
        }

        var token = _jwt.GenerarToken(usuario, permisos);

        return Ok(new
        {
            mensaje = "Login staff exitoso.",
            token,
            usuario.TenantId,
            usuario.Id,
            usuario.Dni,
            usuario.NombreCompleto,
            email = usuario.Email,
            subdomain = tenant.Subdomain,
            nombreComercialNegocio = tenant.NombreComercialNegocio,
            nombreEmpresa = empresa?.NombreComercial ?? empresa?.RazonSocial,
            Rol = usuario.RolTenant.Codigo,
            permisos,
            debeCambiarPassword = usuario.DebeCambiarPassword,
            accesoTodasSucursales = accesoTodas,
            sucursales = sucursales.Select(s => new { s.Id, s.Nombre }).ToList()
        });
    }
}

public class TenantStaffLoginRequest
{
    public string Dni { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Guid? TenantId { get; set; }
}

public class CambiarPasswordStaffRequest
{
    public string PasswordActual { get; set; } = string.Empty;
    public string NuevaPassword { get; set; } = string.Empty;
}
