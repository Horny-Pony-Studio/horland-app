// Company
export interface CompanyResponse {
  id: string;
  name: string;
  type: string;
  partnersCount: number;
  userRole: string;
  createdAt: string;
}

export interface CompanyDetailResponse extends CompanyResponse {
  totalShares: number;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  type: string;
}

export interface UpdateCompanyRequest {
  name: string;
}

// User Search
export interface UserSearchResult {
  id: string;
  email: string;
  fullName: string;
}

// Partner
export interface PartnerResponse {
  id: string;
  userId: string;
  fullName: string;
  companyShare: number;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerRequest {
  userId: string;
  companyShare: number;
}

export interface UpdatePartnerRequest {
  companyShare: number;
}

// Revenue
export interface RevenueRuleResponse {
  id: string;
  type: string;
  name: string;
  shares: RevenueShareResponse[];
  createdAt: string;
}

export interface RevenueShareResponse {
  id: string;
  partnerId: string;
  partnerName: string;
  percentage: number;
}

export interface RevenueShareInput {
  partnerId: string;
  percentage: number;
}

export interface CreateRevenueRuleRequest {
  type: string;
  name: string;
  shares: RevenueShareInput[];
}

export interface UpdateRevenueRuleRequest {
  name: string;
  shares: RevenueShareInput[];
}

// Agreement
export interface AgreementResponse {
  id: string;
  companyId: string;
  version: number;
  status: string;
  generatedAt: string;
  pdfUrl: string | null;
  signatures: AgreementSignResponse[];
}

export interface AgreementSignResponse {
  id: string;
  partnerId: string;
  partnerName: string;
  signatureUrl: string;
  signedAt: string;
}

// Sign Links
export interface SignLinkResponse {
  partnerId: string;
  partnerName: string;
  token: string;
  signed: boolean;
}

export interface SignInfoResponse {
  companyName: string;
  partnerName: string;
  version: number;
  status: string;
  alreadySigned: boolean;
}

// Member
export interface MemberResponse {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export interface AddMemberRequest {
  email: string;
  role: string;
}

export interface UpdateMemberRequest {
  role: string;
}

// Audit Log
export interface AuditLogResponse {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: string | null;
  newValues: string | null;
  createdAt: string;
}

export interface AuditLogPageResponse {
  items: AuditLogResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
}
