using KallpaNexus.Domain.Common;
using KallpaNexus.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace KallpaNexus.API.Infrastructure.Security;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public class HasPermissionAttribute : AuthorizeAttribute, IAuthorizationFilter
{
    private readonly string _permisoRequerido;

    public HasPermissionAttribute(string permisoRequerido)
    {
        _permisoRequerido = permisoRequerido;
        AuthenticationSchemes = PlatformJwtService.SchemeName;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        if (!user.HasClaim(AuthClaims.ActorType, AuthClaims.ActorPlatform))
        {
            context.Result = new ObjectResult(new
            {
                error = "Prohibido",
                mensaje = "Token no válido para operaciones de plataforma."
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        var permisosUsuario = user.FindAll(AuthClaims.Permiso).Select(c => c.Value);
        if (!permisosUsuario.Contains(_permisoRequerido))
        {
            context.Result = new ObjectResult(new
            {
                error = "Prohibido",
                mensaje = $"No tienes el permiso requerido: '{_permisoRequerido}'"
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
