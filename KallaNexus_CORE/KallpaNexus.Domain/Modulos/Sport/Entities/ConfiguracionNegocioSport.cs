using KallpaNexus.Domain.Common;

namespace KallpaNexus.Domain.Modulos.Sport.Entities;

/// <summary>
/// Ajustes del negocio (un registro por tenant) para WhatsApp y mensajes al cliente.
/// </summary>
public class ConfiguracionNegocioSport : BaseTenantEntity
{
    public string NombreComercial { get; set; } = string.Empty;
    public string? RazonSocial { get; set; }
    /// <summary>WhatsApp del negocio (9 dígitos, solo referencia en panel).</summary>
    public string? TelefonoWhatsAppNegocio { get; set; }
    /// <summary>Plantilla al abrir chat con el cliente. Placeholders: {{nombre}}, {{dni}}, {{cancha}}, {{fecha}}, {{hora}}, {{monto}}, {{negocio}}.</summary>
    public string MensajeWhatsAppReserva { get; set; } = string.Empty;

    /// <summary>Permite solicitudes desde /t/{slug}.</summary>
    public bool ReservaWebActiva { get; set; }

    /// <summary>Minutos que el horario queda retenido al solicitar (15, 30, etc.).</summary>
    public int MinutosHoldWeb { get; set; } = 15;

    /// <summary>Máximo de reservas web activas por DNI y día (Lima).</summary>
    public int MaxReservasWebPorDniPorDia { get; set; } = 3;

    /// <summary>Título en hero de /t/{slug} (si vacío, nombre comercial).</summary>
    public string? TituloWebLanding { get; set; }

    /// <summary>Texto bajo el título en la landing pública.</summary>
    public string? MensajeWebLanding { get; set; }

    /// <summary>Ruta pública relativa, ej. /uploads/{tenantId}/web/hero.jpg</summary>
    public string? ImagenHeroRuta { get; set; }
}
