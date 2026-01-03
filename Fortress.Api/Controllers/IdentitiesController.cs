using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Fortress.Api.Dtos;
using Fortress.Domain.Entities;
using Fortress.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Fortress.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IdentitiesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly byte[] _encryptionKey;

    public IdentitiesController(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        
        // Get encryption key from configuration, or generate a default one
        var keyString = configuration["Encryption:Key"] ?? "ThisIsMyEncryptionKeyForFortressItMustBe32BytesLongExactly!!";
        
        // Ensure the key is exactly 32 bytes for AES-256
        if (keyString.Length < 32)
        {
            // Pad with a fixed pattern if too short
            keyString = keyString.PadRight(32, '!');
        }
        else if (keyString.Length > 32)
        {
            // Truncate if too long
            keyString = keyString.Substring(0, 32);
        }
        
        _encryptionKey = Encoding.UTF8.GetBytes(keyString);
    }
    

    [HttpPost("generate")]
    public IActionResult GenerateIdentity([FromBody] GenerateIdentityDto dto)
    {
        // Generate a unique random email alias
        var randomSuffix = Convert.ToBase64String(RandomNumberGenerator.GetBytes(6)).TrimEnd('=').Replace('/', '-');
        var emailAlias = $"{dto.ServiceName.ToLower().Replace(" ", ".")}.{randomSuffix}@myfortress.shop";

        // Generate a cryptographically strong 16-character password
        var passwordBytes = RandomNumberGenerator.GetBytes(12); // 12 bytes for 16-char base64
        var generatedPassword = Convert.ToBase64String(passwordBytes).Substring(0, 16);

        // Do NOT save to the database yet. Return these to the client.
        return Ok(new { alias = emailAlias, password = generatedPassword });
    }

    [HttpPost("manual")]
    public async Task<IActionResult> CreateManualIdentity([FromBody] CreateManualIdentityDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            // Use the consistent encryption key
            // var encryptionKey = new byte[32]; // Hardcoded 32-byte key for AES-256
            // RandomNumberGenerator.Fill(encryptionKey); // In a real app, this would be derived from the user's master password

            // Encrypt the password
            var nonce = new byte[12]; // 12-byte nonce for AES-GCM
            RandomNumberGenerator.Fill(nonce);

            var passwordBytes = Encoding.UTF8.GetBytes(dto.Password);
            var encryptedPassword = new byte[passwordBytes.Length];
            var tag = new byte[16];

            using (var aes = new AesGcm(_encryptionKey, 16))
            {
                aes.Encrypt(nonce, passwordBytes, encryptedPassword, tag);
            }

            var identity = new Identity
            {
                ServiceName = dto.ServiceName,
                Username = dto.Username,
                GeneratedEmail = dto.GeneratedEmail, // Store generated email if provided
                EncryptedPassword = encryptedPassword,
                EncryptionNonce = nonce,
                EncryptionTag = tag, // Set the EncryptionTag here
                UserId = userId,
                User = null!
            };

            _context.Identities.Add(identity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(CreateManualIdentity), new { id = identity.Id }, identity);
        }
        catch (Exception ex)
        {
            // Log the full exception for debugging
            Console.Error.WriteLine($"Error in CreateManualIdentity: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { message = "An error occurred while adding the identity." });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteIdentity(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var identity = await _context.Identities
            .Where(i => i.Id == id && i.UserId == userId)
            .FirstOrDefaultAsync();

        if (identity == null)
        {
            return NotFound();
        }

        _context.Identities.Remove(identity);
        await _context.SaveChangesAsync();

        return NoContent(); // 204 No Content for successful deletion
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateIdentity(Guid id, [FromBody] CreateManualIdentityDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var identity = await _context.Identities
            .Where(i => i.Id == id && i.UserId == userId)
            .FirstOrDefaultAsync();

        if (identity == null)
        {
            return NotFound();
        }

        identity.ServiceName = dto.ServiceName;
        identity.Username = dto.Username;

        // Only re-encrypt if the password has changed
        if (!string.IsNullOrEmpty(dto.Password))
        {
            var nonce = new byte[12]; // 12-byte nonce for AES-GCM
            RandomNumberGenerator.Fill(nonce);

            var passwordBytes = Encoding.UTF8.GetBytes(dto.Password);
            var encryptedPassword = new byte[passwordBytes.Length];
            var tag = new byte[16];

            using (var aes = new AesGcm(_encryptionKey, 16))
            {
                aes.Encrypt(nonce, passwordBytes, encryptedPassword, tag);
            }

            identity.EncryptedPassword = encryptedPassword;
            identity.EncryptionNonce = nonce;
            identity.EncryptionTag = tag;
        }

        _context.Identities.Update(identity);
        await _context.SaveChangesAsync();

        return NoContent(); // 204 No Content for successful update
    }

    [HttpGet("{id}/decrypted")]
    public async Task<ActionResult<DecryptedIdentityDto>> GetDecryptedIdentity(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var identity = await _context.Identities
            .Where(i => i.Id == id && i.UserId == userId)
            .FirstOrDefaultAsync();

        if (identity == null)
        {
            return NotFound();
        }

        // Use the consistent encryption key
        // var encryptionKey = new byte[32]; // Hardcoded 32-byte key for AES-256
        // RandomNumberGenerator.Fill(encryptionKey); // In a real app, this would be derived from the user's master password

        // Decrypt the password
        var decryptedPasswordBytes = new byte[identity.EncryptedPassword.Length];
        // The authentication tag must be retrieved from the stored identity
        // var tag = new byte[16]; // This was incorrectly re-initialized

        using (var aes = new AesGcm(_encryptionKey, 16))
        {
            aes.Decrypt(identity.EncryptionNonce, identity.EncryptedPassword, identity.EncryptionTag, decryptedPasswordBytes);
        }

        var decryptedPassword = Encoding.UTF8.GetString(decryptedPasswordBytes);

        return Ok(new DecryptedIdentityDto(
            identity.Id,
            identity.ServiceName,
            identity.Username,
            identity.GeneratedEmail,
            decryptedPassword
        ));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<IdentityDto>>> GetIdentities()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized();
        }

        var identities = await _context.Identities
            .Where(i => i.UserId == userId)
            .Select(i => new IdentityDto(
                i.Id,
                i.ServiceName,
                i.Username))
            .ToListAsync();

        return Ok(identities);
    }
}
