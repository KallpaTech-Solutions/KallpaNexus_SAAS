using System.Text.Json;
using KallpaNexus.Domain.Entities.Compartido;
using KallpaNexus.Domain.Integraciones;
using KallpaNexus.Domain.Interfaces;
using KallpaNexus.Domain.Modulos.Sport.Tenancy;
using KallpaNexus.Infrastructure.Integraciones.Decolecta;
using KallpaNexus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KallpaNexus.Infrastructure.Integraciones;

public class ConsultasIntegracionService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantProvider _tenant;
    private readonly DecolectaApiClient _decolecta;
    private readonly DecolectaOptions _decolectaOptions;

    public ConsultasIntegracionService(
        ApplicationDbContext db,
        ITenantProvider tenant,
        DecolectaApiClient decolecta,
        IOptions<DecolectaOptions> decolectaOptions)
    {
        _db = db;
        _tenant = tenant;
        _decolecta = decolecta;
        _decolectaOptions = decolectaOptions.Value;
    }

    /// <summary>
    /// 1) Tabla global <see cref="Persona"/> por DNI.
    /// 2) Si no existe, busca en <see cref="Cliente"/> (cualquier tenant) y persiste en Personas.
    /// 3) Si no, busca en <see cref="UsuarioStaff"/> activo (cualquier negocio) y persiste en Personas.
    /// 4) Si sigue sin datos, Decolecta (misma API key siempre) y persiste el detalle RENIEC en Personas.
    /// La respuesta al front es resumida (nombre/teléfono); el resto queda en BD.
    /// </summary>
    public async Task<DniConsultaResponse> ConsultarDniAsync(string numero, CancellationToken ct = default)
    {
        var dni = NormalizarDni(numero);
        if (dni.Length != 8)
        {
            return DniConsultaResponse.Invalido("DNI inválido (8 dígitos).");
        }

        var persona = await _db.Personas.AsNoTracking()
            .FirstOrDefaultAsync(p => p.NumeroDocumento == dni, ct);
        if (persona != null)
        {
            return DniConsultaResponse.Ok(MapResumenDesdePersona(persona, persona.FuenteUltimaActualizacion));
        }

        var cliente = await _db.Clientes.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.Dni == dni && c.Activo && c.NombreCompleto != "")
            .OrderByDescending(c => c.Telefono != "000000000")
            .ThenByDescending(c => c.Id)
            .FirstOrDefaultAsync(ct);

        if (cliente != null)
        {
            persona = await AsegurarPersonaDesdeClienteAsync(cliente, ct);
            return DniConsultaResponse.Ok(MapResumenDesdePersona(persona, "cliente_sistema"));
        }

        var staff = await _db.UsuariosStaff.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.Dni == dni && u.Activo && u.NombreCompleto != "")
            .OrderByDescending(u => u.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (staff != null)
        {
            persona = await AsegurarPersonaDesdeStaffAsync(staff, ct);
            return DniConsultaResponse.Ok(MapResumenDesdePersona(persona, "staff_sistema"));
        }

        if (string.IsNullOrWhiteSpace(_decolectaOptions.ApiKey))
        {
            return DniConsultaResponse.Error(
                503,
                "API Decolecta no configurada. Define Decolecta:ApiKey en User Secrets.");
        }

        var apiCall = await _decolecta.GetDniAsync(dni, ct);
        if (!apiCall.Success)
        {
            var msg = TraducirErrorDecolecta(apiCall.ErrorMessage, apiCall.StatusCode);
            return DniConsultaResponse.Error(
                apiCall.StatusCode is 401 or 403 ? 502 : apiCall.StatusCode,
                msg);
        }

        var api = apiCall.Data!;
        var nombre = ResolverNombreDesdeReniec(api);
        if (string.IsNullOrWhiteSpace(nombre))
        {
            return DniConsultaResponse.NoEncontrado();
        }

        persona = await GuardarPersonaDesdeReniecAsync(dni, api, nombre, ct);
        return DniConsultaResponse.Ok(MapResumenDesdePersona(persona, "decolecta"));
    }

    public async Task<RucConsultaResult?> ConsultarRucAsync(
        string numero,
        bool completo = false,
        CancellationToken ct = default)
    {
        var ruc = NormalizarRuc(numero);
        if (ruc.Length != 11)
        {
            return null;
        }

        var cache = await _db.ConsultasSunatRuc
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.NumeroRuc == ruc, ct);

        if (cache != null && (!completo || cache.EsDatosCompletos))
        {
            return MapFromRucCache(cache, "cache_global");
        }

        var apiCall = completo
            ? await _decolecta.GetRucFullAsync(ruc, ct)
            : await _decolecta.GetRucBasicoAsync(ruc, ct);

        if (!apiCall.Success || apiCall.Data == null)
        {
            return null;
        }

        var api = apiCall.Data;
        if (string.IsNullOrWhiteSpace(api.RazonSocial))
        {
            return null;
        }

        var existing = await _db.ConsultasSunatRuc.FirstOrDefaultAsync(c => c.NumeroRuc == ruc, ct);
        if (existing == null)
        {
            existing = new ConsultaSunatRucCache { NumeroRuc = ruc };
            _db.ConsultasSunatRuc.Add(existing);
        }

        existing.RazonSocial = api.RazonSocial ?? "";
        existing.Estado = api.Estado ?? "";
        existing.Condicion = api.Condicion ?? "";
        existing.Direccion = api.Direccion ?? "";
        existing.Distrito = api.Distrito ?? "";
        existing.Provincia = api.Provincia ?? "";
        existing.Departamento = api.Departamento ?? "";
        existing.EsDatosCompletos = completo || existing.EsDatosCompletos;
        existing.ConsultadoEnUtc = DateTime.UtcNow;
        if (completo)
        {
            existing.PayloadCompletoJson = JsonSerializer.Serialize(api);
        }
        else
        {
            existing.PayloadBasicoJson = JsonSerializer.Serialize(api);
        }

        await _db.SaveChangesAsync(ct);
        return MapFromRucCache(existing, "decolecta");
    }

    public async Task<TipoCambioResult?> ConsultarTipoCambioSunatAsync(
        DateOnly? date,
        int? month,
        int? year,
        CancellationToken ct = default)
    {
        DateOnly fecha;
        if (date.HasValue)
        {
            fecha = date.Value;
        }
        else if (month.HasValue && year.HasValue)
        {
            fecha = new DateOnly(year.Value, month.Value, 1);
        }
        else
        {
            fecha = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        var cache = await _db.TiposCambioSunat
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Fecha == fecha, ct);

        if (cache != null)
        {
            return MapTipoCambio(cache, "cache_global");
        }

        var apiCall = await _decolecta.GetTipoCambioSunatAsync(
            date ?? fecha,
            month,
            year,
            ct);

        if (!apiCall.Success || apiCall.Data == null)
        {
            return null;
        }

        var api = apiCall.Data;
        if (DateOnly.TryParse(api.Date, out var fApi))
        {
            fecha = fApi;
        }

        var row = new TipoCambioSunatCache
        {
            Fecha = fecha,
            BuyPrice = api.BuyPrice ?? "",
            SellPrice = api.SellPrice ?? "",
            BaseCurrency = api.BaseCurrency ?? "USD",
            QuoteCurrency = api.QuoteCurrency ?? "PEN",
            ConsultadoEnUtc = DateTime.UtcNow
        };

        _db.TiposCambioSunat.Add(row);
        await _db.SaveChangesAsync(ct);
        return MapTipoCambio(row, "decolecta");
    }

    public bool DecolectaConfigurada() => !string.IsNullOrWhiteSpace(_decolectaOptions.ApiKey);

    private static string TraducirErrorDecolecta(string? raw, int status)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return "No se pudo consultar RENIEC (Decolecta).";
        }

        // Decolecta suele devolver ambos textos en un solo 401; priorizar clave inválida.
        if (raw.Contains("Apikey Required", StringComparison.OrdinalIgnoreCase))
        {
            return "API key de Decolecta no válida o revocada (regeneraste el token). Actualiza Decolecta:ApiKey en User Secrets con la clave del panel y reinicia la API.";
        }

        if (raw.Contains("Limit Exceeded", StringComparison.OrdinalIgnoreCase))
        {
            return "Cuota mensual de Decolecta agotada (~100 consultas). Puedes escribir el nombre manualmente o usar un DNI ya guardado en clientes/caché.";
        }

        return raw;
    }

    /// <summary>Misma lógica que SportZa <c>ReniecConsultaService::parseNombreFromJson</c>.</summary>
    private static string? ResolverNombreDesdeReniec(ReniecDniResponse api)
    {
        if (!string.IsNullOrWhiteSpace(api.FullName))
        {
            return api.FullName.Trim();
        }

        var fn = (api.FirstName ?? "").Trim();
        var fl = (api.FirstLastName ?? "").Trim();
        var sl = (api.SecondLastName ?? "").Trim();
        if (fl.Length > 0 || sl.Length > 0 || fn.Length > 0)
        {
            return $"{fl} {sl} {fn}".Trim();
        }

        return null;
    }

    private static string NormalizarDni(string n)
    {
        var digits = new string(n.Where(char.IsDigit).ToArray());
        if (digits.Length > 8)
        {
            digits = digits[^8..];
        }

        return digits;
    }

    private static string NormalizarRuc(string n) =>
        new string(n.Where(char.IsDigit).ToArray());

    private async Task<Persona> AsegurarPersonaDesdeStaffAsync(UsuarioStaff u, CancellationToken ct)
    {
        var persona = await _db.Personas.FirstOrDefaultAsync(p => p.NumeroDocumento == u.Dni, ct);
        var now = DateTime.UtcNow;
        if (persona == null)
        {
            persona = new Persona
            {
                NumeroDocumento = u.Dni,
                FullName = u.NombreCompleto.Trim(),
                FuenteUltimaActualizacion = "staff_sistema",
                ConsultadoReniecEnUtc = now,
                ActualizadoEnUtc = now
            };
            _db.Personas.Add(persona);
        }
        else if (string.IsNullOrWhiteSpace(persona.FullName))
        {
            persona.FullName = u.NombreCompleto.Trim();
        }

        if (!string.IsNullOrWhiteSpace(u.Email))
        {
            persona.Email = u.Email;
        }

        persona.FuenteUltimaActualizacion = "staff_sistema";
        persona.ActualizadoEnUtc = now;
        await _db.SaveChangesAsync(ct);
        return persona;
    }

    private async Task<Persona> AsegurarPersonaDesdeClienteAsync(Cliente c, CancellationToken ct)
    {
        var persona = await _db.Personas.FirstOrDefaultAsync(p => p.NumeroDocumento == c.Dni, ct);
        var now = DateTime.UtcNow;
        if (persona == null)
        {
            persona = new Persona
            {
                NumeroDocumento = c.Dni,
                FullName = c.NombreCompleto.Trim(),
                FuenteUltimaActualizacion = "cliente_sistema",
                ConsultadoReniecEnUtc = now,
                ActualizadoEnUtc = now
            };
            _db.Personas.Add(persona);
        }
        else if (string.IsNullOrWhiteSpace(persona.FullName))
        {
            persona.FullName = c.NombreCompleto.Trim();
        }

        if (!string.IsNullOrWhiteSpace(c.Telefono) && c.Telefono != "000000000")
        {
            persona.Telefono = c.Telefono;
        }

        if (!string.IsNullOrWhiteSpace(c.Email))
        {
            persona.Email = c.Email;
        }

        persona.FuenteUltimaActualizacion = "cliente_sistema";
        persona.ActualizadoEnUtc = now;
        await _db.SaveChangesAsync(ct);
        return persona;
    }

    private async Task<Persona> GuardarPersonaDesdeReniecAsync(
        string dni,
        ReniecDniResponse api,
        string nombre,
        CancellationToken ct)
    {
        var persona = await _db.Personas.FirstOrDefaultAsync(p => p.NumeroDocumento == dni, ct);
        var now = DateTime.UtcNow;
        if (persona == null)
        {
            persona = new Persona { NumeroDocumento = dni };
            _db.Personas.Add(persona);
        }

        persona.FirstName = api.FirstName ?? "";
        persona.FirstLastName = api.FirstLastName ?? "";
        persona.SecondLastName = api.SecondLastName ?? "";
        persona.FullName = nombre;
        persona.ConsultadoReniecEnUtc = now;
        persona.ActualizadoEnUtc = now;
        persona.FuenteUltimaActualizacion = "decolecta";
        persona.PayloadJson = JsonSerializer.Serialize(api);
        await _db.SaveChangesAsync(ct);
        return persona;
    }

    /// <summary>Lo que consume el front en reservas/calendario (sin partes RENIEC).</summary>
    private static DniConsultaResult MapResumenDesdePersona(Persona p, string origen) => new()
    {
        Origen = origen,
        DocumentNumber = p.NumeroDocumento,
        FullName = p.FullName,
        Telefono = p.Telefono,
        Email = p.Email
    };

    private static RucConsultaResult MapFromRucCache(ConsultaSunatRucCache c, string origen) => new()
    {
        Origen = origen,
        NumeroDocumento = c.NumeroRuc,
        RazonSocial = c.RazonSocial,
        Estado = c.Estado,
        Condicion = c.Condicion,
        Direccion = c.Direccion,
        Distrito = c.Distrito,
        Provincia = c.Provincia,
        Departamento = c.Departamento,
        EsCompleto = c.EsDatosCompletos
    };

    private static TipoCambioResult MapTipoCambio(TipoCambioSunatCache c, string origen) => new()
    {
        Origen = origen,
        BuyPrice = c.BuyPrice,
        SellPrice = c.SellPrice,
        BaseCurrency = c.BaseCurrency,
        QuoteCurrency = c.QuoteCurrency,
        Date = c.Fecha.ToString("yyyy-MM-dd")
    };
}

/// <summary>Respuesta pública DNI: solo datos de formulario; el detalle RENIEC vive en <see cref="Persona"/>.</summary>
public class DniConsultaResult
{
    public string Origen { get; set; } = "";
    public string DocumentNumber { get; set; } = "";
    public string FullName { get; set; } = "";
    public string? Telefono { get; set; }
    public string? Email { get; set; }
}

public class RucConsultaResult
{
    public string Origen { get; set; } = "";
    public string NumeroDocumento { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string Estado { get; set; } = "";
    public string Condicion { get; set; } = "";
    public string Direccion { get; set; } = "";
    public string Distrito { get; set; } = "";
    public string Provincia { get; set; } = "";
    public string Departamento { get; set; } = "";
    public bool EsCompleto { get; set; }
}

public class TipoCambioResult
{
    public string Origen { get; set; } = "";
    public string BuyPrice { get; set; } = "";
    public string SellPrice { get; set; } = "";
    public string BaseCurrency { get; set; } = "";
    public string QuoteCurrency { get; set; } = "";
    public string Date { get; set; } = "";
}

public class DniConsultaResponse
{
    public bool Encontrado { get; init; }
    public DniConsultaResult? Datos { get; init; }
    public int StatusCode { get; init; } = 200;
    public string? Mensaje { get; init; }

    public static DniConsultaResponse Ok(DniConsultaResult datos) =>
        new() { Encontrado = true, Datos = datos };

    public static DniConsultaResponse NoEncontrado() =>
        new() { Encontrado = false, StatusCode = 404, Mensaje = "No se encontró información para ese DNI." };

    public static DniConsultaResponse Invalido(string mensaje) =>
        new() { Encontrado = false, StatusCode = 400, Mensaje = mensaje };

    public static DniConsultaResponse Error(int status, string mensaje) =>
        new() { Encontrado = false, StatusCode = status, Mensaje = mensaje };
}
