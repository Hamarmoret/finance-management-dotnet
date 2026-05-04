using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Dapper;
using FinanceManagement.Api.Config;
using FinanceManagement.Api.Database;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Auth;
using FinanceManagement.Api.Services.Expenses;
using FinanceManagement.Api.Services.Income;
using FinanceManagement.Api.Services.PnlCenters;
using FinanceManagement.Api.Services.Users;
using FinanceManagement.Api.Services.Pipeline;
using FinanceManagement.Api.Services.Analytics;
using FinanceManagement.Api.Services.AuditLogs;
using FinanceManagement.Api.Services;
using FinanceManagement.Api.Services.Uploads;
using FinanceManagement.Api.Services.BusinessPlans;
using FinanceManagement.Api.Services.CsvImport;
using FinanceManagement.Api.Services.Reports;
using FinanceManagement.Api.Services.Settings;
using FinanceManagement.Api.Services.Vendors;
using FinanceManagement.Api.Services.Alerts;

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .MinimumLevel.Information()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

// Load configuration from environment variables (same env vars as Node.js version)
var appSettings = EnvironmentConfig.Load();
builder.Services.AddSingleton(appSettings);

// Database (Dapper + Npgsql)
DefaultTypeMap.MatchNamesWithUnderscores = true;
var dbContext = new DbContext(appSettings.Database.ConnectionString);
builder.Services.AddSingleton(dbContext);
builder.Services.AddTransient<MigrationRunner>();

// ── JWT constants (issuer + audience pinned so tokens from other systems are rejected) ──
const string JwtIssuer   = "finance-management-api";
const string JwtAudience = "finance-management-clients";

// JWT Authentication (#9)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(appSettings.Jwt.AccessSecret)),
            ValidateIssuer   = true,
            ValidIssuer      = JwtIssuer,
            ValidateAudience = true,
            ValidAudience    = JwtAudience,
            ClockSkew        = TimeSpan.Zero,
        };

        options.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                var error = new ApiError
                {
                    Error = new ErrorDetail
                    {
                        Code = "UNAUTHORIZED",
                        Message = "Authentication required"
                    }
                };
                return context.Response.WriteAsync(JsonSerializer.Serialize(error));
            }
        };
    });

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = appSettings.Cors.Origin.Split(',', StringSplitOptions.RemoveEmptyEntries);
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Rate limiting (#4) — built-in .NET middleware, no extra packages needed ──
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.OnRejected = async (ctx, _) =>
    {
        ctx.HttpContext.Response.ContentType = "application/json";
        await ctx.HttpContext.Response.WriteAsync(JsonSerializer.Serialize(new ApiError
        {
            Error = new ErrorDetail { Code = "RATE_LIMITED", Message = "Too many requests. Please try again later." }
        }));
    };

    // Login: 10 attempts per minute per IP
    options.AddFixedWindowLimiter("login", o =>
    {
        o.Window            = TimeSpan.FromMinutes(1);
        o.PermitLimit       = 10;
        o.QueueLimit        = 0;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    // Register: 5 per hour per IP
    options.AddFixedWindowLimiter("register", o =>
    {
        o.Window            = TimeSpan.FromHours(1);
        o.PermitLimit       = 5;
        o.QueueLimit        = 0;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    // Token refresh: 30 per minute per IP
    options.AddFixedWindowLimiter("refresh", o =>
    {
        o.Window            = TimeSpan.FromMinutes(1);
        o.PermitLimit       = 30;
        o.QueueLimit        = 0;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    // Forgot password: 3 per 10 minutes per IP
    options.AddFixedWindowLimiter("forgot-password", o =>
    {
        o.Window            = TimeSpan.FromMinutes(10);
        o.PermitLimit       = 3;
        o.QueueLimit        = 0;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    // Reports: 10 per hour per IP — caps AI API spend
    options.AddFixedWindowLimiter("reports", o =>
    {
        o.Window            = TimeSpan.FromHours(1);
        o.PermitLimit       = 10;
        o.QueueLimit        = 0;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
});

// Named HttpClient for Google Gemini generateContent API
builder.Services.AddHttpClient("gemini", client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
    if (!string.IsNullOrWhiteSpace(appSettings.Gemini.ApiKey))
    {
        client.DefaultRequestHeaders.Add("x-goog-api-key", appSettings.Gemini.ApiKey);
    }
    client.Timeout = TimeSpan.FromSeconds(30);
});

// Services
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<PasswordResetService>();
builder.Services.AddScoped<ExpensesService>();
builder.Services.AddScoped<IncomeService>();
builder.Services.AddScoped<IncomeContractsService>();
builder.Services.AddScoped<PnlCentersService>();
builder.Services.AddScoped<UsersService>();
builder.Services.AddScoped<ClientsService>();
builder.Services.AddScoped<ContactPersonsService>();
builder.Services.AddScoped<LeadsService>();
builder.Services.AddScoped<ProposalsService>();
builder.Services.AddScoped<AnalyticsService>();
builder.Services.AddScoped<AuditLogsService>();
builder.Services.AddScoped<UploadsService>();
builder.Services.AddScoped<BusinessPlansService>();
builder.Services.AddScoped<CsvImportService>();
builder.Services.AddScoped<DropdownOptionsService>();
builder.Services.AddScoped<VendorsService>();
builder.Services.AddScoped<ReportsService>();
builder.Services.AddScoped<AiSummaryService>();
builder.Services.AddScoped<AlertsService>();

// Controllers with JSON options matching Node.js API
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

var app = builder.Build();

// Run migrations on startup
using (var scope = app.Services.CreateScope())
{
    var migrationRunner = scope.ServiceProvider.GetRequiredService<MigrationRunner>();
    try
    {
        await migrationRunner.RunAsync();
    }
    catch (Exception ex)
    {
        // A catastrophic migration failure (e.g. DB unreachable) means every request will fail.
        // Exit so Cloud Run keeps the previous healthy revision active instead of routing here.
        Log.Fatal(ex, "Migration runner failed — shutting down to preserve previous revision");
        await Log.CloseAndFlushAsync();
        Environment.Exit(1);
    }
}

// Promote designated account owner — email read from env var, not hard-coded (#7)
var ownerEmail = Environment.GetEnvironmentVariable("OWNER_EMAIL");
if (!string.IsNullOrWhiteSpace(ownerEmail))
{
    try
    {
        await using var ownerConn = dbContext.CreateConnection();
        await ownerConn.OpenAsync();
        var affected = await ownerConn.ExecuteAsync(
            "UPDATE users SET role = 'owner', updated_at = NOW() WHERE LOWER(email) = LOWER(@Email) AND role != 'owner'",
            new { Email = ownerEmail });
        if (affected > 0)
            Log.Information("Account owner promotion applied for {Email}", ownerEmail);
        else
            Log.Information("Account owner check: {Email} already owner or not found", ownerEmail);
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to promote account owner — check role constraint includes 'owner'");
    }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────

app.UseMiddleware<ErrorHandlingMiddleware>();

// Security headers (#8)
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"]  = "nosniff";
    ctx.Response.Headers["X-Frame-Options"]         = "DENY";
    ctx.Response.Headers["Referrer-Policy"]         = "strict-origin-when-cross-origin";
    ctx.Response.Headers["Permissions-Policy"]      = "geolocation=(), microphone=(), camera=()";
    // Content-Security-Policy: API only serves JSON, no HTML. Still worth setting.
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    await next();
});

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Get port from environment (Cloud Run provides PORT)
var port = Environment.GetEnvironmentVariable("PORT") ?? "3001";
app.Urls.Add($"http://0.0.0.0:{port}");

Log.Information("Finance Management API (.NET 10) starting on port {Port}", port);
await app.RunAsync();
