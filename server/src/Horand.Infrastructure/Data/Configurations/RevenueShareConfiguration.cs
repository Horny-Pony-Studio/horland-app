using Horand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Horand.Infrastructure.Data.Configurations;

public class RevenueShareConfiguration : IEntityTypeConfiguration<RevenueShare>
{
    public void Configure(EntityTypeBuilder<RevenueShare> builder)
    {
        builder.HasKey(rs => rs.Id);

        builder.Property(rs => rs.Percentage)
            .HasPrecision(5, 2);

        builder.HasIndex(rs => new { rs.RevenueRuleId, rs.PartnerId })
            .IsUnique();

        builder.HasOne(rs => rs.RevenueRule)
            .WithMany(rr => rr.Shares)
            .HasForeignKey(rs => rs.RevenueRuleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(rs => rs.Partner)
            .WithMany(p => p.RevenueShares)
            .HasForeignKey(rs => rs.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
