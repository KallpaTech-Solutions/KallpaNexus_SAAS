namespace KallpaNexus.Domain.Tenancy;

/// <summary>
/// Cliente SaaS que contrata y paga Kallpa Nexus (persona natural o empresa legal).
/// </summary>
public class ClienteEmpresa
{
    public Guid Id { get; set; }
    public TipoPersona Tipo { get; set; }

    /// <summary>RUC (empresa) o DNI (persona natural).</summary>
    public string DocumentoFiscal { get; set; } = string.Empty;
    public string RazonSocial { get; set; } = string.Empty;
    public string NombreComercial { get; set; } = string.Empty;

    public string EmailFacturacion { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? DireccionFiscal { get; set; }
    public string Pais { get; set; } = "Peru";

    public Guid PlanSaaSId { get; set; }
    public PlanSaaS PlanSaaS { get; set; } = null!;
    public EstadoSuscripcion Estado { get; set; } = EstadoSuscripcion.Demo;
    public DateTime ProximoPago { get; set; }

    /// <summary>Si tiene valor, sustituye el límite del plan (0 = ilimitado).</summary>
    public int? LimiteSucursalesOverride { get; set; }

    public int? LimiteUsuariosStaffOverride { get; set; }

    /// <summary>Máximo de canchas activas por negocio (tenant). Null = sin tope extra.</summary>
    public int? LimiteCanchasOverride { get; set; }

    /// <summary>Precio mensual pactado; null = precio del plan.</summary>
    public decimal? PrecioMensualAcordado { get; set; }

    /// <summary>Si false, la plataforma bloquea reservas web aunque el tenant las active.</summary>
    public bool ReservaWebPermitida { get; set; } = true;

    public ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();

    /// <summary>Quita overrides admin; los límites efectivos pasan a ser los del <see cref="PlanSaaS"/>.</summary>
    public void RestablecerLimitesPersonalizados()
    {
        LimiteSucursalesOverride = null;
        LimiteUsuariosStaffOverride = null;
        LimiteCanchasOverride = null;
        PrecioMensualAcordado = null;
    }
}
