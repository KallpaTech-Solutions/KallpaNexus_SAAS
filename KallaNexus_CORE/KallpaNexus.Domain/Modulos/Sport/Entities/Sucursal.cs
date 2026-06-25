using KallpaNexus.Domain.Common;
namespace KallpaNexus.Domain.Modulos.Sport.Entities
{
    /// <summary>
    /// Representa una sede o local físico del cliente (ej: Sede Tingo María, Sede Huánuco).
    /// </summary>
    public class Sucursal : BaseTenantEntity
    {
        public string Nombre { get; set; } = string.Empty;
        public string Direccion { get; set; } = string.Empty;
        /// <summary>Ciudad o distrito para etiquetas de horario en el panel (opcional).</summary>
        public string? Ciudad { get; set; }
        /// <summary>Teléfono para llamadas.</summary>
        public string Telefono { get; set; } = string.Empty;
        /// <summary>WhatsApp del local (opcional).</summary>
        public string? TelefonoWhatsApp { get; set; }
        public bool Activa { get; set; } = true;

        /// <summary>Coordenadas del local (mapa / landing).</summary>
        public double? Latitud { get; set; }
        public double? Longitud { get; set; }

        /// <summary>Enlace Compartir de Google Maps (navegación GPS).</summary>
        public string? EnlaceGoogleMaps { get; set; }

        // Relación: Una sucursal tiene muchas canchas
        public ICollection<Cancha> Canchas { get; set; } = new List<Cancha>();
    }
}
