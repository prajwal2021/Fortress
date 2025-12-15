namespace Fortress.Api.Dtos;

public record DecryptedIdentityDto(
    Guid Id,
    string ServiceName,
    string? Username,
    string? GeneratedEmail,
    string DecryptedPassword
);
