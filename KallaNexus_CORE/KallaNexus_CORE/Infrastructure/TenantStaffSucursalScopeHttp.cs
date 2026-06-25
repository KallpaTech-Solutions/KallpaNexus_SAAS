using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;

namespace KallpaNexus.API.Infrastructure;

public static class TenantStaffSucursalScopeHttp
{
    public static IActionResult ToActionResult(this TenantStaffSucursalScopeError error) =>
        new ObjectResult(new { error = error.Error, mensaje = error.Mensaje })
        {
            StatusCode = error.StatusCode,
        };
}
