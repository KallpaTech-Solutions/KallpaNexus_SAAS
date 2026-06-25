// Interfaz interna para el Middleware (Aislamiento de responsabilidades)
namespace KallpaNexus.Domain.Interfaces
{
    public interface ITenantSetter
    {
        void SetTenant(Guid id, string subdomain, string? connectionString);
    }
}
