using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(appSettings.Jwt.AccessSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero,
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

// Services
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<PasswordResetService>();
builder.Services.AddScoped<ExpensesService>();
builder.Services.AddScoped<IncomeService>();
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
    await migrationRunner.RunAsync();
}

// Promote designated account owner (runs independently of migration runner)
try
{
    await using var ownerConn = dbContext.CreateConnection();
    await ownerConn.OpenAsync();
    var affected = await ownerConn.ExecuteAsync(
        "UPDATE users SET role = 'owner', updated_at = NOW() WHERE LOWER(email) = 'ofer@hackerseye.com' AND role != 'owner'");
    if (affected > 0)
        Log.Information("Account owner promotion applied: ofer@hackerseye.com promoted to owner");
    else
        Log.Information("Account owner check: ofer@hackerseye.com already owner or not found");
}
catch (Exception ex)
{
    Log.Error(ex, "Failed to promote account owner — check role constraint includes 'owner'");
}

// Middleware pipeline
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Get port from environment (Cloud Run provides PORT)
var port = Environment.GetEnvironmentVariable("PORT") ?? "3001";
app.Urls.Add($"http://0.0.0.0:{port}");

Log.Information("Finance Management API (.NET 10) starting on port {Port}", port);
await app.RunAsync();
