using KallpaNexus.API.Infrastructure.Security;
using KallpaNexus.Domain.Common;
using KallpaNexus.Application.Modulos.Sport.Canchas.Commands.ActualizarCancha;
using KallpaNexus.Application.Modulos.Sport.Canchas.Commands.CrearCancha;
using KallpaNexus.Application.Modulos.Sport.Canchas.DTOs;
using KallpaNexus.Application.Modulos.Sport.Common;
using KallpaNexus.Application.Modulos.Sport.Reservas;
using KallpaNexus.Domain.Modulos.Sport.Entities;
using KallpaNexus.API.Swagger;
using KallpaNexus.API.Infrastructure;
using KallpaNexus.API.Media;
using KallpaNexus.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KallpaNexus.API.Controllers.NexusSport
{
    [ApiExplorerSettings(GroupName = ApiDocumentationGroups.TenantSport)]
    [Route("api/[controller]")]
    [ApiController]
    public class CanchasController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly TenantStaffSucursalScopeService _sucursalScope;
        private readonly TenantWebMediaService _media;

        public CanchasController(
            ApplicationDbContext context,
            TenantStaffSucursalScopeService sucursalScope,
            TenantWebMediaService media)
        {
            _context = context;
            _sucursalScope = sucursalScope;
            _media = media;
        }

        [HttpPost]
        [HasTenantPermission(PermisosApp.CanchasCrear)]
        public async Task<IActionResult> Crear(CrearCanchaRequest request)
        {
            // 1. VALIDACIÓN MULTI-TENANT CRÍTICA:
            // Verificamos si la sucursal enviada existe en el contexto del Tenant actual.
            // Si el usuario intenta hackear el JSON enviando una SucursalId de otra empresa,
            // EF Core no la encontrará porque el filtro global ya está aislando las sucursales.
            var sucursalExiste = await _context.Sucursales.AnyAsync(s => s.Id == request.SucursalId);

            if (!sucursalExiste)
            {
                return BadRequest(new { error = "SucursalNoValida", mensaje = "La sucursal especificada no existe o no pertenece a tu cuenta." });
            }

            var errorAlcance = await _sucursalScope.ValidarAccesoSucursalAsync(User, request.SucursalId);
            if (errorAlcance != null)
            {
                return errorAlcance.ToActionResult();
            }

            var cancha = new Cancha
            {
                SucursalId = request.SucursalId,
                Nombre = request.Nombre.Trim(),
                Tipo = request.Tipo,
                TieneIluminacion = request.TieneIluminacion
                // Nota: Id se autogenera, TenantId lo clava el SaveChangesAsync automáticamente.
            };

            _context.Canchas.Add(cancha);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Mensaje = "Cancha registrada con éxito.",
                CanchaId = cancha.Id
            });
        }
        
        [HttpGet]
        [HasTenantPermission(PermisosApp.CanchasVer)]
        public async Task<IActionResult> ObtenerTodas([FromQuery] Guid? sucursalId)
        {
            var query = _context.Canchas.AsQueryable();
            var (queryAlcance, errorAlcance) = await _sucursalScope.AplicarAlcanceCanchasAsync(
                User,
                query,
                sucursalId);
            if (errorAlcance != null)
            {
                return errorAlcance.ToActionResult();
            }

            var canchas = await queryAlcance!
                .Select(c => new
                {
                    c.Id,
                    c.Nombre,
                    TipoCancha = c.Tipo.ToString(),
                    c.TieneIluminacion,
                    c.EstaActiva,
                    NombreSucursal = c.Sucursal.Nombre,
                    c.SucursalId,
                    imagenWebUrl = c.ImagenWebRuta,
                })
                .ToListAsync();

            return Ok(canchas);
        }

        [HttpGet("{canchaId:guid}")]
        [HasTenantPermission(PermisosApp.CanchasVer)]
        public async Task<IActionResult> ObtenerPorId(Guid canchaId)
        {
            var cancha = await _context.Canchas
                .Where(c => c.Id == canchaId)
                .Select(c => new
                {
                    c.Id,
                    c.Nombre,
                    TipoCancha = c.Tipo.ToString(),
                    c.TieneIluminacion,
                    c.EstaActiva,
                    NombreSucursal = c.Sucursal.Nombre,
                    c.SucursalId,
                    imagenWebUrl = c.ImagenWebRuta,
                })
                .FirstOrDefaultAsync();

            if (cancha == null)
            {
                return NotFound(new { error = "NoEncontrado", mensaje = "La cancha solicitada no existe en tu cuenta." });
            }

            var errorAlcance = await _sucursalScope.ValidarAccesoCanchaAsync(User, canchaId);
            if (errorAlcance != null)
            {
                return errorAlcance.ToActionResult();
            }

            return Ok(cancha);
        }

        [HttpPut("{canchaId:guid}")]
        [HasTenantPermission(PermisosApp.CanchasModificar)]
        public async Task<IActionResult> Actualizar(Guid canchaId, [FromBody] ActualizarCanchaRequest request)
        {
            var cancha = await _context.Canchas.FirstOrDefaultAsync(c => c.Id == canchaId);
            if (cancha == null)
            {
                return NotFound(new { error = "NoEncontrado", mensaje = "La cancha solicitada no existe en tu cuenta." });
            }

            var errorAlcance = await _sucursalScope.ValidarAccesoCanchaAsync(User, canchaId);
            if (errorAlcance != null)
            {
                return errorAlcance.ToActionResult();
            }

            if (request.SucursalId.HasValue)
            {
                var sucursalExiste = await _context.Sucursales.AnyAsync(s => s.Id == request.SucursalId.Value);
                if (!sucursalExiste)
                {
                    return BadRequest(new { error = "SucursalNoValida", mensaje = "La sucursal especificada no existe o no pertenece a tu cuenta." });
                }

                var errorNuevaSede = await _sucursalScope.ValidarAccesoSucursalAsync(User, request.SucursalId.Value);
                if (errorNuevaSede != null)
                {
                    return errorNuevaSede.ToActionResult();
                }

                cancha.SucursalId = request.SucursalId.Value;
            }

            if (!string.IsNullOrWhiteSpace(request.Nombre))
            {
                cancha.Nombre = request.Nombre.Trim();
            }

            if (request.Tipo.HasValue)
            {
                cancha.Tipo = request.Tipo.Value;
            }

            if (request.TieneIluminacion.HasValue)
            {
                cancha.TieneIluminacion = request.TieneIluminacion.Value;
            }

            if (request.EstaActiva.HasValue)
            {
                cancha.EstaActiva = request.EstaActiva.Value;
            }

            await _context.SaveChangesAsync();

            return Ok(new { Mensaje = "Cancha actualizada con éxito.", CanchaId = cancha.Id });
        }

        [HttpDelete("{canchaId:guid}")]
        [HasTenantPermission(PermisosApp.CanchasModificar)]
        public async Task<IActionResult> Eliminar(Guid canchaId)
        {
            var cancha = await _context.Canchas.FirstOrDefaultAsync(c => c.Id == canchaId);
            if (cancha == null)
            {
                return NotFound(new { error = "NoEncontrado", mensaje = "La cancha solicitada no existe en tu cuenta." });
            }

            var errorAlcance = await _sucursalScope.ValidarAccesoCanchaAsync(User, canchaId);
            if (errorAlcance != null)
            {
                return errorAlcance.ToActionResult();
            }

            var tieneReservasFuturas = await _context.Reservas.AnyAsync(r =>
                r.CanchaId == canchaId &&
                r.HoraFin > DateTime.UtcNow &&
                (r.Estado == Domain.Modulos.Sport.Enums.EstadoReserva.Pendiente ||
                 r.Estado == Domain.Modulos.Sport.Enums.EstadoReserva.Confirmada));

            if (tieneReservasFuturas)
            {
                cancha.EstaActiva = false;
                await _context.SaveChangesAsync();
                return Ok(new
                {
                    Mensaje = "La cancha tiene reservas activas; se desactivó en lugar de eliminarse.",
                    CanchaId = cancha.Id,
                    EstaActiva = cancha.EstaActiva
                });
            }

            _context.Canchas.Remove(cancha);
            await _context.SaveChangesAsync();

            return Ok(new { Mensaje = "Cancha eliminada con éxito.", CanchaId = canchaId });
        }

        [HttpGet("{canchaId}/disponibilidad")]
        [HasTenantPermission(PermisosApp.ReservasVer)]
        public async Task<IActionResult> ConsultarDisponibilidad(Guid canchaId, [FromQuery] DateTime fecha)
        {
            var errorAlcance = await _sucursalScope.ValidarAccesoCanchaAsync(User, canchaId);
            if (errorAlcance != null)
            {
                return errorAlcance.ToActionResult();
            }

            var cancha = await _context.Canchas
                .Include(c => c.Sucursal)
                .FirstOrDefaultAsync(c => c.Id == canchaId);

            if (cancha == null)
            {
                return NotFound(new { error = "NoEncontrado", mensaje = "La cancha solicitada no existe en tu cuenta." });
            }

            var fechaInicioDia = SportTimeHelper.EnsureUtc(
                SportTimeHelper.ToUtcFromLimaLocal(SportTimeHelper.DiaCalendarioLimaDesdeQuery(fecha)));
            var fechaFinDia = SportTimeHelper.EnsureUtc(
                SportTimeHelper.ToUtcFromLimaLocal(
                    SportTimeHelper.DiaCalendarioLimaDesdeQuery(fecha).AddDays(1).AddTicks(-1)));

            var reservasDelDia = await _context.Reservas
                .Include(r => r.Cliente)
                .Where(r => r.CanchaId == canchaId &&
                            r.HoraInicio < fechaFinDia &&
                            r.HoraFin > fechaInicioDia &&
                            (r.Estado == Domain.Modulos.Sport.Enums.EstadoReserva.Confirmada ||
                             r.Estado == Domain.Modulos.Sport.Enums.EstadoReserva.Pendiente))
                .ToListAsync();

            var utcNow = DateTime.UtcNow;

            var reservasOcupadas = new List<(int HoraInicioInt, int HoraFinInt)>();
            foreach (var r in reservasDelDia)
            {
                if (!ReservaHorarioBloqueo.ReservaBloqueaHorario(r, utcNow))
                {
                    continue;
                }

                reservasOcupadas.Add((
                    SportTimeHelper.ToLima(r.HoraInicio).Hour,
                    SportTimeHelper.ToLima(r.HoraFin).Hour));
            }

            // 3. Extraer el catálogo de tarifas asociadas a esta cancha específica
            var tarifasCancha = await _context.Set<TarifaCancha>()
                .Where(t => t.Canchas.Any(c => c.Id == canchaId) && t.Activa)
                .ToListAsync();

            var diaCalendario = SportTimeHelper.DiaCalendarioLimaDesdeQuery(fecha);
            bool esFinDeSemana = SportTimeHelper.EsFinDeSemana(diaCalendario);

            // 5. CONSTRUIR LA MATRIZ OPERATIVA (Ej: El complejo abre de 06:00 AM a 11:00 PM)
            var listaSlots = new List<SlotDisponibilidadDto>();
            int horaApertura = 6;
            int horaCierre = 23;

            for (int hora = horaApertura; hora < horaCierre; hora++)
            {
                // A. 🛠️ SOLUCIÓN AL ERROR: Ahora comparamos el 'int' del bucle con los enteros extraídos (.Hour)
                bool estaOcupado = reservasOcupadas.Any(r => hora >= r.HoraInicioInt && hora < r.HoraFinInt);

                // B. Buscar la tarifa dinámica que encaje perfectamente con esta hora y este día
                var tarifaMatch = SportTarifaMatcher.BuscarTarifa(tarifasCancha, hora, esFinDeSemana);

                decimal precioFinal = tarifaMatch?.PrecioPorHora ?? 0;
                string nombreTarifa = tarifaMatch?.Nombre ?? "Sin Tarifa Asignada (No Disponible)";

                // Damos formato visual al rango de hora para facilitarle la vida al Flutter
                string ampmInicio = hora >= 12 ? "PM" : "AM";
                int hora12Inicio = hora > 12 ? hora - 12 : (hora == 0 ? 12 : hora);

                string ampmFin = (hora + 1) >= 12 ? "PM" : "AM";
                int hora12Fin = (hora + 1) > 12 ? (hora + 1) - 12 : (hora + 1);

                listaSlots.Add(new SlotDisponibilidadDto
                {
                    HoraInicio = hora,
                    HorarioTexto = $"{hora12Inicio:D2}:00 {ampmInicio} - {hora12Fin:D2}:00 {ampmFin}",
                    EstaDisponible = !estaOcupado && tarifaMatch != null,
                    Precio = precioFinal,
                    TarifaAplicada = nombreTarifa
                });
            }

            return Ok(listaSlots);
        }

        [HttpPost("{canchaId:guid}/imagen-web")]
        [HasTenantPermission(PermisosApp.CanchasModificar)]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> SubirImagenWeb(Guid canchaId, IFormFile file)
        {
            var cancha = await _context.Canchas.FirstOrDefaultAsync(c => c.Id == canchaId);
            if (cancha == null)
            {
                return NotFound(new { error = "NoEncontrado", mensaje = "Cancha no encontrada." });
            }

            var errorAlcance = await _sucursalScope.ValidarAccesoCanchaAsync(User, canchaId);
            if (errorAlcance != null)
            {
                return errorAlcance.ToActionResult();
            }

            if (file == null)
            {
                return BadRequest(new { error = "ArchivoRequerido", mensaje = "Selecciona una imagen." });
            }

            try
            {
                var anterior = cancha.ImagenWebRuta;
                var ruta = await _media.GuardarImagenCanchaAsync(canchaId, file);
                if (!string.IsNullOrWhiteSpace(anterior)
                    && !string.Equals(anterior.Trim(), ruta, StringComparison.OrdinalIgnoreCase))
                {
                    _media.EliminarSiExiste(anterior);
                }

                cancha.ImagenWebRuta = ruta;
                await _context.SaveChangesAsync();
                return Ok(new { mensaje = "Imagen de cancha actualizada.", imagenWebUrl = ruta, canchaId });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = "ImagenInvalida", mensaje = ex.Message });
            }
        }

        [HttpDelete("{canchaId:guid}/imagen-web")]
        [HasTenantPermission(PermisosApp.CanchasModificar)]
        public async Task<IActionResult> QuitarImagenWeb(Guid canchaId)
        {
            var cancha = await _context.Canchas.FirstOrDefaultAsync(c => c.Id == canchaId);
            if (cancha == null)
            {
                return NotFound(new { error = "NoEncontrado", mensaje = "Cancha no encontrada." });
            }

            var errorAlcance = await _sucursalScope.ValidarAccesoCanchaAsync(User, canchaId);
            if (errorAlcance != null)
            {
                return errorAlcance.ToActionResult();
            }

            _media.EliminarSiExiste(cancha.ImagenWebRuta);
            cancha.ImagenWebRuta = null;
            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Se usará la imagen por defecto.", canchaId });
        }
    }
}