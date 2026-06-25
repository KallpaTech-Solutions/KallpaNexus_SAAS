using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Application.Modulos.Sport.Canchas.Commands.CrearTarifa
{
    public class AsignarTarifaRequest
    {
        public Guid TarifaCanchaId { get; set; }
        public Guid CanchaId { get; set; }
        /// <summary>Si true, quita todas las tarifas previas de la cancha y deja solo la seleccionada.</summary>
        public bool ReemplazarTodasEnCancha { get; set; }
    }
}
