using KallpaNexus.Domain.Common;
using KallpaNexus.Infrastructure.Auth;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace KallpaNexus.API.Infrastructure.Security;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class HasTenantPermissionAttribute : AuthorizeAttribute, IAuthorizationFilter
{
    private readonly string _permisoRequerido;

    public HasTenantPermissionAttribute(string permisoRequerido)
    {
        _permisoRequerido = permisoRequerido;
        AuthenticationSchemes = TenantStaffJwtService.SchemeName;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        if (!user.HasClaim(AuthClaims.ActorType, AuthClaims.ActorTenantStaff))
        {
            context.Result = Forbidden("Token no válido para operaciones del negocio.");
            return;
        }

        var rbac = context.HttpContext.RequestServices.GetRequiredService<TenantRbacService>();
        if (!rbac.TokenCoincideConTenantActual(user))
        {
            context.Result = Forbidden("El token no corresponde al tenant de esta URL.");
            return;
        }

        var permisos = user.FindAll(AuthClaims.Permiso).Select(c => c.Value);
        if (!permisos.Contains(_permisoRequerido))
        {
            context.Result = Forbidden($"No tienes el permiso requerido: '{_permisoRequerido}'");
        }
    }

    private static ObjectResult Forbidden(string mensaje) =>
        new(new { error = "Prohibido", mensaje }) { StatusCode = StatusCodes.Status403Forbidden };
}
