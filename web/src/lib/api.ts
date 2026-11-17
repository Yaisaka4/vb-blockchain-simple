import { decodeJwtPayload } from './utils';
import { getAllNodes, getNetworkConfig } from './network';

export type UserRole = 'ministry' | 'university' | 'student';

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  subtitle?: string;
  schoolIndex?: number;
  studentId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  shortLived?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: UserProfile;
}

export interface NodeInfo {
  name: string;
  readonly: boolean;
  height: number;
  valid: boolean;
  error: string | null;
  isIssuer: boolean;
  hasAdminKey: boolean;
}

export interface TransactionItem {
  type: 'GENESIS' | 'ADD_ISSUER' | 'REMOVE_ISSUER' | 'ISSUE' | 'REVOKE_REQUEST' | 'REVOKE_APPROVE';
  certId?: string;
  docHash?: string;
  studentRef?: string;
  issuer?: string;
  issuedAt?: number;
  publicKey?: string;
  name?: string;
  reason?: string;
  evidenceHash?: string;
  evidenceName?: string;
  requestedAt?: number;
  approvedAt?: number;
  timestamp?: number;
  signature?: string;
  admin?: string;
  validators?: Array<{ name: string; publicKey: string }>;
}

export interface BlockItem {
  index: number;
  timestamp: number;
  prevHash: string;
  merkleRoot: string;
  transactions: TransactionItem[];
  validator: string;
  hash: string;
  signature?: string;
}

export interface ChainResponse {
  name: string;
  readonly: boolean;
  height: number;
  valid: boolean;
  error: string | null;
  chain: BlockItem[];
  mempool: TransactionItem[];
}

export interface CertificateRecord {
  certId: string;
  docHash?: string;
  studentRef?: string;
  issuer?: string;
  issuerName?: string;
  issuedAt?: number;
  blockIndex?: number;
  status: 'valid' | 'revoked' | 'pending' | 'not_found';
  revokeRequest?: {
    reason: string;
    evidenceHash: string;
    evidenceName: string;
    requester: string;
    requestedAt: number;
    approvals: string[];
  };
  revoked?: {
    reason: string;
    evidenceHash: string;
    revokedAt: number;
    blockIndex: number;
    approvedBy: string[];
  } | null;
}

export interface RevokeRequestItem {
  certId: string;
  issuerName: string;
  reason: string;
  evidenceHash: string;
  evidenceName: string;
  requester: number;
  requestedAt: number;
  approvals: number[];
  needed: number;
}

export interface IssuersResponse {
  issuers: Record<string, string>;
  schools: Array<{ name: string; publicKey: string }>;
}

// ---------------- Token Storage & Reactive Subscribers ----------------
const STORAGE_KEY = 'vb_blockchain_auth_v2';

type TokenListener = (tokens: AuthTokens | null) => void;
const listeners = new Set<TokenListener>();

export function getStoredTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.accessToken && parsed?.refreshToken) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: AuthTokens | null) {
  if (tokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((fn) => fn(tokens));
}

export function subscribeTokens(fn: TokenListener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---------------- Failover Helper Across Nodes ----------------
async function callAnyOnlineNode<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<{ data: T; answeredBy: string; nodeLabel: string }> {
  const nodes = getAllNodes();
  let lastError: Error | null = null;

  for (const n of nodes) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 3500);
      const res = await fetch(`${n.url}${path}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (!res.ok) {
        const err = Object.assign(new Error(data?.error || `HTTP ${res.status}`), {
          status: res.status,
        });
        // Lỗi nghiệp vụ/xác thực (400, 401, 403) → ném ngay không thử sang node khác
        if (res.status >= 400 && res.status < 500) throw err;
        throw err;
      }
      return { data: data as T, answeredBy: n.url, nodeLabel: n.label };
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('Lỗi kết nối');
      if ('status' in err && typeof (err as { status?: number }).status === 'number') {
        const st = (err as { status: number }).status;
        if (st >= 400 && st < 500) throw err;
      }
      lastError = err;
    }
  }
  throw lastError || new Error('Không thể kết nối tới bất kỳ node nào trong mạng (hãy bật node tools/start-local.js)');
}

// ---------------- Single-Flight Refresh Token Rotation ----------------
let refreshInFlight: Promise<AuthTokens> | null = null;

export async function performTokenRefresh(): Promise<AuthTokens> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const current = getStoredTokens();
    if (!current?.refreshToken) {
      setStoredTokens(null);
      throw new Error('Không tìm thấy Refresh Token');
    }
    try {
      const { data } = await callAnyOnlineNode<LoginResponse>('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: current.refreshToken,
          shortLived: !!current.shortLived,
        }),
      });
      const nextTokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        shortLived: !!current.shortLived,
      };
      setStoredTokens(nextTokens);
      return nextTokens;
    } catch (err) {
      setStoredTokens(null);
      throw err;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function getValidAccessToken(): Promise<string | null> {
  const current = getStoredTokens();
  if (!current) return null;
  const payload = decodeJwtPayload(current.accessToken);
  const nowSec = Math.floor(Date.now() / 1000);
  // Làm mới chủ động trước 3 giây khi sắp hết hạn
  if (!payload?.exp || payload.exp - nowSec <= 3) {
    const next = await performTokenRefresh();
    return next.accessToken;
  }
  return current.accessToken;
}

// ---------------- Core REST Request Wrapper (with Bearer + 401 Retry) ----------------
export async function nodeRequest<T>(
  baseUrl: string,
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: unknown;
    auth?: boolean;
    timeoutMs?: number;
  }
): Promise<T> {
  const method = options?.method || (options?.body !== undefined ? 'POST' : 'GET');
  const useAuth = options?.auth ?? true;

  const exec = async (token: string | null) => {
    const headers: Record<string, string> = {};
    if (options?.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 6000);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        throw Object.assign(new Error(data?.error || `Lỗi máy chủ (${res.status})`), {
          status: res.status,
        });
      }
      return data as T;
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new Error(`Không phản hồi từ node ${baseUrl} (quá thời gian chờ)`);
      }
      if (e instanceof TypeError) {
        throw new Error(`Không kết nối được tới node ${baseUrl} — hãy kiểm tra node đang bật`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };

  const token = useAuth ? await getValidAccessToken().catch(() => null) : null;
  try {
    return await exec(token);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (useAuth && status === 401 && getStoredTokens()?.refreshToken) {
      const refreshed = await performTokenRefresh();
      return await exec(refreshed.accessToken);
    }
    throw err;
  }
}

// ---------------- Auth Endpoints ----------------
export async function loginApi(username: string, password: string, shortLived = false): Promise<LoginResponse> {
  const { data } = await callAnyOnlineNode<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, shortLived }),
  });
  setStoredTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    shortLived,
  });
  return data;
}

export async function getMeApi(): Promise<{ user: UserProfile; issuedAt: number; expiresAt: number }> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Chưa đăng nhập');

  try {
    const { data } = await callAnyOnlineNode<{ user: UserProfile; issuedAt: number; expiresAt: number }>(
      '/auth/me',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return data;
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 401 && getStoredTokens()?.refreshToken) {
      const next = await performTokenRefresh();
      const { data } = await callAnyOnlineNode<{ user: UserProfile; issuedAt: number; expiresAt: number }>(
        '/auth/me',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${next.accessToken}` },
        }
      );
      return data;
    }
    throw err;
  }
}

export async function logoutApi(): Promise<void> {
  const current = getStoredTokens();
  setStoredTokens(null);
  if (current?.refreshToken) {
    await callAnyOnlineNode('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    }).catch(() => {});
  }
}

// ---------------- Ministry (Bộ GD&ĐT — Node 1) ----------------
export function getMinistryNodeUrl(): string {
  return getNetworkConfig().schools[0];
}

export function getIssuers(nodeUrl = getMinistryNodeUrl()) {
  return nodeRequest<IssuersResponse>(nodeUrl, '/issuers', { method: 'GET' });
}

export function grantIssuer(publicKey: string, name: string) {
  return nodeRequest<{ ok: boolean; message: string }>(getMinistryNodeUrl(), '/issuers', {
    method: 'POST',
    body: { publicKey, name },
  });
}

export function removeIssuer(publicKey: string) {
  return nodeRequest<{ ok: boolean; message: string }>(
    getMinistryNodeUrl(),
    `/issuers/${encodeURIComponent(publicKey)}`,
    { method: 'DELETE' }
  );
}

// ---------------- University (Trường ĐH — theo đúng node của trường) ----------------
export function getSchoolNodeUrl(schoolIndex: number): string {
  return getNetworkConfig().schools[schoolIndex] || getNetworkConfig().schools[0];
}

export function getNodeInfo(nodeUrl: string) {
  return nodeRequest<NodeInfo>(nodeUrl, '/info', { method: 'GET', auth: false, timeoutMs: 2500 });
}

export function getNodeChain(nodeUrl: string) {
  return nodeRequest<ChainResponse>(nodeUrl, '/chain', { method: 'GET', auth: false, timeoutMs: 3500 });
}

export function issueCertificate(nodeUrl: string, payload: { certId: string; studentId: string; pdfBase64: string }) {
  return nodeRequest<{ ok: boolean; message: string }>(nodeUrl, '/certificates', {
    method: 'POST',
    body: payload,
    timeoutMs: 8000,
  });
}

export function requestRevokeCertificate(
  nodeUrl: string,
  certId: string,
  payload: { reason: string; evidenceBase64: string; evidenceName: string }
) {
  return nodeRequest<{ ok: boolean; message: string }>(
    nodeUrl,
    `/certificates/${encodeURIComponent(certId)}/revoke`,
    {
      method: 'POST',
      body: payload,
      timeoutMs: 8000,
    }
  );
}

export function approveRevokeCertificate(nodeUrl: string, certId: string) {
  return nodeRequest<{ ok: boolean; message: string }>(
    nodeUrl,
    `/certificates/${encodeURIComponent(certId)}/approve-revoke`,
    {
      method: 'POST',
      body: {},
    }
  );
}

export function getRevokeRequests(nodeUrl: string) {
  return nodeRequest<RevokeRequestItem[]>(nodeUrl, '/revoke-requests', { method: 'GET' });
}

export function getCertificateOnNode(nodeUrl: string, certId: string) {
  return nodeRequest<CertificateRecord>(nodeUrl, `/certificates/${encodeURIComponent(certId)}`, {
    method: 'GET',
    auth: false,
  });
}

// ---------------- Public Verification & Student Lookup (Tự động chuyển sang Backup VPS nếu trường tắt) ----------------
export function verifyPdfAcrossNodes(pdfBase64: string) {
  return callAnyOnlineNode<CertificateRecord>('/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64 }),
    timeoutMs: 5000,
  });
}

export function lookupCertAcrossNodes(certId: string) {
  return callAnyOnlineNode<CertificateRecord>(`/certificates/${encodeURIComponent(certId.trim())}`, {
    method: 'GET',
    timeoutMs: 3500,
  });
}

export function getStudentCertificatesAcrossNodes(studentId: string) {
  return callAnyOnlineNode<CertificateRecord[]>(
    `/students/${encodeURIComponent(studentId.trim())}/certificates`,
    {
      method: 'GET',
      timeoutMs: 3500,
    }
  );
}

export function triggerNodeTamper(nodeUrl: string) {
  return nodeRequest<{ ok: boolean; valid: boolean; error: string | null }>(nodeUrl, '/debug/tamper', {
    method: 'POST',
    body: {},
    auth: false,
  });
}
