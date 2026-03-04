import { API_URL } from './test-data';

/**
 * Direct HTTP client for test-data setup/teardown.
 * Manages auth cookies manually (no browser).
 */
export class ApiClient {
  private cookies: string[] = [];

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.cookies.length) {
      h['Cookie'] = this.cookies.join('; ');
    }
    return h;
  }

  private saveCookies(res: Response) {
    // getSetCookie() may not be available in all Node versions
    let setCookies: string[] = [];
    if (typeof res.headers.getSetCookie === 'function') {
      setCookies = res.headers.getSetCookie();
    } else {
      const raw = res.headers.get('set-cookie');
      if (raw) {
        // Split on comma followed by a cookie name pattern (name=)
        setCookies = raw.split(/,(?=\s*\w+=)/);
      }
    }
    for (const sc of setCookies) {
      const name = sc.trim().split('=')[0];
      this.cookies = this.cookies.filter((c) => !c.startsWith(`${name}=`));
      this.cookies.push(sc.trim().split(';')[0]);
    }
  }

  /* ── Auth ─────────────────────────────────────── */

  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    this.saveCookies(res);
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    return res.json();
  }

  async register(email: string, password: string, fullName: string) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
    });
    this.saveCookies(res);
    if (!res.ok) throw new Error(`Register failed: ${res.status}`);
    return res.json();
  }

  /* ── Companies ───────────────────────────────── */

  async getCompanies(): Promise<any[]> {
    const res = await fetch(`${API_URL}/api/companies`, { headers: this.headers });
    if (!res.ok) throw new Error(`getCompanies: ${res.status}`);
    return res.json();
  }

  async createCompany(name: string, type: string) {
    const res = await fetch(`${API_URL}/api/companies`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name, type }),
    });
    if (!res.ok) throw new Error(`createCompany: ${res.status}`);
    return res.json();
  }

  async deleteCompany(id: string) {
    const res = await fetch(`${API_URL}/api/companies/${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok && res.status !== 404) throw new Error(`deleteCompany: ${res.status}`);
  }

  /* ── Partners ────────────────────────────────── */

  async getPartners(companyId: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/partners`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`getPartners: ${res.status}`);
    return res.json();
  }

  async createPartner(companyId: string, fullName: string, companyShare: number) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/partners`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ fullName, companyShare }),
    });
    if (!res.ok) throw new Error(`createPartner: ${res.status}`);
    return res.json();
  }

  async deletePartner(companyId: string, partnerId: string) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/partners/${partnerId}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok && res.status !== 404) throw new Error(`deletePartner: ${res.status}`);
  }

  /* ── Revenue Rules ───────────────────────────── */

  async getRevenueRules(companyId: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/revenue-rules`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`getRevenueRules: ${res.status}`);
    return res.json();
  }

  async createRevenueRule(
    companyId: string,
    type: string,
    name: string,
    shares: { partnerId: string; percentage: number }[],
  ) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/revenue-rules`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ type, name, shares }),
    });
    if (!res.ok) throw new Error(`createRevenueRule: ${res.status}`);
    return res.json();
  }

  async deleteRevenueRule(companyId: string, ruleId: string) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/revenue-rules/${ruleId}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok && res.status !== 404) throw new Error(`deleteRevenueRule: ${res.status}`);
  }

  /* ── Agreements ──────────────────────────────── */

  async getAgreements(companyId: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/agreements`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`getAgreements: ${res.status}`);
    return res.json();
  }

  async generateAgreement(companyId: string) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/agreements`, {
      method: 'POST',
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`generateAgreement: ${res.status}`);
    return res.json();
  }

  /* ── Audit Log ───────────────────────────────── */

  async getAuditLog(companyId: string, page = 1, pageSize = 20) {
    const res = await fetch(
      `${API_URL}/api/companies/${companyId}/audit-log?page=${page}&pageSize=${pageSize}`,
      { headers: this.headers },
    );
    if (!res.ok) throw new Error(`getAuditLog: ${res.status}`);
    return res.json();
  }

  /* ── Members ─────────────────────────────────── */

  async getMembers(companyId: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/members`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`getMembers: ${res.status}`);
    return res.json();
  }
}
