using System;
using System.Collections.Generic;
using KallpaNexus.Domain.Common;
using KallpaNexus.Domain.Modulos.Sport.Entities;

namespace KallpaNexus.Domain.Entities.Compartido
{
    /// <summary>
    /// Entidad Núcleo Global del Ecosistema Kallpa Nexus.
    /// Representa a la persona real consumidora del negocio, aislada por Tenant.
    /// </summary>
    public class Cliente : BaseTenantEntity
    {
        public string Dni { get; set; } = string.Empty;
        public string NombreCompleto { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;
        public string? Email { get; set; }
        public bool Activo { get; set; } = true;

        /// <summary>Cuenta global B2C (admin.UsuariosConsumidor). Null = solo walk-in / POS.</summary>
        public Guid? UsuarioConsumidorId { get; set; }

        // Propiedades de Navegación Cruzada a Módulos
        public ICollection<Reserva> Reservas { get; set; } = new List<Reserva>();

        // Aquí colgarán en el futuro: public PerfilStay? PerfilStay { get; set; }
    }
}
