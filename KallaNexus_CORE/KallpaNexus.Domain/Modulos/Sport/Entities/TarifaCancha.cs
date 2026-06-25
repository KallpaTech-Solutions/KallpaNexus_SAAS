using KallpaNexus.Domain.Common;    

namespace KallpaNexus.Domain.Modulos.Sport.Entities
{
    public class TarifaCancha : BaseEntidadSucursal
    {

        public string Nombre { get; set; } = string.Empty; // Ej: "Tarifa Nocturna Fin de Semana"

        // Control de tiempo (Formato 24h, ej: 18, 22)
        public int HoraInicio { get; set; }
        public int HoraFin { get; set; }

        // Flags para días de la semana
        public bool AplicaLunesAViernes { get; set; }
        public bool AplicaFinDeSemana { get; set; }

        public decimal PrecioPorHora { get; set; }

        public bool Activa { get; set; } = true;

        // Propiedades de Navegación
        public ICollection<Cancha> Canchas { get; set; } = new List<Cancha>();
    }
}
