using Horand.Application.Interfaces;
using Horand.Application.Services;
using Horand.Domain.Interfaces;
using Horand.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Serilog;
using FluentValidation;
using FluentValidation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// Database
builder.Services.AddDbContext<HorandDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services DI
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICompanyService, CompanyService>();
builder.Services.AddScoped<IPartnerService, PartnerService>();
builder.Services.AddScoped<IRevenueRuleService, RevenueRuleService>();
builder.Services.AddScoped<IAgreementService, AgreementService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IMemberService, MemberService>();
builder.Services.AddScoped<IFileStorageService, Horand.API.Services.LocalFileStorageService>();
builder.Services.AddSingleton<ISignTokenService, Horand.API.Services.SignTokenService>();
builder.Services.AddScoped<IPdfService, Horand.Infrastructure.Services.PdfService>();

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
        // Read JWT from cookie
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["accessToken"];
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Horand.Application.Validators.RegisterRequestValidator>();
builder.Services.AddFluentValidationAutoValidation();

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? new[] { "http://localhost:3000" };
        policy.WithOrigins(origins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Database schema: EnsureCreated in dev, Migrate in production
// To generate migrations: dotnet ef migrations add <Name> -p src/Horand.Infrastructure -s src/Horand.API
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HorandDbContext>();
    db.Database.EnsureCreated();
}

// Seed data
await Horand.Infrastructure.Data.SeedData.InitializeAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<Horand.API.Middleware.RateLimitingMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Global error handling middleware
app.UseMiddleware<Horand.API.Middleware.ErrorHandlingMiddleware>();

// Serve uploaded files
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));
app.MapControllers();
app.Run();

// Make Program accessible for integration tests
public partial class Program { }
