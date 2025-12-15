using System.ComponentModel.DataAnnotations;

namespace Fortress.Api.Dtos;

public record CreateManualIdentityDto(
    [Required] string ServiceName,
    [Required] string Username,
    [Required] string Password,
    string? GeneratedEmail = null
);
