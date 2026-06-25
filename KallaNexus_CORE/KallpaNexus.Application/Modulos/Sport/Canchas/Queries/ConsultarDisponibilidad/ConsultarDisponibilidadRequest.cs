using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Application.Modulos.Sport.Canchas.Queries.ConsultarDisponibilidad
{
    public class ConsultarDisponibilidadRequest
    {
        public Guid CanchaId { get; set; }
        public DateTime Fecha { get; set; } // El día que el usuario quiere jugar
    }
}
