using System.Globalization;
using System.Text.RegularExpressions;

namespace KallpaNexus.Application.Modulos.Sport.Common;

/// <summary>
/// Horario de negocio en zona Perú (Lima) para tarifas y disponibilidad.
/// </summary>
public static class SportTimeHelper
{
    private static readonly TimeZoneInfo Lima = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "SA Pacific Standard Time" : "America/Lima");

    public static DateTime ToUtcFromLimaLocal(DateTime dateTime)
    {
        var local = DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, Lima);
    }

    /// <summary>
    /// Interpreta entrada del panel/API como reloj de negocio en Lima (sin convertir a UTC).
    /// Usar <see cref="ToUtcFromLimaLocal"/> solo al guardar en base de datos.
    /// </summary>
    public static DateTime ParseHoraNegocioDesdeCliente(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => ToLimaFromUtc(value),
            DateTimeKind.Local => TimeZoneInfo.ConvertTime(value, Lima),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Unspecified)
        };

    public static DateTime ToLimaFromUtc(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Lima);

    /// <summary>Instante UTC (o Unspecified leído de BD como UTC) → reloj civil Lima.</summary>
    public static DateTime ToLima(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => ToLimaFromUtc(value),
            DateTimeKind.Local => TimeZoneInfo.ConvertTime(value, Lima),
            _ => ToLimaFromUtc(DateTime.SpecifyKind(value, DateTimeKind.Utc))
        };

    public static DateTime EnsureUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

    public static string FormatoLimaDesdeUtc(DateTime utc) =>
        ToLimaFromUtc(EnsureUtc(utc)).ToString("yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture);

    public static (int Hora, DayOfWeek DiaSemana) GetLimaHourAndDay(DateTime value)
    {
        var lima = ToLima(value);
        return (lima.Hour, lima.DayOfWeek);
    }

    /// <param name="fechaCalendario">Hora civil Lima (Unspecified) o instante UTC.</param>
    public static bool EsFinDeSemana(DateTime fechaCalendario) =>
        fechaCalendario.Kind == DateTimeKind.Unspecified
            ? fechaCalendario.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday
            : ToLima(fechaCalendario).DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

    /// <summary>
    /// Parsea <c>2026-05-22T16:00</c> del panel como hora civil Lima (único reloj de negocio).
    /// </summary>
    public static bool TryParseLimaDesdeCliente(string? input, out DateTime limaCivil)
    {
        limaCivil = default;
        if (string.IsNullOrWhiteSpace(input))
        {
            return false;
        }

        var normalized = input.Trim().Replace(' ', 'T');
        if (normalized.EndsWith("Z", StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized[..^1];
        }

        var offsetMatch = Regex.Match(normalized, @"[+-]\d{2}:?\d{2}$");
        if (offsetMatch.Success)
        {
            normalized = normalized[..offsetMatch.Index];
        }

        if (normalized.Length == 16)
        {
            normalized += ":00";
        }

        var civilMatch = Regex.Match(
            normalized,
            @"^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?",
            RegexOptions.CultureInvariant);
        if (!civilMatch.Success)
        {
            return false;
        }

        var year = int.Parse(civilMatch.Groups[1].Value, CultureInfo.InvariantCulture);
        var month = int.Parse(civilMatch.Groups[2].Value, CultureInfo.InvariantCulture);
        var day = int.Parse(civilMatch.Groups[3].Value, CultureInfo.InvariantCulture);
        var hour = int.Parse(civilMatch.Groups[4].Value, CultureInfo.InvariantCulture);
        var minute = int.Parse(civilMatch.Groups[5].Value, CultureInfo.InvariantCulture);
        var second = civilMatch.Groups[6].Success
            ? int.Parse(civilMatch.Groups[6].Value, CultureInfo.InvariantCulture)
            : 0;

        try
        {
            limaCivil = new DateTime(year, month, day, hour, minute, second, DateTimeKind.Unspecified);
        }
        catch (ArgumentOutOfRangeException)
        {
            return false;
        }

        return true;
    }

    /// <summary>
    /// Día civil Lima desde <c>2026-06-12</c> (query calendario). No convierte a UTC.
    /// </summary>
    public static bool TryParseFechaCalendarioLima(string? input, out DateTime diaLimaCivil)
    {
        diaLimaCivil = default;
        if (string.IsNullOrWhiteSpace(input))
        {
            return false;
        }

        var s = input.Trim();
        if (s.Length >= 10)
        {
            s = s[..10];
        }

        if (!DateOnly.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
        {
            return false;
        }

        diaLimaCivil = new DateTime(d.Year, d.Month, d.Day, 0, 0, 0, DateTimeKind.Unspecified);
        return true;
    }

    /// <summary>Día civil Lima a partir de <see cref="DateTime"/> enlazado por query (evita desfase UTC).</summary>
    public static DateTime DiaCalendarioLimaDesdeQuery(DateTime fechaQuery)
    {
        if (fechaQuery.Kind == DateTimeKind.Unspecified)
        {
            return new DateTime(
                fechaQuery.Year,
                fechaQuery.Month,
                fechaQuery.Day,
                0,
                0,
                0,
                DateTimeKind.Unspecified);
        }

        var lima = ParseHoraNegocioDesdeCliente(fechaQuery);
        return new DateTime(lima.Year, lima.Month, lima.Day, 0, 0, 0, DateTimeKind.Unspecified);
    }
}
