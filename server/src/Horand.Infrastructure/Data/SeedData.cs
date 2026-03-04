using Horand.Domain.Entities;
using Horand.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Horand.Infrastructure.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<HorandDbContext>();

        // Only seed if no users exist
        if (await dbContext.Users.AnyAsync()) return;

        // Create demo user (password: Demo1234!)
        var demoUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "demo@horand.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Demo1234!", 12),
            FullName = "Demo User",
        };

        // Create editor user (password: Editor1234!)
        var editorUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "editor@horand.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Editor1234!", 12),
            FullName = "Editor User",
        };

        // Create partner users
        var ivanUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "ivan@horand.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Ivan1234!", 12),
            FullName = "Іван Петренко",
        };
        var olenaUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "olena@horand.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Olena1234!", 12),
            FullName = "Олена Коваленко",
        };
        var andriyUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "andriy@horand.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Andriy1234!", 12),
            FullName = "Андрій Шевченко",
        };

        dbContext.Users.AddRange(demoUser, editorUser, ivanUser, olenaUser, andriyUser);

        // Create company
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "HORAND Tech",
            Type = CompanyType.Company,
            CreatedById = demoUser.Id,
        };
        dbContext.Companies.Add(company);

        // Add members
        dbContext.CompanyMembers.AddRange(
            new CompanyMember
            {
                Id = Guid.NewGuid(),
                UserId = demoUser.Id,
                CompanyId = company.Id,
                Role = MemberRole.Owner,
            },
            new CompanyMember
            {
                Id = Guid.NewGuid(),
                UserId = editorUser.Id,
                CompanyId = company.Id,
                Role = MemberRole.Editor,
            },
            new CompanyMember
            {
                Id = Guid.NewGuid(),
                UserId = ivanUser.Id,
                CompanyId = company.Id,
                Role = MemberRole.Editor,
            },
            new CompanyMember
            {
                Id = Guid.NewGuid(),
                UserId = olenaUser.Id,
                CompanyId = company.Id,
                Role = MemberRole.Editor,
            },
            new CompanyMember
            {
                Id = Guid.NewGuid(),
                UserId = andriyUser.Id,
                CompanyId = company.Id,
                Role = MemberRole.Editor,
            }
        );

        // Create partners (linked to real users, including owner)
        var demo = new Partner
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            UserId = demoUser.Id,
            FullName = demoUser.FullName,
            CompanyShare = 25m,
        };
        var ivan = new Partner
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            UserId = ivanUser.Id,
            FullName = ivanUser.FullName,
            CompanyShare = 30m,
        };
        var olena = new Partner
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            UserId = olenaUser.Id,
            FullName = olenaUser.FullName,
            CompanyShare = 25m,
        };
        var andriy = new Partner
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            UserId = andriyUser.Id,
            FullName = andriyUser.FullName,
            CompanyShare = 20m,
        };
        dbContext.Partners.AddRange(demo, ivan, olena, andriy);

        // Revenue Rule: Project
        var projectRule = new RevenueRule
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Type = RevenueRuleType.Project,
            Name = "Проєкт Alpha",
        };
        dbContext.RevenueRules.Add(projectRule);
        dbContext.RevenueShares.AddRange(
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = projectRule.Id, PartnerId = demo.Id, Percentage = 25m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = projectRule.Id, PartnerId = ivan.Id, Percentage = 35m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = projectRule.Id, PartnerId = olena.Id, Percentage = 25m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = projectRule.Id, PartnerId = andriy.Id, Percentage = 15m }
        );

        // Revenue Rule: ClientIncome
        var clientRule = new RevenueRule
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Type = RevenueRuleType.ClientIncome,
            Name = "Клієнти Q1",
        };
        dbContext.RevenueRules.Add(clientRule);
        dbContext.RevenueShares.AddRange(
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = clientRule.Id, PartnerId = demo.Id, Percentage = 25m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = clientRule.Id, PartnerId = ivan.Id, Percentage = 30m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = clientRule.Id, PartnerId = olena.Id, Percentage = 25m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = clientRule.Id, PartnerId = andriy.Id, Percentage = 20m }
        );

        // Revenue Rule: NetProfit
        var profitRule = new RevenueRule
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Type = RevenueRuleType.NetProfit,
            Name = "Чистий прибуток",
        };
        dbContext.RevenueRules.Add(profitRule);
        dbContext.RevenueShares.AddRange(
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = profitRule.Id, PartnerId = demo.Id, Percentage = 25m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = profitRule.Id, PartnerId = ivan.Id, Percentage = 30m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = profitRule.Id, PartnerId = olena.Id, Percentage = 25m },
            new RevenueShare { Id = Guid.NewGuid(), RevenueRuleId = profitRule.Id, PartnerId = andriy.Id, Percentage = 20m }
        );

        // Create a draft agreement
        var agreement = new Agreement
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Version = 1,
            Status = AgreementStatus.Draft,
            GeneratedAt = DateTime.UtcNow,
        };
        dbContext.Agreements.Add(agreement);

        await dbContext.SaveChangesAsync();
    }
}
