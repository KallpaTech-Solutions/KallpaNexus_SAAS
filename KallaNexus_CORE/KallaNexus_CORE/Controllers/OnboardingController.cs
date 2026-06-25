using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Application.Tenancy;
using KallpaNexus.Application.Onboarding;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Domain.Tenancy;
using KallpaNexus.Infrastructure.Persistence;
using KallpaNexus.Infrastructure.Platform;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Infrastructure.Integraciones;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers;

[ApiExplorerSettings(GroupName = ApiDocumentationGroups.Public)]
[ApiController]
[Route("api/[controller]")]
public class OnboardingController : ControllerBase
{
    private readonly MasterDbContext _masterDb;
    private readonly ApplicationDbContext _appDb;
    private readonly TenantProvider _tenantProvider;
    private readonly ConsultasIntegracionService _consultas;

    public OnboardingController(
        MasterDbContext masterDb,
        ApplicationDbContext appDb,
        ITenantProvider tenantProvider,
        ConsultasIntegracionService consultas)
    {
        _masterDb = masterDb;
        _appDb = appDb;
        _tenantProvider = (TenantProvider)tenantProvider;
        _consultas = consultas;
    }

    /// <summary>DNI para registro público (Personas / clientes / RENIEC vía Decolecta).</summary>
    [HttpGet("consultar-dni")]
    public async Task<IActionResult> ConsultarDniRegistro([FromQuery] string numero, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(numero))
        {
            return BadRequest(new { error = "Invalido", mensaje = "Indica el número de DNI." });
        }

        var result = await _consultas.ConsultarDniAsync(numero, ct);
        if (result.Encontrado && result.Datos != null)
        {
            return Ok(result.Datos);
        }

        if (result.StatusCode == 404)
        {
            return NotFound(new { error = "NoEncontrado", mensaje = result.Mensaje });
        }

        return StatusCode(
            result.StatusCode > 0 ? result.StatusCode : 502,
            new { error = "ConsultaExterna", mensaje = result.Mensaje });
    }

    /// <summary>Vitrina pública de planes (paso 1 del registro de empresa).</summary>
    [HttpGet("planes")]
    public async Task<IActionResult> ListarPlanes()
    {
        var planes = await _masterDb.PlanesSaaS
            .Where(p => p.Activo)
            .OrderBy(p => p.PrecioMensual)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.PrecioMensual,
                p.LimiteSucursales,
                p.LimiteUsuariosStaff,
                Modulos = new
                {
                    p.SoportaModuloSport,
                    p.SoportaModuloStay,
                    p.SoportaModuloCare,
                    p.SoportaFidelizacionPuntos
                },
                Recomendado = p.PrecioMensual == 0
            })
            .ToListAsync();

        return Ok(new
        {
            Mensaje = "Elige un plan y luego envía su Id en planSaaSId al registrar (o omite planSaaSId para usar el plan demo).",
            Planes = planes
        });
    }

    /// <summary>Catálogo de productos/módulos del ecosistema (marketing).</summary>
    [HttpGet("catalogo")]
    public IActionResult CatalogoProductos()
    {
        return Ok(new
        {
            Productos = new[]
            {
                new { Codigo = "Sport", Nombre = "Nexus Sport", Descripcion = "Canchas, reservas, tarifas por hora.", DisponibleEnPlanes = true },
                new { Codigo = "Stay", Nombre = "Nexus Stay", Descripcion = "Hospedaje y habitaciones (próximamente).", DisponibleEnPlanes = true },
                new { Codigo = "Care", Nombre = "Nexus Care", Descripcion = "Citas y servicios de bienestar (próximamente).", DisponibleEnPlanes = true },
                new { Codigo = "Gear", Nombre = "Nexus Gear", Descripcion = "Alquiler de equipos (próximamente).", DisponibleEnPlanes = false }
            },
            FlujoRegistroEmpresa = new[]
            {
                "1. GET /api/onboarding/planes — ver precios y módulos",
                "2. GET /api/onboarding/verificar-subdominio?subdomain=mi-negocio — validar URL",
                "3. POST /api/onboarding/registrar — crear empresa + tenant + sucursal (planSaaSId opcional)"
            }
        });
    }

    [HttpGet("verificar-subdominio")]
    public async Task<IActionResult> VerificarSubdominio([FromQuery] string subdomain)
    {
        if (string.IsNullOrWhiteSpace(subdomain) || subdomain.Trim().Length < 3)
        {
            return BadRequest(new { error = "SubdominioInvalido", disponible = false });
        }

        var normalizado = subdomain.Trim().ToLowerInvariant();
        var ocupado = await _masterDb.Tenants.AnyAsync(t => t.Subdomain == normalizado);
        return Ok(new
        {
            Subdomain = normalizado,
            Disponible = !ocupado,
            UrlSugerida = $"{normalizado}.localhost"
        });
    }

    [HttpPost("registrar")]
    public async Task<IActionResult> Registrar([FromBody] RegistrarOnboardingRequest request)
    {
        var validacion = ValidarRequest(request);
        if (validacion != null)
        {
            return BadRequest(validacion);
        }

        var subdomain = request.Subdomain.Trim().ToLowerInvariant();

        var planId = await ResolverPlanSaaSIdAsync(request.PlanSaaSId);
        if (planId == null)
        {
            return BadRequest(new { error = "PlanInvalido", mensaje = "No hay plan activo. Contacta a soporte o crea un plan desde plataforma." });
        }

        var documento = request.DocumentoFiscal.Trim();
        if (await _masterDb.ClientesEmpresas.AnyAsync(c => c.DocumentoFiscal == documento))
        {
            return BadRequest(new { error = "DocumentoDuplicado", mensaje = "Ya existe una empresa registrada con ese documento fiscal." });
        }

        if (await _masterDb.Tenants.AnyAsync(t => t.Subdomain == subdomain))
        {
            return BadRequest(new { error = "SubdominioOcupado", mensaje = "El subdominio ya está en uso." });
        }

        await using var masterTx = await _masterDb.Database.BeginTransactionAsync();
        try
        {
            var planOnboarding = await _masterDb.PlanesSaaS.AsNoTracking()
                .FirstAsync(p => p.Id == planId.Value);

            var clienteEmpresa = new ClienteEmpresa
            {
                Tipo = request.Tipo,
                DocumentoFiscal = documento,
                RazonSocial = request.RazonSocial.Trim(),
                NombreComercial = request.NombreComercial.Trim(),
                EmailFacturacion = request.EmailFacturacion.Trim(),
                Telefono = request.Telefono.Trim(),
                DireccionFiscal = request.DireccionFiscal?.Trim(),
                Pais = string.IsNullOrWhiteSpace(request.Pais) ? "Peru" : request.Pais.Trim(),
                PlanSaaSId = planId.Value,
                Estado = EstadoSuscripcion.Demo,
                ProximoPago = PlanSaaSCicloHelper.CalcularFinCiclo(planOnboarding, DateTime.UtcNow)
            };

            var tenant = new KallpaNexus.Domain.Tenancy.Tenant
            {
                Subdomain = subdomain,
                NombreComercialNegocio = request.NombreComercialNegocio.Trim(),
                ConnectionString = string.IsNullOrWhiteSpace(request.ConnectionStringDedicada)
                    ? null
                    : request.ConnectionStringDedicada.Trim(),
                IsActive = true,
                ClienteEmpresa = clienteEmpresa
            };

            _masterDb.ClientesEmpresas.Add(clienteEmpresa);
            _masterDb.Tenants.Add(tenant);
            await _masterDb.SaveChangesAsync();
            await masterTx.CommitAsync();

            _tenantProvider.SetTenant(tenant);

            var sucursal = new Sucursal
            {
                Nombre = string.IsNullOrWhiteSpace(request.NombreSucursalPrincipal)
                    ? "Sucursal Principal"
                    : request.NombreSucursalPrincipal.Trim(),
                Direccion = request.DireccionSucursal.Trim(),
                Telefono = string.IsNullOrWhiteSpace(request.TelefonoSucursal)
                    ? request.Telefono.Trim()
                    : request.TelefonoSucursal.Trim(),
                Activa = true
            };

            _appDb.Sucursales.Add(sucursal);
            await _appDb.SaveChangesAsync();

            await TenantRbacSeeder.SeedRolesInicialesAsync(_appDb, tenant.Id);
            await TenantMediosPagoSeeder.EnsureDefaultsAsync(_appDb, tenant.Id);

            Guid? staffGerenteId = null;
            var dniGerente = request.Tipo == TipoPersona.Empresa
                ? StaffCredencialesHelper.NormalizarDni(request.StaffGerenteDni ?? string.Empty)
                : StaffCredencialesHelper.EsDniValidoParaStaff(
                    StaffCredencialesHelper.NormalizarDni(request.StaffGerenteDni ?? string.Empty))
                    ? StaffCredencialesHelper.NormalizarDni(request.StaffGerenteDni ?? string.Empty)
                    : StaffCredencialesHelper.NormalizarDni(documento);
            var emailGerente = (request.StaffGerenteEmail ?? request.EmailFacturacion).Trim().ToLowerInvariant();

            if (!StaffCredencialesHelper.EsDniValidoParaStaff(dniGerente))
            {
                return BadRequest(new
                {
                    error = "GerenteDniRequerido",
                    mensaje = "No se pudo crear el usuario gerente: DNI inválido."
                });
            }

            if (string.IsNullOrWhiteSpace(emailGerente))
            {
                return BadRequest(new
                {
                    error = "GerenteEmailRequerido",
                    mensaje = "El gerente debe tener correo electrónico."
                });
            }

            var rolGerente = await _appDb.RolesTenant
                .FirstAsync(r => r.Codigo == nameof(RolTenantCodigo.Gerente));
            var staff = new UsuarioStaff
            {
                Dni = dniGerente,
                NombreCompleto = string.IsNullOrWhiteSpace(request.StaffGerenteNombre)
                    ? "Gerente"
                    : request.StaffGerenteNombre.Trim(),
                Email = emailGerente,
                PasswordHash = PlatformPasswordHasher.Hash(dniGerente),
                RolTenantId = rolGerente.Id,
                Activo = true,
                DebeCambiarPassword = true
            };
            _appDb.UsuariosStaff.Add(staff);
            await _appDb.SaveChangesAsync();
            staffGerenteId = staff.Id;

            return Ok(new
            {
                Mensaje = "Onboarding completado: empresa, tenant y sucursal principal creados.",
                ClienteEmpresaId = clienteEmpresa.Id,
                TenantId = tenant.Id,
                Subdomain = tenant.Subdomain,
                UrlOperativa = $"{tenant.Subdomain}.localhost",
                SucursalPrincipalId = sucursal.Id,
                PlanSaaSId = clienteEmpresa.PlanSaaSId,
                ModoRegistro = request.PlanSaaSId.HasValue ? "PlanElegido" : "PlanDemoPorDefecto",
                StaffGerenteId = staffGerenteId,
                LoginStaff = staffGerenteId.HasValue
                    ? $"POST https://{tenant.Subdomain}.localhost/api/tenant/auth/login (o X-Tenant-Subdomain: {tenant.Subdomain} en localhost)"
                    : null
            });
        }
        catch
        {
            await masterTx.RollbackAsync();
            throw;
        }
    }

    private static object? ValidarRequest(RegistrarOnboardingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RazonSocial) ||
            string.IsNullOrWhiteSpace(request.NombreComercial) ||
            string.IsNullOrWhiteSpace(request.EmailFacturacion) ||
            string.IsNullOrWhiteSpace(request.Telefono))
        {
            return new { error = "DatosIncompletos", mensaje = "Razón social, nombre comercial, email y teléfono son obligatorios." };
        }

        var doc = request.DocumentoFiscal?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(doc))
        {
            return new { error = "DocumentoRequerido", mensaje = "Debe indicar DNI o RUC en documento fiscal." };
        }

        if (request.Tipo == TipoPersona.Empresa && doc.Length < 11)
        {
            return new { error = "RucInvalido", mensaje = "Para empresa se espera un RUC válido (11 dígitos en Perú)." };
        }

        if (request.Tipo == TipoPersona.PersonaNatural && doc.Length < 8)
        {
            return new { error = "DniInvalido", mensaje = "Para persona natural se espera un DNI válido (8 dígitos)." };
        }

        var dniGerenteInput = StaffCredencialesHelper.NormalizarDni(request.StaffGerenteDni ?? string.Empty);
        if (request.Tipo == TipoPersona.Empresa)
        {
            if (!StaffCredencialesHelper.EsDniValidoParaStaff(dniGerenteInput))
            {
                return new
                {
                    error = "GerenteDniRequerido",
                    mensaje = "Si registras una empresa (RUC), debes indicar el DNI de 8 dígitos de la persona gerente. No uses el RUC como DNI."
                };
            }
        }
        else
        {
            var dniEfectivo = StaffCredencialesHelper.EsDniValidoParaStaff(dniGerenteInput)
                ? dniGerenteInput
                : StaffCredencialesHelper.NormalizarDni(doc);
            if (!StaffCredencialesHelper.EsDniValidoParaStaff(dniEfectivo))
            {
                return new
                {
                    error = "GerenteDniRequerido",
                    mensaje = "Indica el DNI del gerente que accederá al panel (8 dígitos)."
                };
            }
        }

        var emailGerente = (request.StaffGerenteEmail ?? request.EmailFacturacion)?.Trim();
        if (string.IsNullOrWhiteSpace(emailGerente))
        {
            return new { error = "GerenteEmailRequerido", mensaje = "El gerente debe tener un correo para iniciar sesión." };
        }

        if (string.IsNullOrWhiteSpace(request.Subdomain) || request.Subdomain.Length < 3)
        {
            return new { error = "SubdominioInvalido", mensaje = "El subdominio debe tener al menos 3 caracteres." };
        }

        if (!request.Subdomain.All(c => char.IsLetterOrDigit(c) || c == '-'))
        {
            return new { error = "SubdominioInvalido", mensaje = "El subdominio solo puede usar letras, números y guiones." };
        }

        if (string.IsNullOrWhiteSpace(request.NombreComercialNegocio))
        {
            return new { error = "NegocioInvalido", mensaje = "El nombre comercial del negocio operativo es obligatorio." };
        }

        return null;
    }

    private async Task<Guid?> ResolverPlanSaaSIdAsync(Guid? planSolicitado)
    {
        if (planSolicitado.HasValue && planSolicitado.Value != Guid.Empty)
        {
            var existe = await _masterDb.PlanesSaaS.AnyAsync(p => p.Id == planSolicitado.Value && p.Activo);
            return existe ? planSolicitado.Value : null;
        }

        var demoId = await _masterDb.PlanesSaaS
            .Where(p => p.Activo)
            .OrderBy(p => p.PrecioMensual)
            .Select(p => p.Id)
            .FirstOrDefaultAsync();

        return demoId == Guid.Empty ? null : demoId;
    }
}
