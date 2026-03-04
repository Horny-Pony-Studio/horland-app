using Horand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Horand.Infrastructure.Data.Configurations;

public class RevenueRuleConfiguration : IEntityTypeConfiguration<RevenueRule>
{
    public void Configure(EntityTypeBuilder<RevenueRule> builder)
    {
        builder.HasKey(rr => rr.Id);

        builder.Property(rr => rr.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(rr => rr.Type)
            .HasConversion<string>();

        builder.HasOne(rr => rr.Company)
            .WithMany(c => c.RevenueRules)
            .HasForeignKey(rr => rr.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
