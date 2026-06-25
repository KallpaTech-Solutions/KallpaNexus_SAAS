namespace KallpaNexus.Domain.Tenancy;

/// <summary>Solicitud de cambio o contratación de plan SaaS (gestión manual desde plataforma).</summary>
public class SolicitudContratoPlan
{
    public Guid Id { get; set; }
    public Guid ClienteEmpresaId { get; set; }
    public ClienteEmpresa ClienteEmpresa { get; set; } = null!;

    public Guid PlanSaaSId { get; set; }
    public PlanSaaS PlanSaaS { get; set; } = null!;

    public Guid? TenantId { get; set; }
    public string? Subdomain { get; set; }

    public EstadoSolicitudContratoPlan Estado { get; set; } = EstadoSolicitudContratoPlan.Pendiente;
    public string? MensajeCliente { get; set; }
    public string? NotasPlataforma { get; set; }

    public string SolicitanteNombre { get; set; } = string.Empty;
    public string SolicitanteDni { get; set; } = string.Empty;
    public string? SolicitanteEmail { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondidoEn { get; set; }
}
