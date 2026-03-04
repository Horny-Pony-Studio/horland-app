namespace Horand.Application.DTOs.Member;
public record MemberResponse(Guid Id, Guid UserId, string Email, string FullName, string Role, DateTime CreatedAt);
