using System;
using System.Collections.Generic;
using System.Text;

namespace KallpaNexus.Domain.Interfaces
{
    public interface ITenantProvider
    {
        
        Guid? GetTenantId(); //para queries de base de datos, etc.
        string? GetSubdomain(); //para mostrar en UI, logs, etc.

        string? GetConnectionString(); //para que el DbContext sepa a qué base de datos conectarse
    }
}
