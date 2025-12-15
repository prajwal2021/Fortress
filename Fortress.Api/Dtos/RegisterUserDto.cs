using System.ComponentModel.DataAnnotations;

namespace Fortress.Api.Dtos;

public record RegisterUserDto
{
    [Required]
    [EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; init; } = string.Empty;
}
