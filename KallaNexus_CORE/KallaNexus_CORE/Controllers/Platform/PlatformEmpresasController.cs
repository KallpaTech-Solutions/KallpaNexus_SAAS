using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Platform;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Platform)]
[ApiController]
[Route("api/platform/empresas")]
public class PlatformEmpresasController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly ApplicationDbContext _appDb;
    private readonly TenantProvider _tenantProvider;

    public PlatformEmpresasController(
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ITenantProvider tenantProvider)
    {
        _masterDb = masterDb;
        _appDb = appDb;
        _tenantProvider = (TenantProvider)tenantProvider;
    }

    [HttpGet]
    [HasPermission(PermisosApp.PlatformEmpresasVer)]
    public async Task<IActionResult> Listar([FromQuery] EstadoSuscripcion? estado)
    {
        var query = _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .AsQueryable();

        if (estado.HasValue)
        {
            query = query.Where(c => c.Estado == estado.Value);
        }

        var empresas = await query
            .OrderBy(c => c.NombreComercial)
            .Select(c => new
            {
                c.Id,
                c.Tipo,
                c.DocumentoFiscal,
                c.RazonSocial,
                c.NombreComercial,
                c.EmailFacturacion,
                c.Telefono,
                Estado = c.Estado.ToString(),
                c.ProximoPago,
                PlanSaaSId = c.PlanSaaSId,
                PlanNombre = c.PlanSaaS.Nombre,
                PlanPrecioMensual = c.PlanSaaS.PrecioMensual,
                TotalTenants = c.Tenants.Count
            })
            .ToListAsync();

        return Ok(empresas);
    }

    [HttpGet("{empresaId:guid}")]
    [HasPermission(PermisosApp.PlatformEmpresasVer)]
    public async Task<IActionResult> Obtener(Guid empresaId)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .Include(c => c.Tenants)
            .FirstOrDefaultAsync(c => c.Id == empresaId);

        if (empresa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Empresa no encontrada." });
        }

        var uso = await CalcularUsoOperativoAsync(empresa);

        return Ok(new
        {
            empresa.Id,
            empresa.Tipo,
            empresa.DocumentoFiscal,
            empresa.RazonSocial,
            empresa.NombreComercial,
            empresa.EmailFacturacion,
            empresa.Telefono,
            empresa.DireccionFiscal,
            empresa.Pais,
            Estado = empresa.Estado.ToString(),
            empresa.ProximoPago,
            empresa.LimiteSucursalesOverride,
            empresa.LimiteUsuariosStaffOverride,
            empresa.LimiteCanchasOverride,
            empresa.PrecioMensualAcordado,
            empresa.ReservaWebPermitida,
            PrecioMensualEfectivo = EmpresaLimitesHelper.PrecioMensualFacturacion(empresa),
            Plan = new
            {
                empresa.PlanSaaS.Id,
                empresa.PlanSaaS.Nombre,
                empresa.PlanSaaS.PrecioMensual,
                empresa.PlanSaaS.LimiteSucursales,
                empresa.PlanSaaS.LimiteUsuariosStaff,
                empresa.PlanSaaS.LimiteCanchas,
                empresa.PlanSaaS.SoportaModuloSport,
                empresa.PlanSaaS.SoportaModuloStay,
                empresa.PlanSaaS.SoportaModuloCare
            },
            LimitesEfectivos = new
            {
                LimiteSucursales = EmpresaLimitesHelper.LimiteSucursalesPorNegocio(empresa),
                LimiteUsuariosStaff = EmpresaLimitesHelper.LimiteUsuariosStaff(empresa),
                LimiteCanchas = EmpresaLimitesHelper.LimiteCanchasPorNegocio(empresa),
            },
            Uso = new
            {
                uso.StaffActivos,
                Tenants = empresa.Tenants.Select(t => new
                {
                    t.Id,
                    t.Subdomain,
                    Sucursales = uso.SucursalesPorTenant.GetValueOrDefault(t.Id),
                    CanchasActivas = uso.CanchasPorTenant.GetValueOrDefault(t.Id),
                    ReservaWebActivaTenant = uso.ReservaWebPorTenant.GetValueOrDefault(t.Id),
                }).ToList(),
            },
            Tenants = empresa.Tenants.Select(t => new
            {
                t.Id,
                t.Subdomain,
                t.NombreComercialNegocio,
                t.IsActive,
                ReservaWebActiva = uso.ReservaWebPorTenant.GetValueOrDefault(t.Id),
            }).ToList()
        });
    }

    [HttpPut("{empresaId:guid}/limites")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> ActualizarLimites(Guid empresaId, [FromBody] ActualizarLimitesEmpresaRequest request)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .FirstOrDefaultAsync(c => c.Id == empresaId);

        if (empresa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Empresa no encontrada." });
        }

        if (request.LimiteSucursalesOverride.HasValue)
        {
            empresa.LimiteSucursalesOverride = request.LimiteSucursalesOverride.Value <= 0
                ? null
                : request.LimiteSucursalesOverride;
        }

        if (request.LimiteUsuariosStaffOverride.HasValue)
        {
            empresa.LimiteUsuariosStaffOverride = request.LimiteUsuariosStaffOverride.Value <= 0
                ? null
                : request.LimiteUsuariosStaffOverride;
        }

        if (request.LimiteCanchasOverride.HasValue)
        {
            empresa.LimiteCanchasOverride = request.LimiteCanchasOverride.Value <= 0
                ? null
                : request.LimiteCanchasOverride;
        }

        if (request.PrecioMensualAcordado.HasValue)
        {
            empresa.PrecioMensualAcordado = request.PrecioMensualAcordado.Value < 0
                ? null
                : request.PrecioMensualAcordado;
        }

        if (request.ReservaWebPermitida.HasValue)
        {
            empresa.ReservaWebPermitida = request.ReservaWebPermitida.Value;
        }

        await _masterDb.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Límites y controles de la empresa actualizados.",
            empresa.Id,
            empresa.LimiteSucursalesOverride,
            empresa.LimiteUsuariosStaffOverride,
            empresa.LimiteCanchasOverride,
            empresa.PrecioMensualAcordado,
            empresa.ReservaWebPermitida,
            PrecioMensualEfectivo = EmpresaLimitesHelper.PrecioMensualFacturacion(empresa),
        });
    }

    private async Task<UsoOperativoEmpresa> CalcularUsoOperativoAsync(ClienteEmpresa empresa)
    {
        var tenantIds = empresa.Tenants.Select(t => t.Id).ToList();
        var staff = tenantIds.Count == 0
            ? 0
            : await _appDb.UsuariosStaff
                .IgnoreQueryFilters()
                .CountAsync(u => tenantIds.Contains(u.TenantId) && u.Activo);

        var sucursalesPorTenant = new Dictionary<Guid, int>();
        var canchasPorTenant = new Dictionary<Guid, int>();
        var reservaWebPorTenant = new Dictionary<Guid, bool>();

        foreach (var tenant in empresa.Tenants)
        {
            _tenantProvider.SetTenant(tenant);
            var suc = await _appDb.Sucursales.CountAsync();
            var can = await _appDb.Canchas.CountAsync(c => c.EstaActiva);
            var cfg = await _appDb.ConfiguracionNegocio.AsNoTracking().FirstOrDefaultAsync();
            sucursalesPorTenant[tenant.Id] = suc;
            canchasPorTenant[tenant.Id] = can;
            reservaWebPorTenant[tenant.Id] = cfg?.ReservaWebActiva ?? false;
        }

        return new UsoOperativoEmpresa
        {
            StaffActivos = staff,
            SucursalesPorTenant = sucursalesPorTenant,
            CanchasPorTenant = canchasPorTenant,
            ReservaWebPorTenant = reservaWebPorTenant,
        };
    }

    private sealed class UsoOperativoEmpresa
    {
        public int StaffActivos { get; init; }
        public Dictionary<Guid, int> SucursalesPorTenant { get; init; } = new();
        public Dictionary<Guid, int> CanchasPorTenant { get; init; } = new();
        public Dictionary<Guid, bool> ReservaWebPorTenant { get; init; } = new();
    }

    /// <summary>
    /// Asigna o cambia el plan SaaS de la empresa pagadora.
    /// </summary>
    [HttpPut("{empresaId:guid}/plan")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> AsignarPlan(Guid empresaId, [FromBody] AsignarPlanEmpresaRequest request)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .FirstOrDefaultAsync(c => c.Id == empresaId);

        if (empresa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Empresa no encontrada." });
        }

        var plan = await _masterDb.PlanesSaaS.FirstOrDefaultAsync(p => p.Id == request.PlanSaaSId);
        if (plan == null || !plan.Activo)
        {
            return BadRequest(new { error = "PlanInvalido", mensaje = "El plan no existe o está inactivo." });
        }

        var planAnterior = empresa.PlanSaaS.Nombre;
        empresa.PlanSaaSId = plan.Id;
        empresa.PlanSaaS = plan;
        empresa.RestablecerLimitesPersonalizados();

        if (request.ProximoPago.HasValue)
        {
            empresa.ProximoPago = DateTime.SpecifyKind(request.ProximoPago.Value, DateTimeKind.Utc);
        }

        if (request.Estado.HasValue)
        {
            empresa.Estado = request.Estado.Value;
        }

        await _masterDb.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Plan asignado a la empresa correctamente.",
            EmpresaId = empresa.Id,
            Empresa = empresa.NombreComercial,
            PlanAnterior = planAnterior,
            PlanNuevo = plan.Nombre,
            empresa.PlanSaaSId,
            Estado = empresa.Estado.ToString(),
            empresa.ProximoPago
        });
    }

    [HttpPut("{empresaId:guid}")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> Actualizar(Guid empresaId, [FromBody] ActualizarEmpresaRequest request)
    {
        var empresa = await _masterDb.ClientesEmpresas.FirstOrDefaultAsync(c => c.Id == empresaId);
        if (empresa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Empresa no encontrada." });
        }

        if (!string.IsNullOrWhiteSpace(request.RazonSocial))
        {
            empresa.RazonSocial = request.RazonSocial.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.NombreComercial))
        {
            empresa.NombreComercial = request.NombreComercial.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.EmailFacturacion))
        {
            empresa.EmailFacturacion = request.EmailFacturacion.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Telefono))
        {
            empresa.Telefono = request.Telefono.Trim();
        }

        if (request.DireccionFiscal != null)
        {
            empresa.DireccionFiscal = string.IsNullOrWhiteSpace(request.DireccionFiscal)
                ? null
                : request.DireccionFiscal.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Pais))
        {
            empresa.Pais = request.Pais.Trim();
        }

        if (request.Estado.HasValue)
        {
            empresa.Estado = request.Estado.Value;
            if (request.Estado.Value is EstadoSuscripcion.Activo or EstadoSuscripcion.Demo)
            {
                var tenantsActivar = await _masterDb.Tenants
                    .Where(t => t.ClienteEmpresaId == empresaId)
                    .ToListAsync();
                foreach (var tenant in tenantsActivar)
                {
                    tenant.IsActive = true;
                }
            }

            if (request.Estado.Value is EstadoSuscripcion.Suspendido or EstadoSuscripcion.Cancelado)
            {
                var tenantsOff = await _masterDb.Tenants
                    .Where(t => t.ClienteEmpresaId == empresaId)
                    .ToListAsync();
                foreach (var tenant in tenantsOff)
                {
                    tenant.IsActive = false;
                }
            }
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new { Mensaje = "Empresa actualizada.", EmpresaId = empresa.Id });
    }

    [HttpDelete("{empresaId:guid}")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> Eliminar(Guid empresaId)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.Tenants)
            .FirstOrDefaultAsync(c => c.Id == empresaId);

        if (empresa == null)
        {
            return NotFound();
        }

        empresa.Estado = EstadoSuscripcion.Cancelado;
        foreach (var tenant in empresa.Tenants)
        {
            tenant.IsActive = false;
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new
        {
            Mensaje = "Empresa suspendida/cancelada y sus tenants desactivados.",
            EmpresaId = empresa.Id,
            Estado = empresa.Estado.ToString()
        });
    }

    /// <summary>
    /// Borra la empresa pagadora y todos los datos de sus tenants. Solo si está Cancelada.
    /// No elimina cuentas B2C ni staff de otros negocios (mismo DNI en otra empresa).
    /// </summary>
    [HttpPost("{empresaId:guid}/eliminar-definitivo")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> EliminarDefinitivo(Guid empresaId, [FromBody] EliminarEmpresaDefinitivoRequest request)
    {
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.Tenants)
            .FirstOrDefaultAsync(c => c.Id == empresaId);

        if (empresa == null)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = "Empresa no encontrada." });
        }

        if (empresa.Estado != EstadoSuscripcion.Cancelado)
        {
            return BadRequest(new
            {
                error = "EstadoInvalido",
                mensaje = "Solo se pueden eliminar empresas en estado Cancelado. Cancela la empresa antes."
            });
        }

        var frase = (request.Confirmacion ?? "").Trim();
        var esperada = empresa.NombreComercial.Trim();
        if (!string.Equals(frase, esperada, StringComparison.Ordinal))
        {
            return BadRequest(new
            {
                error = "ConfirmacionInvalida",
                mensaje = $"Escribe exactamente el nombre comercial de facturación: {esperada}"
            });
        }

        var tenantIds = empresa.Tenants.Select(t => t.Id).ToList();
        foreach (var tenantId in tenantIds)
        {
            await EmpresaTenantPurgaService.PurgarAsync(_appDb, tenantId);
        }

        _masterDb.Tenants.RemoveRange(empresa.Tenants);
        _masterDb.ClientesEmpresas.Remove(empresa);
        await _masterDb.SaveChangesAsync();

        return Ok(new
        {
            Mensaje = "Empresa y datos operativos de sus negocios eliminados permanentemente.",
            EmpresaId = empresaId,
            TenantsEliminados = tenantIds.Count
        });
    }
}

public class ActualizarEmpresaRequest
{
    public string? RazonSocial { get; set; }
    public string? NombreComercial { get; set; }
    public string? EmailFacturacion { get; set; }
    public string? Telefono { get; set; }
    public string? DireccionFiscal { get; set; }
    public string? Pais { get; set; }
    public EstadoSuscripcion? Estado { get; set; }
}

public class AsignarPlanEmpresaRequest
{
    public Guid PlanSaaSId { get; set; }
    public EstadoSuscripcion? Estado { get; set; }
    public DateTime? ProximoPago { get; set; }
}

public class ActualizarLimitesEmpresaRequest
{
    /// <summary>Null = no cambiar. &lt;= 0 = quitar override (usar plan).</summary>
    public int? LimiteSucursalesOverride { get; set; }

    public int? LimiteUsuariosStaffOverride { get; set; }

    public int? LimiteCanchasOverride { get; set; }

    public decimal? PrecioMensualAcordado { get; set; }

    public bool? ReservaWebPermitida { get; set; }
}

public class EliminarEmpresaDefinitivoRequest
{
    /// <summary>Debe coincidir con el nombre comercial de la empresa (confirmación).</summary>
    public string Confirmacion { get; set; } = string.Empty;
}
