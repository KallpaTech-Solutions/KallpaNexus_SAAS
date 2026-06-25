using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Enums;
using KallpaNexus.Domain.Entities.Compartido;

namespace KallpaNexus.Domain.Modulos.Sport.Entities
{
    /// <summary>
    /// El corazón transaccional. Registra el alquiler de una cancha en un bloque de tiempo.
    /// </summary>
    public class Reserva : BaseEntidadSucursal
    {
        public Guid CanchaId { get; set; }
        public Cancha Cancha { get; set; } = null!;
        // 👤 VÍNCULO GLOBAL UNIFICADO
        public Guid ClienteId { get; set; }
        public Cliente Cliente { get; set; } = null!;

        /// <summary>Nombre usado en esta reserva (importante para DNI 123 / cliente varios).</summary>
        public string? NombreClienteReserva { get; set; }

        public DateTime HoraInicio { get; set; }
        public DateTime HoraFin { get; set; }

        public EstadoReserva Estado { get; set; } = EstadoReserva.Pendiente;
        public OrigenReserva Origen { get; set; } = OrigenReserva.Panel;
        /// <summary>Solo web: hasta cuándo el horario queda retenido sin confirmación del gerente.</summary>
        public DateTime? HoldExpiraEnUtc { get; set; }
        public decimal MontoTotal { get; set; }
        public string? Observaciones { get; set; }

        public ICollection<ReservaProductoSolicitado> ProductosSolicitados { get; set; } =
            new List<ReservaProductoSolicitado>();
        /// <summary>Al cancelar: si se devolvió adelanto al cliente.</summary>
        public bool? AdelantoDevuelto { get; set; }
        public DateTime? CanceladaEnUtc { get; set; }
        /// <summary>Varias horas en un mismo envío web (misma solicitud).</summary>
        public Guid? GrupoSolicitudWebId { get; set; }
    }
}
