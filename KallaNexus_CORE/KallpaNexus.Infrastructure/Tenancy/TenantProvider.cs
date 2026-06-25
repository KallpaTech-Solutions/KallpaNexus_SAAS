using Microsoft.AspNetCore.Http;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Tenancy;

namespace KallpaNexus.Infrastructure.Tenancy
{
    public class TenantProvider : ITenantProvider, ITenantSetter
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private Tenant? _currentTenant;

        public TenantProvider(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        // Método para que el Middleware guarde al Tenant detectado
        public void SetTenant(Tenant tenant) => _currentTenant = tenant;

        // AHORA SÍ: Coincide con Guid? de la interfaz
        public Guid? GetTenantId() => _currentTenant?.Id;

        // AHORA SÍ: Implementamos el subdominio por separado
        public string? GetSubdomain() => _currentTenant?.Subdomain;

        public string? GetConnectionString() => _currentTenant?.ConnectionString;
    }

    // Interfaz auxiliar para el Middleware (opcional pero recomendada para limpieza)
    public interface ITenantSetter
    {
        void SetTenant(Tenant tenant);
    }
}