namespace Horand.Application.Interfaces;
using Horand.Application.DTOs.Partner;
public interface IPartnerService
{
    Task<List<PartnerResponse>> GetPartnersAsync(Guid companyId, Guid userId);
    Task<PartnerResponse> GetPartnerAsync(Guid companyId, Guid partnerId, Guid userId);
    Task<PartnerResponse> CreatePartnerAsync(Guid companyId, CreatePartnerRequest request, Guid userId);
    Task<PartnerResponse> UpdatePartnerAsync(Guid companyId, Guid partnerId, UpdatePartnerRequest request, Guid userId);
    Task DeletePartnerAsync(Guid companyId, Guid partnerId, Guid userId);
    Task<string> UploadPhotoAsync(Guid companyId, Guid partnerId, Stream fileStream, string fileName, Guid userId);
}
