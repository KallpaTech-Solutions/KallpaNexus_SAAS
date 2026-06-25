using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Enums;
namespace KallpaNexus.Domain.Modulos.Sport.Entities
{
    /// <summary>
    /// Representa el espacio deportivo que se alquila (ej: Cancha Maracaná, Campo de Padel 1).
    /// </summary>
    public class Cancha : BaseEntidadSucursal
    {
        public string Nombre { get; set; } = string.Empty;
        public TipoCancha Tipo { get; set; }
        public bool TieneIluminacion { get; set; } // Clave para tu feature de luz automática IoT
        public bool EstaActiva { get; set; } = true;

        /// <summary>Ruta relativa bajo /uploads/… para la landing; null = imagen por defecto del front.</summary>
        public string? ImagenWebRuta { get; set; }

        // Propiedad de navegación para EF Core
        public Sucursal Sucursal { get; set; } = null!;
        public ICollection<TarifaCancha> Tarifas { get; set; } = new List<TarifaCancha>();
    }
}
