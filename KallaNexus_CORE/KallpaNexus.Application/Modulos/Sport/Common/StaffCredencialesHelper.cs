namespace KallpaNexus.Application.Modulos.Sport.Common;

public static class StaffCredencialesHelper
{
    public static string NormalizarDni(string? dni)
    {
        var n = SportDniHelper.Normalizar(dni);
        return n;
    }

    public static bool EsDniValidoParaStaff(string dniNormalizado) =>
        dniNormalizado.Length == 8 && dniNormalizado.All(char.IsDigit);

    public static string? ValidarPoliticaNuevaPassword(string password, string dniNormalizado)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            return "La contraseña debe tener al menos 8 caracteres.";
        }

        if (password == dniNormalizado)
        {
            return "La contraseña no puede ser igual a tu DNI.";
        }

        if (!password.Any(char.IsUpper))
        {
            return "Incluye al menos una letra mayúscula.";
        }

        if (!password.Any(char.IsLower))
        {
            return "Incluye al menos una letra minúscula.";
        }

        if (!password.Any(char.IsDigit))
        {
            return "Incluye al menos un número.";
        }

        return null;
    }
}
