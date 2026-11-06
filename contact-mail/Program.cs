// Forwards an inquiry from the website to the company mailbox.
//
// The site is static, so visitors post here after their inquiry is stored.
// The endpoint is public on purpose: visitors have no accounts, which is why
// it carries no [Authorize]. The recipient is fixed, so it cannot be used to
// mail anyone else, and limits below keep a flood from filling the mailbox.
//
// Sign-in to Microsoft Graph uses the app's managed identity. There is no
// password or key to store. Personal data is never logged, only the reference.

using System.Net.Http.Headers;
using System.Net.Mail;
using System.Net.Http.Json;
using System.Threading.RateLimiting;
using Azure.Core;
using Azure.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var mailbox = builder.Configuration["MAILBOX"] ?? "info@pilanda.systems";
var allowedOrigin = builder.Configuration["ALLOWED_ORIGIN"] ?? "https://pilanda.systems";

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    // The Container Apps ingress is the only way in, and its address changes.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(365));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigin).WithMethods("POST").WithHeaders("Content-Type")));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.CreateChained(
        PartitionedRateLimiter.Create<HttpContext, string>(context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(10) })),
        PartitionedRateLimiter.Create<HttpContext, string>(_ => RateLimitPartition.GetFixedWindowLimiter(
            "all",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 40, Window = TimeSpan.FromHours(1) })));
});
builder.Services.AddHttpClient("graph", client => client.BaseAddress = new Uri("https://graph.microsoft.com/v1.0/"));
builder.Services.AddSingleton<TokenCredential>(_ => new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned));

var app = builder.Build();

app.UseForwardedHeaders();
app.UseHsts();
app.UseCors();

// Outside the limiter, so the platform's probes never use up the visitors' quota.
app.MapGet("/healthz", () => Results.Ok()).DisableRateLimiting();

app.UseRateLimiter();

app.MapPost("/inquiry", async (
    Inquiry inquiry,
    TokenCredential credential,
    IHttpClientFactory clients,
    ILogger<Program> logger,
    CancellationToken cancelled) =>
{
    if (!inquiry.IsValid()) return Results.BadRequest();

    var token = await credential.GetTokenAsync(
        new TokenRequestContext(["https://graph.microsoft.com/.default"]), cancelled);
    using var request = new HttpRequestMessage(HttpMethod.Post, $"users/{mailbox}/sendMail")
    {
        Content = JsonContent.Create(inquiry.ToGraphMail(mailbox)),
    };
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);

    using var response = await clients.CreateClient("graph").SendAsync(request, cancelled);
    if (!response.IsSuccessStatusCode)
    {
        logger.LogError("Mail for inquiry {Reference} failed with {Status}", inquiry.Reference, (int)response.StatusCode);
        return Results.StatusCode(StatusCodes.Status502BadGateway);
    }

    logger.LogInformation("Mail for inquiry {Reference} sent", inquiry.Reference);
    return Results.Accepted();
});

app.Run();

// Same limits as the form. The form validates first, so a refusal here means
// the request did not come from it.
internal sealed record Inquiry(Guid Reference, string Name, string Email, string? Company, string Interest, string Message)
{
    public bool IsValid() =>
        Reference != Guid.Empty
        && Name is { Length: >= 2 and <= 100 }
        && Email is { Length: <= 255 } && MailAddress.TryCreate(Email, out _)
        && (Company?.Length ?? 0) <= 100
        && Interest is { Length: >= 1 and <= 200 }
        && Message is { Length: >= 10 and <= 2000 };

    public object ToGraphMail(string mailbox) => new
    {
        message = new
        {
            subject = $"Neue Website-Anfrage von {OneLine(Name)}",
            body = new
            {
                contentType = "Text",
                content = $"""
                    Neue Anfrage über pilanda.systems

                    Name: {Name}
                    E-Mail: {Email}
                    Unternehmen: {(string.IsNullOrWhiteSpace(Company) ? "–" : Company)}
                    Interesse: {Interest}

                    {Message}

                    Referenz: {Reference}
                    Antworten geht direkt an die anfragende Person.
                    """,
            },
            toRecipients = new[] { new { emailAddress = new { address = mailbox } } },
            replyTo = new[] { new { emailAddress = new { address = Email, name = OneLine(Name) } } },
        },
        saveToSentItems = false,
    };

    private static string OneLine(string text) => string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}
