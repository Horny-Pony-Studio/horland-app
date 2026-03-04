namespace Horand.Infrastructure.Services;

using Horand.Domain.Interfaces;
using Horand.Domain.Entities;
using Horand.Domain.Enums;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public class PdfService : IPdfService
{
    public PdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateAgreementPdf(Company company, List<Partner> partners, List<RevenueRule> revenueRules, Agreement agreement, List<AgreementSign> signatures)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(11));

                page.Header().Element(header => ComposeHeader(header, company, agreement));
                page.Content().Element(content => ComposeContent(content, company, partners, revenueRules, signatures));
                page.Footer().AlignCenter().Text(text =>
                {
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, Company company, Agreement agreement)
    {
        container.Column(column =>
        {
            column.Item().AlignCenter().Text("ДОГОВІР ПРО СПІВПРАЦЮ").Bold().FontSize(18);
            column.Item().AlignCenter().Text($"№ {agreement.Version}").FontSize(14);
            column.Item().AlignCenter().Text($"від {agreement.GeneratedAt:dd.MM.yyyy} року").FontSize(12);
            column.Item().PaddingVertical(10).LineHorizontal(1);
        });
    }

    private void ComposeContent(IContainer container, Company company, List<Partner> partners, List<RevenueRule> revenueRules, List<AgreementSign> signatures)
    {
        container.Column(column =>
        {
            // Section 1: Parties
            column.Item().PaddingTop(10).Text("1. СТОРОНИ").Bold().FontSize(13);
            column.Item().PaddingTop(5).Text($"Цей договір укладений між співвласниками {(company.Type == CompanyType.Company ? "компанії" : "проєкту")} \"{company.Name}\":");

            foreach (var partner in partners)
            {
                column.Item().PaddingLeft(20).Text($"• {partner.FullName} — {partner.CompanyShare}%");
            }

            // Section 2: Subject
            column.Item().PaddingTop(15).Text("2. ПРЕДМЕТ ДОГОВОРУ").Bold().FontSize(13);
            column.Item().PaddingTop(5).Text($"Сторони домовляються про співпрацю в рамках {(company.Type == CompanyType.Company ? "компанії" : "проєкту")} \"{company.Name}\" на умовах, визначених цим договором.");

            // Section 3: Shares table
            column.Item().PaddingTop(15).Text("3. ЧАСТКИ СПІВВЛАСНИКІВ").Bold().FontSize(13);
            column.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(1);  // №
                    columns.RelativeColumn(4);  // Name
                    columns.RelativeColumn(2);  // Share
                });

                table.Header(header =>
                {
                    header.Cell().Border(1).Padding(5).Text("№").Bold();
                    header.Cell().Border(1).Padding(5).Text("Партнер").Bold();
                    header.Cell().Border(1).Padding(5).Text("Частка (%)").Bold();
                });

                for (int i = 0; i < partners.Count; i++)
                {
                    table.Cell().Border(1).Padding(5).Text($"{i + 1}");
                    table.Cell().Border(1).Padding(5).Text(partners[i].FullName);
                    table.Cell().Border(1).Padding(5).Text($"{partners[i].CompanyShare}%");
                }
            });

            // Section 4: Revenue Distribution
            column.Item().PaddingTop(15).Text("4. РОЗПОДІЛ ДОХОДІВ").Bold().FontSize(13);

            var rulesByType = revenueRules.GroupBy(r => r.Type).OrderBy(g => g.Key);
            int sectionNum = 1;
            foreach (var group in rulesByType)
            {
                string typeName = group.Key switch
                {
                    RevenueRuleType.Project => "Дохід за проєктом",
                    RevenueRuleType.ClientIncome => "Дохід від клієнтів",
                    RevenueRuleType.NetProfit => "Чистий прибуток",
                    _ => "Інше"
                };

                column.Item().PaddingTop(10).Text($"4.{sectionNum} {typeName}").Bold().FontSize(12);

                foreach (var rule in group)
                {
                    column.Item().PaddingTop(5).Text($"Правило: {rule.Name}").Italic();
                    column.Item().PaddingTop(3).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(4);
                            columns.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Border(1).Padding(5).Text("Партнер").Bold();
                            header.Cell().Border(1).Padding(5).Text("Частка (%)").Bold();
                        });

                        foreach (var share in rule.Shares)
                        {
                            var partner = partners.FirstOrDefault(p => p.Id == share.PartnerId);
                            table.Cell().Border(1).Padding(5).Text(partner?.FullName ?? "N/A");
                            table.Cell().Border(1).Padding(5).Text($"{share.Percentage}%");
                        }
                    });
                }
                sectionNum++;
            }

            // Section 5: Signatures
            column.Item().PaddingTop(30).Text("5. ПІДПИСИ СТОРІН").Bold().FontSize(13);
            column.Item().PaddingTop(10).Row(row =>
            {
                foreach (var partner in partners)
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text(partner.FullName).Bold();
                        var sign = signatures.FirstOrDefault(s => s.PartnerId == partner.Id);
                        if (sign != null && File.Exists(sign.SignatureUrl.TrimStart('/')))
                        {
                            col.Item().Width(100).Image(sign.SignatureUrl.TrimStart('/'));
                        }
                        else
                        {
                            col.Item().PaddingTop(30).LineHorizontal(1);
                            col.Item().Text("(підпис)").FontSize(9).Italic();
                        }
                        col.Item().PaddingTop(5).Text($"Дата: ___________").FontSize(9);
                    });
                }
            });
        });
    }

}
