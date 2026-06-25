using KallpaNexus.Domain.Tenancy;

namespace KallpaNexus.Application.Onboarding;

public class RegistrarOnboardingRequest
{
    // --- ClienteEmpresa (quien paga) ---
    public TipoPersona Tipo { get; set; }
    public string DocumentoFiscal { get; set; } = string.Empty;
    public string RazonSocial { get; set; } = string.Empty;
    public string NombreComercial { get; set; } = string.Empty;
    public string EmailFacturacion { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? DireccionFiscal { get; set; }
    public string Pais { get; set; } = "Peru";
    /// <summary>Opcional en registro público: si no se envía, se asigna el plan demo activo.</summary>
    public Guid? PlanSaaSId { get; set; }

    // --- Tenant (unidad operativa / subdominio) ---
    public string Subdomain { get; set; } = string.Empty;
    public string NombreComercialNegocio { get; set; } = string.Empty;
    public string? ConnectionStringDedicada { get; set; }

    // --- Sucursal principal (siempre se crea una) ---
    public string NombreSucursalPrincipal { get; set; } = "Sucursal Principal";
    public string DireccionSucursal { get; set; } = string.Empty;
    public string TelefonoSucursal { get; set; } = string.Empty;

    /// <summary>Primer usuario gerente del negocio (recomendado).</summary>
    public string? StaffGerenteDni { get; set; }
    public string? StaffGerenteEmail { get; set; }
    public string? StaffGerenteNombre { get; set; }
}
