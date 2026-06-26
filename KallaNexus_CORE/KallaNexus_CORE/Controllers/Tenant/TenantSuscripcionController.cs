using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.API.Swagger;
using KallpaNexus.Application.Tenancy;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace KallpaNexus.API.Controllers.Tenant;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantStaff)]
[ApiController]
[Route("api/tenant/suscripcion")]
public class TenantSuscripcionController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly TenantSuscripcionService _suscripcion;
    private readonly ITenantProvider _tenantProvider;

    public TenantSuscripcionController(
        MasterDbContext masterDb,
        TenantSuscripcionService suscripcion,
        ITenantProvider tenantProvider)
    {
        _masterDb = masterDb;
        _suscripcion = suscripcion;
        _tenantProvider = tenantProvider;
    }

    [HttpGet]
    [HasTenantPermission(PermisosApp.CanchasVer)]
    public async Task<IActionResult> Resumen()
    {
        var empresa = await _suscripcion.ObtenerEmpresaActualAsync();
        if (empresa?.PlanSaaS == null)
        {
            return NotFound(new { error = "SinEmpresa", mensaje = "Empresa o plan no encontrado." });
        }

        var usoSucursales = await _suscripcion.ContarSucursalesTenantAsync();
        var usoStaff = await _suscripcion.ContarStaffEmpresaAsync();
        var usoCanchas = await _suscripcion.ContarCanchasTenantAsync();

        var solicitudPendiente = await _masterDb.SolicitudesContratoPlan
            .AsNoTracking()
            .Include(s => s.PlanSaaS)
            .Where(s => s.ClienteEmpresaId == empresa.Id && s.Estado == EstadoSolicitudContratoPlan.Pendiente)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.CreatedAt,
                s.MensajeCliente,
                Plan = new { s.PlanSaaS.Id, s.PlanSaaS.Nombre, s.PlanSaaS.PrecioMensual }
            })
            .FirstOrDefaultAsync();

        var puedeGestionar = User.FindAll(AuthClaims.Permiso)
            .Any(c => c.Value == PermisosApp.SportRolesGestionar);

        object? planesDisponibles = null;
        if (puedeGestionar)
        {
            planesDisponibles = await _masterDb.PlanesSaaS
                .AsNoTracking()
                .Where(p => p.Activo && p.SoportaModuloSport)
                .OrderBy(p => p.PrecioMensual)
                .Select(p => new
                {
                    p.Id,
                    p.Nombre,
                    p.PrecioMensual,
                    p.LimiteSucursales,
                    p.LimiteUsuariosStaff,
                    p.LimiteCanchas,
                    p.DiasDuracionDemo,
                    EsDemo = p.PrecioMensual <= 0,
                    EsActual = p.Id == empresa.PlanSaaSId
                })
                .ToListAsync();
        }

        var diasRestantes = PlanSaaSCicloHelper.DiasRestantesHastaFinCiclo(empresa.ProximoPago);
        var tipoCiclo = PlanSaaSCicloHelper.EtiquetaTipoCiclo(empresa.PlanSaaS);
        var cicloVencido = PlanSaaSCicloHelper.CicloVencido(empresa.ProximoPago);

        return Ok(new
        {
            estado = empresa.Estado.ToString(),
            proximoPago = empresa.ProximoPago,
            diasRestantesCiclo = diasRestantes,
            tipoCiclo,
            cicloVencido,
            accesoPanelCompleto = PlanSaaSCicloHelper.AccesoPanelCompleto(empresa),
            cancelacionProgramada = PlanSaaSCicloHelper.CancelacionConAccesoHastaFinCiclo(empresa),
            soloGestionPlan = PlanSaaSCicloHelper.SoloPaginaPlan(empresa),
            plan = new
            {
                empresa.PlanSaaS.Id,
                empresa.PlanSaaS.Nombre,
                empresa.PlanSaaS.PrecioMensual,
                LimiteSucursales = EmpresaLimitesHelper.LimiteSucursalesPorNegocio(empresa),
                LimiteUsuariosStaff = EmpresaLimitesHelper.LimiteUsuariosStaff(empresa),
                LimiteCanchas = EmpresaLimitesHelper.LimiteCanchasPorNegocio(empresa),
                PrecioMensualEfectivo = EmpresaLimitesHelper.PrecioMensualFacturacion(empresa),
                empresa.PlanSaaS.DiasDuracionDemo,
                esDemo = PlanSaaSCicloHelper.EsPlanDemo(empresa.PlanSaaS)
            },
            uso = new
            {
                sucursales = usoSucursales,
                usuariosStaff = usoStaff,
                canchas = usoCanchas,
            },
            solicitudPendiente,
            planesDisponibles
        });
    }

    [HttpPost("solicitar-plan")]
    [HasTenantPermission(PermisosApp.SportRolesGestionar)]
    public async Task<IActionResult> SolicitarPlan([FromBody] SolicitarPlanTenantRequest request)
    {
        var empresaId = await EmpresaIdActualAsync();
        if (!empresaId.HasValue)
        {
            return NotFound();
        }

        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .FirstOrDefaultAsync(c => c.Id == empresaId.Value);

        if (empresa == null)
        {
            return NotFound();
        }

        if (empresa.Estado == EstadoSuscripcion.Suspendido)
        {
            return BadRequest(new
            {
                error = "SuscripcionSuspendida",
                mensaje = "La suscripción está suspendida. Contacta a soporte."
            });
        }

        if (PlanSaaSCicloHelper.CicloVencido(empresa.ProximoPago) &&
            PlanSaaSCicloHelper.EsPlanDemo(empresa.PlanSaaS))
        {
            return BadRequest(new
            {
                error = "DemoFinalizado",
                mensaje =
                    "El periodo demo ya venció. Elige un plan de pago; Kallpa revisará tu solicitud de contrato."
            });
        }

        var plan = await _masterDb.PlanesSaaS.FirstOrDefaultAsync(p =>
            p.Id == request.PlanSaaSId && p.Activo && p.SoportaModuloSport);

        if (plan == null)
        {
            return BadRequest(new { error = "PlanInvalido", mensaje = "Plan no disponible." });
        }

        if (plan.Id == empresa.PlanSaaSId)
        {
            return BadRequest(new { error = "PlanActual", mensaje = "Ya tienes ese plan contratado." });
        }

        var yaPendiente = await _masterDb.SolicitudesContratoPlan.AnyAsync(s =>
            s.ClienteEmpresaId == empresa.Id && s.Estado == EstadoSolicitudContratoPlan.Pendiente);

        if (yaPendiente)
        {
            return BadRequest(new
            {
                error = "SolicitudPendiente",
                mensaje = "Ya tienes una solicitud de plan en revisión. Kallpa te contactará pronto."
            });
        }

        var tenantId = _tenantProvider.GetTenantId();
        string? subdomain = null;
        if (tenantId.HasValue)
        {
            subdomain = await _masterDb.Tenants
                .AsNoTracking()
                .Where(t => t.Id == tenantId.Value)
                .Select(t => t.Subdomain)
                .FirstOrDefaultAsync();
        }

        var nombre = User.FindFirst(ClaimTypes.Name)?.Value ?? "Gerente";
        var dni = User.FindFirst("dni")?.Value ?? "";
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        var solicitud = new SolicitudContratoPlan
        {
            ClienteEmpresaId = empresa.Id,
            PlanSaaSId = plan.Id,
            TenantId = tenantId,
            Subdomain = subdomain,
            MensajeCliente = string.IsNullOrWhiteSpace(request.Mensaje) ? null : request.Mensaje.Trim(),
            SolicitanteNombre = nombre,
            SolicitanteDni = dni,
            SolicitanteEmail = email
        };

        _masterDb.SolicitudesContratoPlan.Add(solicitud);
        await _masterDb.SaveChangesAsync();

        return Ok(new
        {
            mensaje =
                "Recibimos tu solicitud. El equipo de Kallpa Nexus revisará tu contrato y se comunicará contigo " +
                "para confirmar el plan y los siguientes pasos.",
            solicitudId = solicitud.Id,
            planSolicitado = plan.Nombre
        });
    }

    [HttpPut("plan")]
    [HasTenantPermission(PermisosApp.SportRolesGestionar)]
    public Task<IActionResult> CambiarPlan([FromBody] CambiarPlanTenantRequest request)
    {
        _ = request;
        return Task.FromResult<IActionResult>(BadRequest(new
        {
            error = "CambioManualDeshabilitado",
            mensaje =
                "El cambio de plan se gestiona mediante solicitud. Usa «Elegir este plan» para que Kallpa atienda tu pedido."
        }));
    }

    [HttpPost("suscribir")]
    [HasTenantPermission(PermisosApp.SportRolesGestionar)]
    public async Task<IActionResult> Suscribir()
    {
        var empresaIdSus = await EmpresaIdActualAsync();
        if (!empresaIdSus.HasValue)
        {
            return NotFound();
        }

        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .FirstOrDefaultAsync(c => c.Id == empresaIdSus.Value);

        if (empresa == null)
        {
            return NotFound();
        }

        var plan = empresa.PlanSaaS!;
        var vencido = PlanSaaSCicloHelper.CicloVencido(empresa.ProximoPago);

        if (!vencido && empresa.Estado == EstadoSuscripcion.Cancelado)
        {
            empresa.Estado = PlanSaaSCicloHelper.RestaurarEstadoTrasReactivacion(plan);
            await _masterDb.SaveChangesAsync();
            return Ok(new
            {
                mensaje =
                    "Suscripción reactivada. Se mantiene la misma fecha de fin de ciclo; no se reinicia el periodo.",
                estado = empresa.Estado.ToString(),
                empresa.ProximoPago,
                cicloVencido = false
            });
        }

        if (vencido)
        {
            if (PlanSaaSCicloHelper.EsPlanDemo(plan))
            {
                return BadRequest(new
                {
                    error = "DemoFinalizado",
                    mensaje =
                        "El demo ya venció. Solicita un plan de pago en esta pantalla; no se puede reiniciar el demo."
                });
            }

            PlanSaaSCicloHelper.AplicarCicloTrasContrato(empresa, plan, DateTime.UtcNow);
            await _masterDb.SaveChangesAsync();
            return Ok(new
            {
                mensaje = "Nuevo ciclo de suscripción iniciado.",
                estado = empresa.Estado.ToString(),
                empresa.ProximoPago,
                cicloVencido = false
            });
        }

        if (empresa.Estado is EstadoSuscripcion.Activo or EstadoSuscripcion.Demo)
        {
            if (empresa.Estado == EstadoSuscripcion.Demo && PlanSaaSCicloHelper.EsPlanDemo(plan))
            {
                return Ok(new
                {
                    mensaje =
                        "Sigues en modo demo (plan gratuito). Elige un plan de pago para activar facturación.",
                    estado = empresa.Estado.ToString(),
                    empresa.ProximoPago
                });
            }

            return Ok(new
            {
                mensaje = "Suscripción activa.",
                estado = empresa.Estado.ToString(),
                empresa.ProximoPago
            });
        }

        if (empresa.Estado == EstadoSuscripcion.Suspendido)
        {
            empresa.Estado = PlanSaaSCicloHelper.RestaurarEstadoTrasReactivacion(plan);
            await _masterDb.SaveChangesAsync();
            return Ok(new
            {
                mensaje = "Suscripción reactivada.",
                estado = empresa.Estado.ToString(),
                empresa.ProximoPago
            });
        }

        empresa.Estado = PlanSaaSCicloHelper.RestaurarEstadoTrasReactivacion(plan);
        await _masterDb.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Suscripción activada.",
            estado = empresa.Estado.ToString(),
            empresa.ProximoPago
        });
    }

    [HttpPost("cancelar")]
    [HasTenantPermission(PermisosApp.SportRolesGestionar)]
    public async Task<IActionResult> Cancelar()
    {
        var empresaId = await EmpresaIdActualAsync();
        var empresa = await _masterDb.ClientesEmpresas
            .Include(c => c.PlanSaaS)
            .FirstOrDefaultAsync(c => c.Id == empresaId);
        if (empresa == null)
        {
            return NotFound();
        }

        if (empresa.Estado == EstadoSuscripcion.Cancelado)
        {
            return Ok(new { mensaje = "La suscripción ya estaba cancelada.", estado = empresa.Estado.ToString() });
        }

        empresa.Estado = EstadoSuscripcion.Cancelado;
        await _masterDb.SaveChangesAsync();

        var fin = empresa.ProximoPago.ToUniversalTime().Date;
        var finTexto = fin.ToString("yyyy-MM-dd");

        return Ok(new
        {
            mensaje =
                $"Suscripción cancelada. Mantienes acceso al panel hasta el fin del ciclo ({finTexto}). " +
                "Después de esa fecha solo podrás gestionar el plan para volver a contratar.",
            estado = empresa.Estado.ToString(),
            proximoPago = empresa.ProximoPago,
            cancelacionProgramada = PlanSaaSCicloHelper.CancelacionConAccesoHastaFinCiclo(empresa)
        });
    }

    private async Task<Guid?> EmpresaIdActualAsync()
    {
        var empresa = await _suscripcion.ObtenerEmpresaActualAsync();
        return empresa?.Id;
    }
}

public class SolicitarPlanTenantRequest
{
    public Guid PlanSaaSId { get; set; }
    public string? Mensaje { get; set; }
}

public class CambiarPlanTenantRequest
{
    public Guid PlanSaaSId { get; set; }
}
