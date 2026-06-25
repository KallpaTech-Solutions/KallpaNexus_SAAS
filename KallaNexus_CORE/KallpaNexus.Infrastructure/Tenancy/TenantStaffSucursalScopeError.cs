namespace KallpaNexus.Infrastructure.Tenancy;

/// <summary>Error de alcance por sucursal (sin dependencias de ASP.NET MVC).</summary>
public sealed record TenantStaffSucursalScopeError(string Error, string Mensaje, int StatusCode);
