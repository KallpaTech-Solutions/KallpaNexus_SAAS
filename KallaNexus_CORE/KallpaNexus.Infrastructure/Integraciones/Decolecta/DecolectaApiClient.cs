using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace KallpaNexus.Infrastructure.Integraciones.Decolecta;

public class DecolectaApiClient
{
    private readonly HttpClient _http;
    private readonly DecolectaOptions _options;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public DecolectaApiClient(HttpClient http, IOptions<DecolectaOptions> options)
    {
        _http = http;
        _options = options.Value;
        if (!string.IsNullOrWhiteSpace(_options.BaseUrl))
        {
            _http.BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/");
        }
    }

    public async Task<DecolectaCallResult<ReniecDniResponse>> GetDniAsync(
        string numero,
        CancellationToken ct = default)
    {
        var req = new HttpRequestMessage(
            HttpMethod.Get,
            $"v1/reniec/dni?numero={Uri.EscapeDataString(numero)}");
        AddAuth(req);
        return await SendAsync<ReniecDniResponse>(req, ct);
    }

    private async Task<DecolectaCallResult<T>> SendAsync<T>(
        HttpRequestMessage req,
        CancellationToken ct)
        where T : class
    {
        var res = await _http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            var mensaje = TryReadErrorMessage(body) ??
                          $"Decolecta respondió {(int)res.StatusCode}.";
            return DecolectaCallResult<T>.Fail((int)res.StatusCode, mensaje);
        }

        var data = JsonSerializer.Deserialize<T>(body, JsonOpts);
        if (data == null)
        {
            return DecolectaCallResult<T>.Fail(502, "Respuesta vacía de Decolecta.");
        }

        return DecolectaCallResult<T>.Ok(data);
    }

    private static string? TryReadErrorMessage(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var err))
            {
                return err.GetString();
            }

            if (doc.RootElement.TryGetProperty("mensaje", out var msg))
            {
                return msg.GetString();
            }
        }
        catch
        {
            // ignore
        }

        return string.IsNullOrWhiteSpace(body) ? null : body.Trim();
    }

    public async Task<DecolectaCallResult<SunatRucResponse>> GetRucBasicoAsync(
        string numero,
        CancellationToken ct = default)
    {
        var req = new HttpRequestMessage(
            HttpMethod.Get,
            $"v1/sunat/ruc?numero={Uri.EscapeDataString(numero)}");
        AddAuth(req);
        return await SendAsync<SunatRucResponse>(req, ct);
    }

    public async Task<DecolectaCallResult<SunatRucResponse>> GetRucFullAsync(
        string numero,
        CancellationToken ct = default)
    {
        var req = new HttpRequestMessage(
            HttpMethod.Get,
            $"v1/sunat/ruc/full?numero={Uri.EscapeDataString(numero)}");
        AddAuth(req);
        return await SendAsync<SunatRucResponse>(req, ct);
    }

    public async Task<DecolectaCallResult<TipoCambioSunatResponse>> GetTipoCambioSunatAsync(
        DateOnly? date,
        int? month,
        int? year,
        CancellationToken ct = default)
    {
        var qs = new List<string>();
        if (date.HasValue)
        {
            qs.Add($"date={date.Value:yyyy-MM-dd}");
        }
        else if (month.HasValue && year.HasValue)
        {
            qs.Add($"month={month.Value}");
            qs.Add($"year={year.Value}");
        }

        var path = "v1/tipo-cambio/sunat" + (qs.Count > 0 ? "?" + string.Join("&", qs) : "");
        var req = new HttpRequestMessage(HttpMethod.Get, path);
        AddAuth(req);
        return await SendAsync<TipoCambioSunatResponse>(req, ct);
    }

    private void AddAuth(HttpRequestMessage req)
    {
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        }
    }

    public bool TieneApiKeyConfigurada() => !string.IsNullOrWhiteSpace(_options.ApiKey);
}

public class ReniecDniResponse
{
    public string? FirstName { get; set; }
    public string? FirstLastName { get; set; }
    public string? SecondLastName { get; set; }
    public string? FullName { get; set; }
    public string? DocumentNumber { get; set; }
}

public class SunatRucResponse
{
    public string? RazonSocial { get; set; }
    public string? NumeroDocumento { get; set; }
    public string? Estado { get; set; }
    public string? Condicion { get; set; }
    public string? Direccion { get; set; }
    public string? Distrito { get; set; }
    public string? Provincia { get; set; }
    public string? Departamento { get; set; }
    public string? Tipo { get; set; }
    public string? ActividadEconomica { get; set; }
}

public class TipoCambioSunatResponse
{
    public string? BuyPrice { get; set; }
    public string? SellPrice { get; set; }
    public string? BaseCurrency { get; set; }
    public string? QuoteCurrency { get; set; }
    public string? Date { get; set; }
}
