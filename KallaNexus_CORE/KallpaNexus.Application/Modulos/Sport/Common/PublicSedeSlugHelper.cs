using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace KallpaNexus.Application.Modulos.Sport.Common;

public static partial class PublicSedeSlugHelper
{
    public static string SlugFromNombre(string nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre))
        {
            return "sede";
        }

        var normalized = nombre.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        var s = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        s = NonAlnumRegex().Replace(s, "-");
        s = MultiDashRegex().Replace(s, "-").Trim('-');
        return string.IsNullOrEmpty(s) ? "sede" : s;
    }

    /// <summary>Slug único por lista (añade sufijo corto si hay colisión).</summary>
    public static string SlugUnico(string nombre, Guid id, IReadOnlyList<(Guid Id, string SlugBase)> existentes)
    {
        var baseSlug = SlugFromNombre(nombre);
        if (!existentes.Any(e => e.Id != id && e.SlugBase == baseSlug))
        {
            return baseSlug;
        }

        var corto = id.ToString("N")[..6];
        return $"{baseSlug}-{corto}";
    }

    [GeneratedRegex(@"[^a-z0-9]+", RegexOptions.CultureInvariant)]
    private static partial Regex NonAlnumRegex();

    [GeneratedRegex(@"-+", RegexOptions.CultureInvariant)]
    private static partial Regex MultiDashRegex();
}
