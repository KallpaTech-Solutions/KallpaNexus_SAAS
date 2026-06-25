
namespace KallpaNexus.Domain.Common
{
    public abstract class BaseTenantEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; } // El "muro" de seguridad entre clientes
    }
}
