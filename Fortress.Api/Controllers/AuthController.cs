using System.Security.Cryptography;
using System.Text;
using Fortress.Api.Dtos;
using Fortress.Domain.Entities;
using Fortress.Infrastructure.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Konscious.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Fortress.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private static readonly byte[] Salt = Encoding.UTF8.GetBytes("YourHardcodedSalt123"); // TODO: Generate unique salt per user

    public AuthController(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserDto dto)
    {
        // Hash the password using Argon2id
        byte[] passwordBytes = Encoding.UTF8.GetBytes(dto.Password);

        using var argon2 = new Argon2id(passwordBytes)
        {
            Salt = Salt,
            DegreeOfParallelism = 8, // Number of threads
            Iterations = 4, // Number of iterations
            MemorySize = 1024 * 64 // 64 MB
        };

        byte[] hash = await argon2.GetBytesAsync(32); // 32-byte hash
        string passwordHash = Convert.ToBase64String(hash);

        // Create new user
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            PasswordHash = passwordHash
        };

        try
        {
            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return BadRequest(new { message = "Email already registered" });
            }

            // Save to database
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User registered successfully" });
        }
        catch (Exception _)
        {
            return StatusCode(500, new { message = "An error occurred while registering the user" });
        }
    }
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginUserDto dto)
    {
        // Find user by email
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
        {
            return Unauthorized();
        }

        // Hash the provided password using the same parameters as Register
        byte[] passwordBytes = Encoding.UTF8.GetBytes(dto.Password);

        using var argon2 = new Argon2id(passwordBytes)
        {
            Salt = Salt,
            DegreeOfParallelism = 8, // Number of threads
            Iterations = 4, // Number of iterations
            MemorySize = 1024 * 64 // 64 MB
        };

        byte[] hash = await argon2.GetBytesAsync(32); // 32-byte hash
        string passwordHash = Convert.ToBase64String(hash);

        // Perform constant-time comparison
        if (CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(passwordHash),
            Encoding.UTF8.GetBytes(user.PasswordHash)))
        {
            // Create claims
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
            };

            // Create signing key
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not found in configuration")));

            // Create signing credentials
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Create token descriptor
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                Expires = DateTime.UtcNow.AddHours(1),
                SigningCredentials = creds
            };

            // Create token handler and token
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            // Return token
            return Ok(new { token = tokenHandler.WriteToken(token) });
        }

        return Unauthorized();
    }
}
