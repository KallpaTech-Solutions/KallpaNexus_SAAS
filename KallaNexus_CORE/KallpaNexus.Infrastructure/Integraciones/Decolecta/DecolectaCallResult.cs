namespace KallpaNexus.Infrastructure.Integraciones.Decolecta;

public sealed class DecolectaCallResult<T>
    where T : class
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public int StatusCode { get; init; }
    public string? ErrorMessage { get; init; }

    public static DecolectaCallResult<T> Ok(T data) =>
        new() { Success = true, Data = data, StatusCode = 200 };

    public static DecolectaCallResult<T> Fail(int status, string message) =>
        new() { Success = false, StatusCode = status, ErrorMessage = message };
}
