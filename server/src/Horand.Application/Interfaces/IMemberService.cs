namespace Horand.Application.Interfaces;
using Horand.Application.DTOs.Member;
public interface IMemberService
{
    Task<List<MemberResponse>> GetMembersAsync(Guid companyId, Guid userId);
    Task<MemberResponse> AddMemberAsync(Guid companyId, AddMemberRequest request, Guid userId);
    Task<MemberResponse> ToggleEditorAsync(Guid companyId, Guid memberId, Guid userId);
    Task RemoveMemberAsync(Guid companyId, Guid memberId, Guid userId);
}
