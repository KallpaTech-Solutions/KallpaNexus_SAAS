using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Application.Modulos.Sport.Canchas.DTOs
{
    public class CanchaDto
    {
        public Guid Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string TipoCancha { get; set; } = string.Empty;
        public bool TieneIluminacion { get; set; }
        public bool EstaActiva { get; set; }
        public Guid SucursalId { get; set; }
        public string NombreSucursal { get; set; } = string.Empty;
    }
}
