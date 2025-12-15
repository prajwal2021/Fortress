using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Linq;
using Fortress.Infrastructure.Data;

namespace Fortress.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WebhooksController : ControllerBase
{
    private readonly ILogger<WebhooksController> _logger;
    private readonly ApplicationDbContext _context;

    public WebhooksController(ILogger<WebhooksController> logger, ApplicationDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    [HttpPost("inbound")]
    public IActionResult InboundWebhook([FromBody] InboundEmailWebhookDto dto)
    {
        _logger.LogInformation($"Received inbound email for recipient: {dto.Recipient} with subject: {dto.Subject}");

        // Extract the alias from the recipient email (e.g., netflix.abc12@fortresskey.com)
        var parts = dto.Recipient.Split('@');
        if (parts.Length != 2 || !parts[0].Contains('.'))
        {
            _logger.LogWarning($"Invalid recipient format: {dto.Recipient}");
            return BadRequest(new { message = "Invalid recipient format." });
        }

        var alias = parts[0];

        // Query the Identities table to find which User owns this alias
        // For simplicity, we'll assume the username or generated email in Identity entity contains the alias.
        // A more robust solution might involve a dedicated alias field.
        var identity = _context.Identities.FirstOrDefault(i => i.GeneratedEmail == dto.Recipient);

        if (identity != null)
        {
            // In a real application, you would fetch the user's real email here.
            // For now, we'll just log a simulated forwarding.
            _logger.LogInformation($"Forwarding email \"{dto.Subject}\" from {dto.Recipient} to User ID: {identity.UserId} (simulated real email).");
        }
        else
        {
            _logger.LogInformation($"No identity found for alias: {alias}. Email not forwarded.");
        }

        return Ok();
    }
}

public record InboundEmailWebhookDto(
    string Recipient,
    string Subject
);

