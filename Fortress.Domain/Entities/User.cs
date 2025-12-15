namespace Fortress.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public ICollection<Identity> Identities { get; set; } = new List<Identity>();
}
