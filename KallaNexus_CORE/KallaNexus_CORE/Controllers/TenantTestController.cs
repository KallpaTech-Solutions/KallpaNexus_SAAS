using Microsoft.AspNetCore.Mvc;
using KallpaNexus.Domain.Interfaces;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

using KallpaNexus.API.Swagger;

namespace KallpaNexus.API.Controllers
{
    [ApiExplorerSettings(GroupName = ApiDocumentationGroups.Dev)]
    [Route("api/[controller]")]
    [ApiController]
    public class TenantTestController : ControllerBase
    {
        private readonly ITenantProvider _tenantProvider;

        public TenantTestController(ITenantProvider tenantProvider)
        {
            _tenantProvider = tenantProvider;
        }

        [HttpGet("info")]
        public IActionResult GetTenantInfo()
        {
            // Obtenemos el Guid y el Subdominio (que ahora tienes ambos en el provider)
            var tenantId = _tenantProvider.GetTenantId();
            var subdominio = _tenantProvider.GetSubdomain();

            return Ok(new
            {
                Status = "Online",
                // Convertimos el Guid a string con ?.ToString() para que sea compatible con el texto
                TenantId = tenantId?.ToString() ?? "Sin ID (Master)",
                Subdominio = subdominio ?? "Contexto Maestro",
                Mensaje = "Conexión exitosa con Kallpa Nexus"
            });
        }
    }
}
