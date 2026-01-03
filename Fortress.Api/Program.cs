using System.Text;
using Fortress.Infrastructure.Data; // Assuming this is your DbContext namespace
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql.EntityFrameworkCore.PostgreSQL; // Add this using directive
using Amazon.SimpleEmail;
using Amazon.Extensions.NETCore.Setup;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))); // Use PostgreSQL connection string

// Configure JWT authentication
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
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not found in configuration"))
            )
        };
    });

builder.Services.AddAuthorization();

// Enable detailed Entity Framework errors in development
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDatabaseDeveloperPageExceptionFilter();
}

// Configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Fortress API", Version = "v1" });

    // Configure Swagger to use JWT Bearer authentication
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Define the CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNextJs", policy =>
    {
        policy.WithOrigins(
            "http://localhost:3000", 
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:3003",
            "http://localhost:3004",
            "http://myfortress.shop",
            "https://myfortress.shop"
        ) // Your Next.js dev URL and production domain
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
    
    // Allow Chrome extension requests (for background script API calls)
    options.AddPolicy("AllowExtensions", policy =>
    {
        policy.AllowAnyOrigin() // Extensions use chrome-extension:// protocol which varies
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure AWS services
builder.Services.AddDefaultAWSOptions(builder.Configuration.GetAWSOptions());
builder.Services.AddAWSService<IAmazonSimpleEmailService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ** THE FIX IS HERE **
// Use the CORRECT policy name that you defined above.
// Allow both Next.js and extension requests
app.UseCors(policy =>
{
    policy.SetIsOriginAllowed(origin =>
    {
        // Allow localhost origins
        if (origin != null && (origin.StartsWith("http://localhost:") || origin.StartsWith("https://localhost:")))
        {
            return true;
        }
        // Allow production domain
        if (origin != null && (origin.StartsWith("http://myfortress.shop") || origin.StartsWith("https://myfortress.shop")))
        {
            return true;
        }
        // Allow Chrome extension origins (null origin is common for extension requests)
        if (origin == null || origin == "null" || origin.StartsWith("chrome-extension://"))
        {
            return true;
        }
        return false;
    })
    .AllowAnyHeader()
    .AllowAnyMethod();
});

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Ensure the database is created (and schema applied) on the shared in-memory connection
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate(); // Apply pending migrations
}

app.Run();
