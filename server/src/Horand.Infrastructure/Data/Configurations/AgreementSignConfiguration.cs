using Horand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Horand.Infrastructure.Data.Configurations;

public class AgreementSignConfiguration : IEntityTypeConfiguration<AgreementSign>
{
    public void Configure(EntityTypeBuilder<AgreementSign> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.SignatureUrl)
            .IsRequired()
            .HasMaxLength(500);

        builder.HasOne(s => s.Agreement)
            .WithMany(a => a.Signatures)
            .HasForeignKey(s => s.AgreementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Partner)
            .WithMany(p => p.Signatures)
            .HasForeignKey(s => s.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
