import crypto from 'node:crypto';

export interface FirebaseRestConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string | crypto.KeyObject;
  databaseId?: string;
}

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, { stringValue?: string }>;
};

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function readPrivateKey(): string | crypto.KeyObject | undefined {
  const der = process.env.FIREBASE_PRIVATE_KEY_DER_BASE64?.trim();
  if (der) {
    try {
      const key = crypto.createPrivateKey({
        key: Buffer.from(der, 'base64'),
        format: 'der',
        type: 'pkcs8',
      });
      return key;
    } catch {
      return undefined;
    }
  }
  const encoded = process.env.FIREBASE_PRIVATE_KEY_BASE64?.trim();
  if (encoded) {
    try {
      const key = Buffer.from(encoded, 'base64').toString('utf8');
      return key;
    } catch {
      return undefined;
    }
  }
  const raw = process.env.FIREBASE_PRIVATE_KEY?.trim();
  return raw ? raw.replace(/\\n/g, '\n') : undefined;
}

export function readFirebaseConfig(): FirebaseRestConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = readPrivateKey();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey, databaseId: process.env.FIREBASE_DATABASE_ID?.trim() || '(default)' };
}

function encodePath(value: string): string {
  return encodeURIComponent(value).replace(/%2F/g, '/');
}

export class FirebaseRestStore {
  private accessToken?: string;
  private accessTokenExpiresAt = 0;

  constructor(private readonly config: FirebaseRestConfig) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessTokenExpiresAt > Date.now() + 60_000) return this.accessToken;
    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = base64Url(JSON.stringify({
      iss: this.config.clientEmail,
      // O token cloud-platform evita 403 intermitente do Firestore REST em contas
      // de serviço recém-criadas; o IAM do projeto continua limitando os recursos.
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }));
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${claim}`);
    const assertion = `${header}.${claim}.${signer.sign(this.config.privateKey, 'base64url')}`;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    if (!response.ok) throw new Error(`Firebase OAuth falhou (${response.status})`);
    const body = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new Error('Firebase OAuth não retornou token');
    this.accessToken = body.access_token;
    this.accessTokenExpiresAt = Date.now() + Math.max(60, Number(body.expires_in || 3600)) * 1000;
    return body.access_token;
  }

  private baseUrl(path: string): string {
    return `https://firestore.googleapis.com/v1/projects/${encodePath(this.config.projectId)}/databases/${encodePath(this.config.databaseId || '(default)')}/documents/${path}`;
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    return fetch(url, { ...init, headers });
  }

  private async putPayload(collection: string, id: string, payload: unknown): Promise<void> {
    const encoded = JSON.stringify(payload);
    if (Buffer.byteLength(encoded, 'utf8') > 900_000) {
      console.warn(`[firebase] documento ${collection}/${id} excede 900 KB; mantendo somente no armazenamento local`);
      return;
    }
    const url = `${this.baseUrl(`${collection}/${encodePath(id)}`)}?updateMask.fieldPaths=payload`;
    const response = await this.request(url, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { payload: { stringValue: encoded } } }),
    });
    if (!response.ok) throw new Error(`Firestore PATCH ${collection}/${id} falhou (${response.status})`);
  }

  private parsePayload(doc: FirestoreDocument): unknown | undefined {
    const value = doc.fields?.payload?.stringValue;
    if (!value) return undefined;
    try { return JSON.parse(value); } catch { return undefined; }
  }

  private async listPayloads(collection: string): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    let pageToken = '';
    do {
      const suffix = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const response = await this.request(`${this.baseUrl(collection)}?pageSize=300${suffix}`, { method: 'GET' });
      if (response.status === 404) return result;
      if (!response.ok) throw new Error(`Firestore GET ${collection} falhou (${response.status})`);
      const body = (await response.json()) as { documents?: FirestoreDocument[]; nextPageToken?: string };
      for (const doc of body.documents || []) {
        const id = doc.name?.split('/').pop();
        const payload = this.parsePayload(doc);
        if (id && payload !== undefined) result[decodeURIComponent(id)] = payload;
      }
      pageToken = body.nextPageToken || '';
    } while (pageToken);
    return result;
  }

  async load(): Promise<{ state?: any; users: Record<string, any>; tenants: Record<string, any> } | null> {
    const [meta, users, tenants] = await Promise.all([
      this.listPayloads('lordes_meta'),
      this.listPayloads('lordes_users'),
      this.listPayloads('lordes_tenants'),
    ]);
    const state = meta.state;
    if (state === undefined && Object.keys(users).length === 0 && Object.keys(tenants).length === 0) return null;
    return { state, users, tenants };
  }

  async save(db: { users: any[]; tenants: Record<string, any>; saasClients: any[]; publicLeads: any[] }): Promise<void> {
    await this.putPayload('lordes_meta', 'state', { saasClients: db.saasClients, publicLeads: db.publicLeads });
    for (const user of db.users) await this.putPayload('lordes_users', user.id, user);
    for (const [tenantId, tenant] of Object.entries(db.tenants)) await this.putPayload('lordes_tenants', tenantId, tenant);
  }
}
