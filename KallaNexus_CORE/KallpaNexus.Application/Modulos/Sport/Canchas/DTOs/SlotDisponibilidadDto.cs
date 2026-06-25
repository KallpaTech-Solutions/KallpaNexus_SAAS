using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Application.Modulos.Sport.Canchas.DTOs
{
    public class SlotDisponibilidadDto
    {
        public int HoraInicio { get; set; } // Ej: 18 (Significa de 18:00 a 19:00)
        public string HorarioTexto { get; set; } = string.Empty; // Ej: "06:00 PM - 07:00 PM"
        public bool EstaDisponible { get; set; }
        public decimal Precio { get; set; } // 💸 Calculado dinámicamente de tu catálogo
        public string TarifaAplicada { get; set; } = string.Empty; // Ej: "Tarifa Nocturna Prime"
    }
}
