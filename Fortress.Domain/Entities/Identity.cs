namespace Fortress.Domain.Entities;

public class Identity
{
    public Guid Id { get; set; }
    public required string ServiceName { get; set; }
    public string? Username { get; set; }
    public string? GeneratedEmail { get; set; }
    public required byte[] EncryptedPassword { get; set; }
    public required byte[] EncryptionNonce { get; set; }
    public required Guid UserId { get; set; }
    public required User User { get; set; }
    public required byte[] EncryptionTag { get; set; }
}
