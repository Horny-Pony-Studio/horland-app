using Horand.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Horand.Infrastructure.Data;

public class HorandDbContext : DbContext
{
    public HorandDbContext(DbContextOptions<HorandDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<CompanyMember> CompanyMembers => Set<CompanyMember>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<RevenueRule> RevenueRules => Set<RevenueRule>();
    public DbSet<RevenueShare> RevenueShares => Set<RevenueShare>();
    public DbSet<Agreement> Agreements => Set<Agreement>();
    public DbSet<AgreementSign> AgreementSigns => Set<AgreementSign>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HorandDbContext).Assembly);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                var createdAtProp = entry.Properties
                    .FirstOrDefault(p => p.Metadata.Name == "CreatedAt");
                if (createdAtProp != null && createdAtProp.Metadata.ClrType == typeof(DateTime))
                {
                    createdAtProp.CurrentValue = now;
                }

                var updatedAtProp = entry.Properties
                    .FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
                if (updatedAtProp != null && updatedAtProp.Metadata.ClrType == typeof(DateTime))
                {
                    updatedAtProp.CurrentValue = now;
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                var updatedAtProp = entry.Properties
                    .FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
                if (updatedAtProp != null && updatedAtProp.Metadata.ClrType == typeof(DateTime))
                {
                    updatedAtProp.CurrentValue = now;
                }
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
