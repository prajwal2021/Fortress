namespace Fortress.Api.Dtos;

public record IdentityDto(
    Guid Id,
    string ServiceName,
    string? Username
);
