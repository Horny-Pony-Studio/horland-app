/**
 * Centralized DOM selectors for the HORAND Partnership app.
 * Using plain CSS / Playwright locator patterns.
 */

/* ── Auth forms ──────────────────────────────────── */
export const SEL = {
  // inputs by id
  emailInput: '#email',
  passwordInput: '#password',
  fullNameInput: '#fullName',

  // form submit
  submitBtn: 'button[type="submit"]',

  // inline error
  fieldError: '.text-destructive',
  formError: '.bg-destructive\\/10',

  // ── Dashboard header ──────────────────────────── */
  headerLogo: 'header a[href*="companies"]',
  logoutBtn: 'header button:last-child',
  userDisplay: 'header .text-muted-foreground',
  langSwitcher: 'header button:has-text("EN"), header button:has-text("UA")',

  // ── Companies ─────────────────────────────────── */
  createCompanyBtn: 'button:has-text("Create Company"), button:has-text("Створити компанію")',
  companyCard: '.grid a[href*="companies/"]',

  // ── Dialog ────────────────────────────────────── */
  dialog: '[role="dialog"]',
  dialogTitle: '[role="dialog"] h2',

  // ── Select (shadcn) ───────────────────────────── */
  selectTrigger: '[role="combobox"]',
  selectOption: '[role="option"]',

  // ── Tabs ──────────────────────────────────────── */
  tabsList: '[role="tablist"]',
  tab: (name: string) => `[role="tab"]:has-text("${name}")`,

  // ── Partners ──────────────────────────────────── */
  addPartnerBtn: 'button:has-text("Add Partner"), button:has-text("Додати співвласника")',
  partnerCard: '.grid .rounded-2xl',

  // ── Revenue ───────────────────────────────────── */
  addRuleBtn: 'button:has-text("Add Rule"), button:has-text("Додати правило")',

  // ── Agreement ─────────────────────────────────── */
  generateBtn: 'button:has-text("Generate Agreement"), button:has-text("Згенерувати договір")',
  exportPdfBtn: 'button:has-text("Export to PDF"), button:has-text("Експорт в PDF")',
  signBtn: 'button:has-text("Sign"), button:has-text("Підписати")',
  signatureCanvas: 'canvas',

  // ── Audit ─────────────────────────────────────── */
  auditEntry: '.rounded-xl.border-violet-100',

  // ── Common ────────────────────────────────────── */
  editBtn: 'button:has-text("Edit"), button:has-text("Редагувати")',
  deleteBtn: 'button:has-text("Delete"), button:has-text("Видалити")',
  saveBtn: 'button:has-text("Save"), button:has-text("Зберегти")',
  backBtn: 'button:has-text("Back"), button:has-text("Назад")',
  loadingSpinner: '.animate-spin',
  badge: '[class*="badge"]',
  progressBar: '[role="progressbar"]',
} as const;
