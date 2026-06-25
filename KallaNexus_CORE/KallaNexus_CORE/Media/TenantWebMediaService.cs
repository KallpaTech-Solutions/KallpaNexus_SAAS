using KallpaNexus.Domain.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace KallpaNexus.API.Media;

public class TenantWebMediaService
{
    private const long MaxBytes = 5 * 1024 * 1024;
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
    };

    private readonly IWebHostEnvironment _env;
    private readonly ITenantProvider _tenantProvider;

    public TenantWebMediaService(IWebHostEnvironment env, ITenantProvider tenantProvider)
    {
        _env = env;
        _tenantProvider = tenantProvider;
    }

    public async Task<string> GuardarImagenHeroAsync(IFormFile file, CancellationToken ct = default)
    {
        var tenantId = RequireTenantId();
        var ext = ValidarYObtenerExtension(file);
        var dir = Path.Combine(WebRoot(), "uploads", tenantId.ToString(), "web");
        Directory.CreateDirectory(dir);
        foreach (var old in Directory.EnumerateFiles(dir, "hero.*"))
        {
            File.Delete(old);
        }

        var fileName = $"hero{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await GuardarArchivoAsync(file, fullPath, ct);
        return $"/uploads/{tenantId}/web/{fileName}";
    }

    public async Task<string> GuardarImagenCanchaAsync(Guid canchaId, IFormFile file, CancellationToken ct = default)
    {
        var tenantId = RequireTenantId();
        var ext = ValidarYObtenerExtension(file);
        var dir = Path.Combine(WebRoot(), "uploads", tenantId.ToString(), "web", "canchas");
        Directory.CreateDirectory(dir);
        var fileName = $"{canchaId:N}{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await GuardarArchivoAsync(file, fullPath, ct);
        return $"/uploads/{tenantId}/web/canchas/{fileName}";
    }

    /// <summary>Comprobante Yape/Plin subido desde la reserva web pública.</summary>
    public async Task<string> GuardarVoucherReservaWebAsync(IFormFile file, CancellationToken ct = default)
    {
        var tenantId = RequireTenantId();
        var ext = ValidarVoucherExtension(file);
        var dir = Path.Combine(WebRoot(), "uploads", tenantId.ToString(), "web", "vouchers");
        Directory.CreateDirectory(dir);
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await GuardarArchivoAsync(file, fullPath, ct);
        return $"/uploads/{tenantId}/web/vouchers/{fileName}";
    }

    public void EliminarSiExiste(string? rutaRelativa)
    {
        if (string.IsNullOrWhiteSpace(rutaRelativa))
        {
            return;
        }

        var physical = RutaFisicaDesdePublica(rutaRelativa);
        if (physical != null && File.Exists(physical))
        {
            File.Delete(physical);
        }
    }

    public string? RutaFisicaRelativa(string? rutaRelativa) => RutaFisicaDesdePublica(rutaRelativa);

    private string WebRoot() =>
        string.IsNullOrEmpty(_env.WebRootPath)
            ? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")
            : _env.WebRootPath;

    private string? RutaFisicaDesdePublica(string rutaRelativa)
    {
        var normalized = rutaRelativa.Trim().Replace('\\', '/');
        if (!normalized.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var relative = normalized.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        return Path.Combine(WebRoot(), relative);
    }

    private Guid RequireTenantId()
    {
        var id = _tenantProvider.GetTenantId();
        if (id == null)
        {
            throw new InvalidOperationException("Tenant no resuelto.");
        }

        return id.Value;
    }

    private static string ValidarYObtenerExtension(IFormFile file)
    {
        if (file.Length <= 0 || file.Length > MaxBytes)
        {
            throw new ArgumentException("La imagen debe pesar entre 1 byte y 5 MB.");
        }

        var ct = NormalizarContentType(file);
        if (!AllowedContentTypes.Contains(ct))
        {
            throw new ArgumentException("Formato no permitido. Usa JPG, PNG o WebP.");
        }

        return ct switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => ".jpg",
        };
    }

    private static string ValidarVoucherExtension(IFormFile file)
    {
        if (file.Length <= 0 || file.Length > MaxBytes)
        {
            throw new ArgumentException("El comprobante debe pesar entre 1 byte y 5 MB.");
        }

        var ct = NormalizarContentType(file);
        if (ct is "image/jpeg" or "image/png" or "image/webp")
        {
            return ct switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                _ => ".webp",
            };
        }

        if (ct is "application/pdf")
        {
            return ".pdf";
        }

        throw new ArgumentException("Formato no permitido. Usa JPG, PNG, WebP o PDF.");
    }

    private static string NormalizarContentType(IFormFile file)
    {
        var ct = (file.ContentType ?? "").Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(ct) && ct != "application/octet-stream")
        {
            return ct;
        }

        var ext = Path.GetExtension(file.FileName ?? "").ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => ct,
        };
    }

    /// <summary>QR Yape/Plin mostrado en la reserva web pública.</summary>
    public async Task<string> GuardarQrMedioPagoWebAsync(Guid medioPagoId, IFormFile file, CancellationToken ct = default)
    {
        var tenantId = RequireTenantId();
        var ext = ValidarYObtenerExtension(file);
        var dir = Path.Combine(WebRoot(), "uploads", tenantId.ToString(), "web", "medios-pago");
        Directory.CreateDirectory(dir);
        var fileName = $"{medioPagoId:N}{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await GuardarArchivoAsync(file, fullPath, ct);
        return $"/uploads/{tenantId}/web/medios-pago/{fileName}";
    }

    private static async Task GuardarArchivoAsync(IFormFile file, string fullPath, CancellationToken ct)
    {
        await using var stream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(stream, ct);
    }
}
