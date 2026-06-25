using KallpaNexus.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Domain.Modulos.Sport.Entities
{
    public class CanchaTarifa : BaseEntidadSucursal
    {
        public Guid CanchaId { get; set; }
        public Cancha Cancha { get; set; } = null!;

        public Guid TarifaCanchaId { get; set; }
        public TarifaCancha TarifaCancha { get; set; } = null!;
    }
}
