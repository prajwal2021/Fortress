using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Fortress.Domain.Entities;
using Fortress.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Fortress.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WebhooksController : ControllerBase
{
    private readonly ILogger<WebhooksController> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IAmazonSimpleEmailService _sesClient;

    public WebhooksController(
        ILogger<WebhooksController> logger,
        ApplicationDbContext context,
        IAmazonSimpleEmailService sesClient)
    {
        _logger = logger;
        _context = context;
        _sesClient = sesClient;
    }

    [HttpPost("inbound")]
    public async Task<IActionResult> InboundWebhook([FromBody] InboundEmailDto dto)
    {
        _logger.LogInformation($"Received inbound email for recipient: {dto.Recipient} with subject: {dto.Subject} from sender: {dto.Sender}");

        // Query the Identities table to find which User owns this alias
        // Check both GeneratedEmail and Username columns
        var identity = await _context.Identities
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => 
                i.GeneratedEmail == dto.Recipient || 
                i.Username == dto.Recipient);

        if (identity == null || identity.User == null)
        {
            _logger.LogWarning($"No identity found for recipient: {dto.Recipient}. Email not forwarded.");
            return Ok(new { message = "No identity found for this recipient" });
        }

        var userEmail = identity.User.Email;
        _logger.LogInformation($"Found identity for alias: {dto.Recipient}, forwarding to user: {userEmail}");

        try
        {
            // Construct the email body with original sender and content
            var emailBody = $@"This email was forwarded from your Fortress alias: {dto.Recipient}

Original Sender: {dto.Sender}
Original Subject: {dto.Subject}

--- Original Message ---
{dto.Body ?? "No body content"}";

            // Create SendEmailRequest
            var sendRequest = new SendEmailRequest
            {
                Source = "forwarder@myfortress.shop",
                Destination = new Destination
                {
                    ToAddresses = new List<string> { userEmail }
                },
                ReplyToAddresses = new List<string> { dto.Sender },
                Message = new Message
                {
                    Subject = new Content($"[Fortress] Fwd: {dto.Subject}"),
                    Body = new Body
                    {
                        Text = new Content(emailBody)
                    }
                }
            };

            // Send email via AWS SES
            var response = await _sesClient.SendEmailAsync(sendRequest);
            
            _logger.LogInformation(
                $"Successfully forwarded email \"{dto.Subject}\" from {dto.Recipient} (sender: {dto.Sender}) to {userEmail}. MessageId: {response.MessageId}");
            
            return Ok(new { 
                message = "Email forwarded successfully", 
                messageId = response.MessageId 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to forward email from {dto.Recipient} to {userEmail}. Error: {ex.Message}");
            return StatusCode(500, new { 
                message = "Email received but forwarding failed", 
                error = ex.Message 
            });
        }
    }
}

public record InboundEmailDto(
    string Recipient,
    string Sender,
    string Subject,
    string? Body = null
);






