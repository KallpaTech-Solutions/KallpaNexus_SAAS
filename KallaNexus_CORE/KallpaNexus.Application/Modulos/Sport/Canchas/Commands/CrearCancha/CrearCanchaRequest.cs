using KallpaNexus.Domain.Modulos.Sport.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Application.Modulos.Sport.Canchas.Commands.CrearCancha
{
    public class CrearCanchaRequest
    {
        public Guid SucursalId { get; set; } // A qué sede pertenece
        public string Nombre { get; set; } = string.Empty;
        public TipoCancha Tipo { get; set; } // El Enum: Futbol, Paddle, etc.
        public bool TieneIluminacion { get; set; }
    }
}
