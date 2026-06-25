namespace KallpaNexus.Application.Modulos.Sport.Common;

/// <summary>
/// Documento de identidad del cliente en reservas (RENIEC u otros usados solo en mostrador).
/// </summary>
public static class SportDniHelper
{
    /// <summary>Cliente varios / sin DNI real — el staff escribe el nombre a mano.</summary>
    public const string ClienteVarios = "123";

    public static string Normalizar(string? dni)
    {
        if (string.IsNullOrWhiteSpace(dni))
        {
            return string.Empty;
        }

        var t = dni.Trim();
        if (EsClienteVarios(t))
        {
            return ClienteVarios;
        }

        var digits = new string(t.Where(char.IsDigit).ToArray());
        return digits.Length > 0 ? digits : t;
    }

    public static bool EsClienteVarios(string? dni) =>
        string.Equals(dni?.Trim(), ClienteVarios, StringComparison.Ordinal);

    public static bool RequiereConsultaReniec(string dniNormalizado) =>
        dniNormalizado.Length == 8 && !EsClienteVarios(dniNormalizado);
}
