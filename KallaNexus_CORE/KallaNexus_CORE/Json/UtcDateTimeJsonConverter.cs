using System.Text.Json;
using System.Text.Json.Serialization;

namespace KallpaNexus.API.Json;

/// <summary>
/// Serializa DateTime en UTC con sufijo Z para que el front no interprete la hora como local del navegador.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var s = reader.GetString();
        if (string.IsNullOrWhiteSpace(s))
        {
            return default;
        }

        if (DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
        {
            return dt;
        }

        return DateTime.Parse(s);
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        // Valores en BD (Npgsql timestamptz) son instantes UTC; Unspecified se trata como UTC.
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
        writer.WriteStringValue(utc.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", System.Globalization.CultureInfo.InvariantCulture));
    }
}
