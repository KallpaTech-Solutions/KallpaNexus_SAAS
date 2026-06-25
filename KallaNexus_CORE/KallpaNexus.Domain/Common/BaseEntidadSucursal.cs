using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Domain.Common
{
    /// <summary>
    /// Clase base para cualquier tabla que pertenezca a una sucursal específica.
    /// Garantiza el aislamiento por Empresa (TenantId) y por Local (SucursalId).
    /// </summary>
    public abstract class BaseEntidadSucursal : BaseTenantEntity
    {
        public Guid SucursalId { get; set; }
    }
}
