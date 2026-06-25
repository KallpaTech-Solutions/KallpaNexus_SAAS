using System.Security.Claims;
using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Application.Tenancy;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers.Platform;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Platform)]
[ApiController]
[Route("api/platform/solicitudes-contrato")]
public class PlatformSolicitudesContratoController : ControllerBase
{
    private readonly MasterDbContext _masterDb;

    public PlatformSolicitudesContratoController(MasterDbContext masterDb)
    {
        _masterDb = masterDb;
    }

    [HttpGet]
    [HasPermission(PermisosApp.PlatformEmpresasVer)]
    public async Task<IActionResult> Listar([FromQuery] EstadoSolicitudContratoPlan? estado)
    {
        var query = _masterDb.SolicitudesContratoPlan
            .AsNoTracking()
            .Include(s => s.ClienteEmpresa)
            .Include(s => s.PlanSaaS)
            .AsQueryable();

        if (estado.HasValue)
        {
            query = query.Where(s => s.Estado == estado.Value);
        }

        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.Estado,
                s.CreatedAt,
                s.RespondidoEn,
                s.MensajeCliente,
                s.NotasPlataforma,
                s.Subdomain,
                s.TenantId,
                Plan = new { s.PlanSaaS.Id, s.PlanSaaS.Nombre, s.PlanSaaS.PrecioMensual },
                Empresa = new
                {
                    s.ClienteEmpresa.Id,
                    s.ClienteEmpresa.NombreComercial,
                    s.ClienteEmpresa.RazonSocial,
                    s.ClienteEmpresa.DocumentoFiscal,
                    s.ClienteEmpresa.EmailFacturacion,
                    s.ClienteEmpresa.Telefono,
                    EstadoSuscripcion = s.ClienteEmpresa.Estado.ToString()
                },
                Solicitante = new
                {
                    s.SolicitanteNombre,
                    s.SolicitanteDni,
                    s.SolicitanteEmail
                }
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermisosApp.PlatformEmpresasVer)]
    public async Task<IActionResult> Obtener(Guid id)
    {
        var s = await _masterDb.SolicitudesContratoPlan
            .AsNoTracking()
            .Include(x => x.ClienteEmpresa).ThenInclude(c => c.PlanSaaS)
            .Include(x => x.PlanSaaS)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (s == null)
        {
            return NotFound();
        }

        var tenants = await _masterDb.Tenants
            .AsNoTracking()
            .Where(t => t.ClienteEmpresaId == s.ClienteEmpresaId)
            .Select(t => new { t.Id, t.Subdomain, t.NombreComercialNegocio, t.IsActive })
            .ToListAsync();

        return Ok(new
        {
            s.Id,
            s.Estado,
            s.CreatedAt,
            s.RespondidoEn,
            s.MensajeCliente,
            s.NotasPlataforma,
            s.Subdomain,
            s.TenantId,
            PlanSolicitado = new
            {
                s.PlanSaaS.Id,
                s.PlanSaaS.Nombre,
                s.PlanSaaS.PrecioMensual,
                s.PlanSaaS.DiasDuracionDemo,
                EsDemo = PlanSaaSCicloHelper.EsPlanDemo(s.PlanSaaS)
            },
            Empresa = new
            {
                s.ClienteEmpresa.Id,
                s.ClienteEmpresa.Tipo,
                s.ClienteEmpresa.DocumentoFiscal,
                s.ClienteEmpresa.RazonSocial,
                s.ClienteEmpresa.NombreComercial,
                s.ClienteEmpresa.EmailFacturacion,
                s.ClienteEmpresa.Telefono,
                s.ClienteEmpresa.DireccionFiscal,
                s.ClienteEmpresa.Pais,
                Estado = s.ClienteEmpresa.Estado.ToString(),
                s.ClienteEmpresa.ProximoPago,
                PlanActual = new
                {
                    s.ClienteEmpresa.PlanSaaS.Id,
                    s.ClienteEmpresa.PlanSaaS.Nombre,
                    s.ClienteEmpresa.PlanSaaS.PrecioMensual
                }
            },
            Solicitante = new
            {
                s.SolicitanteNombre,
                s.SolicitanteDni,
                s.SolicitanteEmail
            },
            Negocios = tenants
        });
    }

    [HttpPut("{id:guid}/notas")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> ActualizarNotas(Guid id, [FromBody] NotasSolicitudContratoRequest request)
    {
        var s = await _masterDb.SolicitudesContratoPlan.FindAsync(id);
        if (s == null)
        {
            return NotFound();
        }

        s.NotasPlataforma = string.IsNullOrWhiteSpace(request.NotasPlataforma)
            ? null
            : request.NotasPlataforma.Trim();

        await _masterDb.SaveChangesAsync();
        return Ok(new { mensaje = "Notas actualizadas.", s.Id, s.NotasPlataforma });
    }

    [HttpPost("{id:guid}/aprobar")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> Aprobar(Guid id, [FromBody] AprobarSolicitudContratoRequest? request)
    {
        var s = await _masterDb.SolicitudesContratoPlan
            .Include(x => x.ClienteEmpresa).ThenInclude(c => c.PlanSaaS)
            .Include(x => x.PlanSaaS)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (s == null)
        {
            return NotFound();
        }

        if (s.Estado != EstadoSolicitudContratoPlan.Pendiente)
        {
            return BadRequest(new { error = "EstadoInvalido", mensaje = "La solicitud ya fue atendida." });
        }

        if (!string.IsNullOrWhiteSpace(request?.NotasPlataforma))
        {
            s.NotasPlataforma = request.NotasPlataforma.Trim();
        }

        PlanSaaSCicloHelper.AplicarCicloTrasContrato(s.ClienteEmpresa, s.PlanSaaS);

        s.Estado = EstadoSolicitudContratoPlan.Aprobada;
        s.RespondidoEn = DateTime.UtcNow;

        await _masterDb.SaveChangesAsync();

        return Ok(new
        {
            mensaje = $"Contrato aplicado: «{s.PlanSaaS.Nombre}».",
            s.ClienteEmpresa.Id,
            estado = s.ClienteEmpresa.Estado.ToString(),
            s.ClienteEmpresa.ProximoPago,
            plan = s.PlanSaaS.Nombre,
            solicitudId = s.Id
        });
    }

    [HttpPost("{id:guid}/rechazar")]
    [HasPermission(PermisosApp.PlatformEmpresasModificar)]
    public async Task<IActionResult> Rechazar(Guid id, [FromBody] RechazarSolicitudContratoRequest request)
    {
        var s = await _masterDb.SolicitudesContratoPlan.FindAsync(id);
        if (s == null)
        {
            return NotFound();
        }

        if (s.Estado != EstadoSolicitudContratoPlan.Pendiente)
        {
            return BadRequest(new { error = "EstadoInvalido", mensaje = "La solicitud ya fue atendida." });
        }

        s.Estado = EstadoSolicitudContratoPlan.Rechazada;
        s.RespondidoEn = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.Motivo))
        {
            s.NotasPlataforma = request.Motivo.Trim();
        }

        await _masterDb.SaveChangesAsync();
        return Ok(new { mensaje = "Solicitud rechazada.", solicitudId = s.Id });
    }
}

public class NotasSolicitudContratoRequest
{
    public string? NotasPlataforma { get; set; }
}

public class AprobarSolicitudContratoRequest
{
    public string? NotasPlataforma { get; set; }
}

public class RechazarSolicitudContratoRequest
{
    public string? Motivo { get; set; }
}
