using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Application.Modulos.Sport.Canchas.Commands.CrearTarifa
{
    public class CrearTarifaSueltaRequest
    {
        public Guid SucursalId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public int HoraInicio { get; set; }
        public int HoraFin { get; set; }
        public bool AplicaLunesAViernes { get; set; }
        public bool AplicaFinDeSemana { get; set; }
        public decimal PrecioPorHora { get; set; }
    }
}
