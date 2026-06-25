using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace KallpaNexus.API.Auth;

/// <summary>
/// Peticiones sin header Authorization (login, onboarding, etc.).
/// </summary>
public sealed class NoBearerAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "NoBearer";

    public NoBearerAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync() =>
        Task.FromResult(AuthenticateResult.NoResult());
}
