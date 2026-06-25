namespace KallpaNexus.Application.Modulos.Sport.Common;

public static class SportTelefonoHelper
{
    public const string SinNumero = "SN";

    public static string? NormalizarTelefonoCliente(string? telefono, bool sinTelefono)
    {
        if (sinTelefono)
        {
            return SinNumero;
        }

        var digits = SoloDigitos(telefono);
        if (string.IsNullOrEmpty(digits))
        {
            throw new ArgumentException("El teléfono del cliente es obligatorio (9 dígitos).");
        }

        if (digits.Length != 9)
        {
            throw new ArgumentException("El teléfono del cliente debe tener 9 dígitos.");
        }

        return digits;
    }

    public static string? NormalizarWhatsAppNegocio(string? telefono)
    {
        var digits = SoloDigitos(telefono);
        if (string.IsNullOrEmpty(digits))
        {
            return null;
        }

        if (digits.Length != 9)
        {
            throw new ArgumentException("El WhatsApp del negocio debe tener 9 dígitos.");
        }

        return digits;
    }

    public static string SoloDigitos(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return new string(value.Where(char.IsDigit).ToArray());
    }

    public static bool EsSinNumero(string? telefono)
    {
        return string.Equals(telefono?.Trim(), SinNumero, StringComparison.OrdinalIgnoreCase);
    }

    public static bool TieneWhatsAppCliente(string? telefono)
    {
        return SoloDigitos(telefono).Length == 9;
    }
}
