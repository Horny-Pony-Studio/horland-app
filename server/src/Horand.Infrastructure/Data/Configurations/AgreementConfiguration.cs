using Horand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Horand.Infrastructure.Data.Configurations;

public class AgreementConfiguration : IEntityTypeConfiguration<Agreement>
{
    public void Configure(EntityTypeBuilder<Agreement> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Version)
            .HasDefaultValue(1);

        builder.Property(a => a.Status)
            .HasConversion<string>();

        builder.Property(a => a.PdfUrl)
            .HasMaxLength(500);

        builder.HasOne(a => a.Company)
            .WithMany(c => c.Agreements)
            .HasForeignKey(a => a.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
