import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import express, { Express, NextFunction, Request, Response } from 'express';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import {
  createCleanTenantDataset,
  createInitialSaasClients,
  createSegmentPreset,
} from './src/data/presets.ts';
import type {
  AccessRole,
  AuthUserSummary,
  LeadCRM,
  MarketingOrigin,
  SaasClientRecord,
  SegmentKey,
  TenantDataset,
} from './src/types/finance.ts';
import { formatBRL, getTodayISO } from './src/utils/formatters.ts';
import { applyOverdueTransitions, generateDueRecurrences } from './src/utils/kpiEngine.ts';
import { getPlanEntitlements } from './src/utils/planLimits.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface UserMembership {
  empresaId: string;
  papel: AccessRole;
}

interface StoredUser {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  empresaId: string;
  papel: AccessRole;
  memberships?: UserMembership[];
  twoFactorEnabled: boolean;
  totpSecret?: string;
  pendingTotpSecret?: string;
  emailVerified?: boolean;
  emailVerifyCodeHash?: string;
  emailVerifyExpiresAt?: number;
  resetCodeHash?: string;
  resetExpiresAt?: number;
  isOperator?: boolean;
}

interface DatabaseSchema {
  users: StoredUser[];
  tenants: Record<string, TenantDataset>;
  saasClients: SaasClientRecord[];
  publicLeads: LeadCRM[];
}

interface TokenPayload {
  userId: string;
  empresaId: string;
  papel: AccessRole;
  isOperator: boolean;
  exp: number;
}

interface AuthedRequest extends Request {
  auth?: TokenPayload;
}

// ---------- Base32 + RFC 6238 TOTP Helpers ----------
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotpSecretBase32(): string {
  return encodeBase32(crypto.randomBytes(20));
}

function buildOtpAuthUri(email: string, secret: string): string {
  const label = encodeURIComponent(`LORDES:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=LORDES&algorithm=SHA1&digits=6&period=30`;
}

function computeTotpAtCounter(secretBase32: string, counter: number): string {
  const key = decodeBase32(secretBase32);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

function verifyTotpCode(secretBase32: string, rawCode: string): boolean {
  const code = rawCode.trim();
  if (!/^\d{6}$/.test(code)) return false;
  const currentStep = Math.floor(Date.now() / 30_000);
  for (const delta of [-1, 0, 1]) {
    const expected = computeTotpAtCounter(secretBase32, currentStep + delta);
    if (timingSafeMatch(code, expected)) return true;
  }
  return false;
}

// ---------- Security, Hashing & Paths ----------
function resolveSafeDbPath(overridePath?: string): { dataDir: string; dbPath: string } {
  if (overridePath) {
    const resolved = path.resolve(overridePath);
    const parent = path.dirname(resolved);
    if (!resolved.startsWith(parent + path.sep)) {
      throw new Error('Invalid override database path');
    }
    return { dataDir: parent, dbPath: resolved };
  }
  const dataDir = path.resolve(process.cwd(), '.data');
  const dbPath = path.resolve(dataDir, 'lordes-db.json');
  if (!dbPath.startsWith(dataDir + path.sep)) {
    throw new Error('Invalid database path');
  }
  return { dataDir, dbPath };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function hashOneTimeCode(code: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(code).digest('hex');
}

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (!timingSafeMatch(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.userId || !parsed.empresaId || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getUserMemberships(u: StoredUser): UserMembership[] {
  if (Array.isArray(u.memberships) && u.memberships.length > 0) {
    return u.memberships;
  }
  return [{ empresaId: u.empresaId, papel: u.papel }];
}

function sanitizeUser(
  u: StoredUser,
  db?: DatabaseSchema,
  activeEmpresaId?: string,
  activePapel?: AccessRole,
): AuthUserSummary {
  const memberships = getUserMemberships(u);
  const companies = db
    ? memberships
        .filter((m) => Boolean(db.tenants[m.empresaId]))
        .map((m) => ({
          empresaId: m.empresaId,
          nomeFantasia: db.tenants[m.empresaId].empresa.nomeFantasia,
          plano: db.tenants[m.empresaId].empresa.plano,
          papel: m.papel,
        }))
    : undefined;

  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    empresaId: activeEmpresaId || u.empresaId,
    papel: activePapel || u.papel,
    twoFactorEnabled: u.twoFactorEnabled,
    emailVerified: Boolean(u.emailVerified),
    isOperator: Boolean(u.isOperator),
    companies,
  };
}

function normalizeSiteSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function mapUtmToOrigin(utmSource: unknown, fallback?: unknown): MarketingOrigin {
  const s = typeof utmSource === 'string' ? utmSource.toLowerCase() : '';
  if (s.includes('google')) return 'Google';
  if (s.includes('insta') || s.includes('facebook') || s.includes('meta')) return 'Instagram';
  if (s.includes('indic') || s.includes('ref')) return 'Indicação';
  if (
    fallback === 'Google' ||
    fallback === 'Instagram' ||
    fallback === 'Indicação' ||
    fallback === 'Balcão / Direto'
  ) {
    return fallback;
  }
  return 'Site LORDES';
}

function isValidLogoDataUrl(val: unknown): val is string {
  if (typeof val !== 'string' || !val) return false;
  if (val.length > 700_000) return false;
  return /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(val);
}

async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { delivered: false };
  }
  try {
    const from = process.env.RESEND_FROM_EMAIL?.trim() || 'LORDES <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });
    return { delivered: res.ok };
  } catch {
    return { delivered: false };
  }
}

function runTenantMaintenance(dataset: TenantDataset, todayISO = getTodayISO()): boolean {
  let changed = false;

  const rec = generateDueRecurrences(dataset, todayISO);
  if (rec.generated.length > 0) {
    dataset.lancamentos = [...rec.generated, ...rec.updatedOriginals];
    dataset.auditoria.unshift({
      id: `aud-rec-${Date.now()}`,
      usuario: 'Motor Automático',
      acao: 'recorrencia',
      entidade: 'Lançamentos',
      resumo: `${rec.generated.length} lançamento(s) recorrente(s) gerado(s) automaticamente.`,
      timestamp: `${todayISO} Automático`,
    });
    changed = true;
  }

  const overdue = applyOverdueTransitions(dataset.lancamentos, todayISO);
  if (overdue.changed) {
    dataset.lancamentos = overdue.updated;
    changed = true;
  }

  return changed;
}

export async function createLordesApp(options?: {
  dbPath?: string;
  mountVite?: boolean;
}): Promise<Express> {
  const { dataDir, dbPath } = resolveSafeDbPath(options?.dbPath);

  function ensureDb(): DatabaseSchema {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
        if (parsed && parsed.tenants && parsed.users) {
          return {
            users: parsed.users.map((u) => ({
              ...u,
              memberships: getUserMemberships(u),
            })),
            tenants: parsed.tenants,
            saasClients: parsed.saasClients || createInitialSaasClients(),
            publicLeads: parsed.publicLeads || [],
          };
        }
      } catch {
        // recreate clean db on parse failure
      }
    }

    const initial: DatabaseSchema = {
      users: [],
      tenants: {
        'emp-servicos': createSegmentPreset('servicos'),
        'emp-comercio': createSegmentPreset('comercio'),
        'emp-alim': createSegmentPreset('alimentacao'),
      },
      saasClients: createInitialSaasClients(),
      publicLeads: [],
    };
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  function saveDb(db: DatabaseSchema): void {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tmpPath = path.resolve(dataDir, `${path.basename(dbPath)}.${process.pid}.${Date.now()}.tmp`);
    if (!tmpPath.startsWith(dataDir + path.sep)) {
      throw new Error('Invalid temp database path');
    }
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpPath, dbPath);
  }

  // Varredura automática de recorrências e atrasos a cada 30 min (.unref() para não prender encerramento)
  const maintenanceTimer = setInterval(() => {
    try {
      const db = ensureDb();
      let dirty = false;
      const today = getTodayISO();
      for (const tenant of Object.values(db.tenants)) {
        if (runTenantMaintenance(tenant, today)) dirty = true;
      }
      if (dirty) saveDb(db);
    } catch {
      // ignore background tick errors
    }
  }, 30 * 60 * 1000);
  maintenanceTimer.unref();

  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  function checkRateLimit(key: string, maxAttempts = 10, windowMs = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const entry = rateBuckets.get(key);
    if (!entry || entry.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxAttempts) return false;
    entry.count += 1;
    return true;
  }

  function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
      return;
    }
    req.auth = payload;
    next();
  }

  function createIsolatedTenantForUser(
    db: DatabaseSchema,
    params: { empresaNome: string; segmento: SegmentKey; creatorName: string },
  ): TenantDataset {
    const empresaId = `emp-${crypto.randomUUID().slice(0, 8)}`;
    const baseSlug = normalizeSiteSlug(params.empresaNome) || 'loja';
    let siteSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
    while (Object.values(db.tenants).some((t) => t.empresa.siteSlug === siteSlug)) {
      siteSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    }
    const siteWebhookKey = crypto.randomBytes(16).toString('hex');

    const cleanDataset = createCleanTenantDataset({
      empresaId,
      nomeFantasia: params.empresaNome,
      segmento: params.segmento,
      siteSlug,
      siteWebhookKey,
      creatorName: params.creatorName,
    });

    db.tenants[empresaId] = cleanDataset;
    db.saasClients.unshift({
      id: `cli-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      empresaNome: params.empresaNome,
      responsavel: params.creatorName,
      segmento:
        params.segmento === 'servicos'
          ? 'Prestação de Serviços'
          : params.segmento === 'comercio'
            ? 'Comércio Local'
            : 'Alimentação & Delivery',
      plano: 'Profissional',
      valorMensalCents: 12900,
      status: 'trial_3m',
      siteContratado: true,
      lancamentosSemana: 0,
      inicioEm: getTodayISO(),
    });
    return cleanDataset;
  }

  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/v1/health', (_req, res) => {
    res.json({ ok: true, service: 'lordes-api', version: 'v1' });
  });

  // Cadastro multi-tenant isolado
  app.post('/api/v1/auth/register', async (req, res) => {
    const body = req.body as {
      nome?: unknown;
      email?: unknown;
      senha?: unknown;
      empresaNome?: unknown;
      segmento?: unknown;
      aceiteLgpd?: unknown;
    };

    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const senha = typeof body.senha === 'string' ? body.senha : '';
    const empresaNome = typeof body.empresaNome === 'string' ? body.empresaNome.trim() : '';
    const segRaw = typeof body.segmento === 'string' ? body.segmento : 'servicos';
    const segmento: SegmentKey =
      segRaw === 'comercio' || segRaw === 'alimentacao' ? segRaw : 'servicos';

    if (
      nome.length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      senha.length < 6 ||
      empresaNome.length < 2
    ) {
      res.status(400).json({
        error: 'Preencha nome, e-mail válido, empresa e senha com ao menos 6 caracteres.',
      });
      return;
    }
    if (body.aceiteLgpd !== true) {
      res.status(400).json({
        error: 'É necessário aceitar os Termos de Uso e Política de Privacidade (LGPD).',
      });
      return;
    }

    const db = ensureDb();
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
      return;
    }

    const cleanDataset = createIsolatedTenantForUser(db, {
      empresaNome,
      segmento,
      creatorName: nome,
    });
    const empresaId = cleanDataset.empresa.id;
    const userId = `usr-${crypto.randomUUID().slice(0, 8)}`;

    const verifyCode = String(crypto.randomInt(100000, 999999));
    const newUser: StoredUser = {
      id: userId,
      nome,
      email,
      senhaHash: hashPassword(senha),
      empresaId,
      papel: 'proprietario',
      memberships: [{ empresaId, papel: 'proprietario' }],
      twoFactorEnabled: false,
      emailVerified: false,
      emailVerifyCodeHash: hashOneTimeCode(verifyCode),
      emailVerifyExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
      isOperator: false,
    };

    db.users.push(newUser);
    saveDb(db);

    await sendTransactionalEmail({
      to: email,
      subject: 'LORDES — Confirme seu e-mail',
      text: `Olá ${nome}, seu código de confirmação na LORDES é: ${verifyCode}`,
    });

    const token = signToken({
      userId: newUser.id,
      empresaId,
      papel: newUser.papel,
      isOperator: false,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      token,
      user: sanitizeUser(newUser, db, empresaId, 'proprietario'),
      dataset: cleanDataset,
    });
  });

  // Login com rate limiting e verificação real TOTP (RFC 6238)
  app.post('/api/v1/auth/login', (req, res) => {
    const body = req.body as { email?: unknown; senha?: unknown; totpCode?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const senha = typeof body.senha === 'string' ? body.senha : '';

    const rateKey = `login:${req.ip || 'ip'}:${email}`;
    if (!checkRateLimit(rateKey, 10)) {
      res.status(429).json({ error: 'Muitas tentativas de login. Aguarde alguns minutos.' });
      return;
    }

    const db = ensureDb();
    const user = db.users.find((u) => u.email === email);
    if (!user || !verifyPassword(senha, user.senhaHash)) {
      res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      return;
    }

    if (user.twoFactorEnabled) {
      const code = typeof body.totpCode === 'string' ? body.totpCode.trim() : '';
      if (!code) {
        res.status(202).json({
          requires2FA: true,
          message: 'Informe o código de 6 dígitos do aplicativo autenticador (2FA).',
        });
        return;
      }
      if (user.totpSecret) {
        if (!verifyTotpCode(user.totpSecret, code)) {
          res.status(401).json({ error: 'Código 2FA inválido ou expirado.' });
          return;
        }
      } else if (!/^\d{6}$/.test(code)) {
        res.status(401).json({ error: 'Código 2FA inválido.' });
        return;
      }
    }

    const memberships = getUserMemberships(user);
    const activeMembership =
      memberships.find((m) => m.empresaId === user.empresaId && db.tenants[m.empresaId]) ||
      memberships.find((m) => Boolean(db.tenants[m.empresaId]));

    if (!activeMembership) {
      res.status(404).json({ error: 'Empresa vinculada não encontrada.' });
      return;
    }

    const dataset = db.tenants[activeMembership.empresaId];
    if (runTenantMaintenance(dataset)) {
      saveDb(db);
    }

    const token = signToken({
      userId: user.id,
      empresaId: activeMembership.empresaId,
      papel: activeMembership.papel,
      isOperator: Boolean(user.isOperator),
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: sanitizeUser(user, db, activeMembership.empresaId, activeMembership.papel),
      dataset,
    });
  });

  // Setup real 2FA TOTP com QR Code
  app.post('/api/v1/auth/2fa/setup', requireAuth, async (req: AuthedRequest, res) => {
    const db = ensureDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const secret = generateTotpSecretBase32();
    const otpauthUrl = buildOtpAuthUri(user.email, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 });
    user.pendingTotpSecret = secret;
    saveDb(db);
    res.json({ secret, otpauthUrl, qrDataUrl });
  });

  app.post('/api/v1/auth/2fa/enable', requireAuth, (req: AuthedRequest, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const db = ensureDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user || !user.pendingTotpSecret) {
      res.status(400).json({ error: 'Inicie a configuração do 2FA primeiro.' });
      return;
    }
    if (!verifyTotpCode(user.pendingTotpSecret, code)) {
      res.status(400).json({ error: 'Código 2FA inválido. Confira o horário do dispositivo e tente novamente.' });
      return;
    }
    user.totpSecret = user.pendingTotpSecret;
    user.pendingTotpSecret = undefined;
    user.twoFactorEnabled = true;
    saveDb(db);
    res.json({
      ok: true,
      user: sanitizeUser(user, db, req.auth!.empresaId, req.auth!.papel),
    });
  });

  app.post('/api/v1/auth/2fa/disable', requireAuth, (req: AuthedRequest, res) => {
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
    const db = ensureDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (!verifyPassword(senha, user.senhaHash)) {
      res.status(401).json({ error: 'Senha atual incorreta.' });
      return;
    }
    user.twoFactorEnabled = false;
    user.totpSecret = undefined;
    user.pendingTotpSecret = undefined;
    saveDb(db);
    res.json({
      ok: true,
      user: sanitizeUser(user, db, req.auth!.empresaId, req.auth!.papel),
    });
  });

  // Verificação de e-mail
  app.post('/api/v1/auth/request-email-verification', requireAuth, async (req: AuthedRequest, res) => {
    const db = ensureDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (user.emailVerified) {
      res.json({ ok: true, alreadyVerified: true, emailSent: false });
      return;
    }
    const verifyCode = String(crypto.randomInt(100000, 999999));
    user.emailVerifyCodeHash = hashOneTimeCode(verifyCode);
    user.emailVerifyExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    saveDb(db);

    const { delivered } = await sendTransactionalEmail({
      to: user.email,
      subject: 'LORDES — Código de confirmação de e-mail',
      text: `Seu código de confirmação na LORDES é: ${verifyCode}`,
    });

    res.json({
      ok: true,
      emailSent: delivered,
      message: delivered
        ? 'Código enviado para o seu e-mail cadastrado.'
        : 'Envio de e-mail requer RESEND_API_KEY configurada no servidor.',
    });
  });

  app.post('/api/v1/auth/verify-email', requireAuth, (req: AuthedRequest, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const db = ensureDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (
      !user.emailVerifyCodeHash ||
      !user.emailVerifyExpiresAt ||
      user.emailVerifyExpiresAt < Date.now() ||
      !timingSafeMatch(hashOneTimeCode(code), user.emailVerifyCodeHash)
    ) {
      res.status(400).json({ error: 'Código de confirmação inválido ou expirado.' });
      return;
    }
    user.emailVerified = true;
    user.emailVerifyCodeHash = undefined;
    user.emailVerifyExpiresAt = undefined;
    saveDb(db);
    res.json({
      ok: true,
      user: sanitizeUser(user, db, req.auth!.empresaId, req.auth!.papel),
    });
  });

  // Recuperação de senha sem vazamento ou enumeração de contas
  app.post('/api/v1/auth/forgot-password', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!checkRateLimit(`forgot:${req.ip || 'ip'}:${email}`, 5)) {
      res.status(429).json({ error: 'Muitas solicitações. Aguarde alguns minutos.' });
      return;
    }
    const db = ensureDb();
    const user = db.users.find((u) => u.email === email);
    let emailSent = false;
    if (user) {
      const resetCode = String(crypto.randomInt(100000, 999999));
      user.resetCodeHash = hashOneTimeCode(resetCode);
      user.resetExpiresAt = Date.now() + 15 * 60 * 1000;
      saveDb(db);
      const sent = await sendTransactionalEmail({
        to: user.email,
        subject: 'LORDES — Recuperação de senha',
        text: `Use o código ${resetCode} para redefinir sua senha. Válido por 15 minutos.`,
      });
      emailSent = sent.delivered;
    }
    res.json({
      ok: true,
      emailSent,
      message: emailSent
        ? 'Se este e-mail estiver cadastrado, enviamos o código de recuperação.'
        : 'Solicitação registrada. O disparo automático requer RESEND_API_KEY configurada no servidor.',
    });
  });

  app.post('/api/v1/auth/reset-password', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const novaSenha = typeof req.body?.novaSenha === 'string' ? req.body.novaSenha : '';

    if (!checkRateLimit(`reset:${req.ip || 'ip'}:${email}`, 8)) {
      res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
      return;
    }
    if (novaSenha.length < 6 || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: 'Informe código de 6 dígitos e nova senha com ao menos 6 caracteres.' });
      return;
    }

    const db = ensureDb();
    const user = db.users.find((u) => u.email === email);
    if (
      !user ||
      !user.resetCodeHash ||
      !user.resetExpiresAt ||
      user.resetExpiresAt < Date.now() ||
      !timingSafeMatch(hashOneTimeCode(code), user.resetCodeHash)
    ) {
      res.status(400).json({ error: 'Código de recuperação inválido ou expirado.' });
      return;
    }

    user.senhaHash = hashPassword(novaSenha);
    user.resetCodeHash = undefined;
    user.resetExpiresAt = undefined;
    saveDb(db);
    res.json({ ok: true, message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
  });

  // Multi-empresa por usuário: listar, criar nova empresa e alternar contexto com token isolado
  app.get('/api/v1/tenant/companies', requireAuth, (req: AuthedRequest, res) => {
    const db = ensureDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const sanitized = sanitizeUser(user, db, req.auth!.empresaId, req.auth!.papel);
    res.json({ companies: sanitized.companies || [] });
  });

  app.post('/api/v1/tenant/companies', requireAuth, (req: AuthedRequest, res) => {
    const body = req.body as { empresaNome?: unknown; segmento?: unknown };
    const empresaNome = typeof body.empresaNome === 'string' ? body.empresaNome.trim() : '';
    const segRaw = typeof body.segmento === 'string' ? body.segmento : 'servicos';
    const segmento: SegmentKey =
      segRaw === 'comercio' || segRaw === 'alimentacao' ? segRaw : 'servicos';

    if (empresaNome.length < 2) {
      res.status(400).json({ error: 'Informe o nome da nova empresa (mínimo 2 caracteres).' });
      return;
    }

    const db = ensureDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    const activeTenant = db.tenants[req.auth!.empresaId];
    if (!user || !activeTenant) {
      res.status(404).json({ error: 'Conta não encontrada.' });
      return;
    }

    const entitlements = getPlanEntitlements(activeTenant.empresa.plano);
    const memberships = getUserMemberships(user);
    const ownedCount = memberships.filter((m) => m.papel === 'proprietario' && Boolean(db.tenants[m.empresaId])).length;
    if (ownedCount >= entitlements.maxCompanies) {
      res.status(403).json({
        error: `Limite de empresas do plano ${activeTenant.empresa.plano} atingido (${entitlements.maxCompanies}).`,
      });
      return;
    }

    const createdDataset = createIsolatedTenantForUser(db, {
      empresaNome,
      segmento,
      creatorName: user.nome,
    });
    createdDataset.empresa.plano = activeTenant.empresa.plano;
    memberships.push({ empresaId: createdDataset.empresa.id, papel: 'proprietario' });
    user.memberships = memberships;
    user.empresaId = createdDataset.empresa.id;
    user.papel = 'proprietario';
    saveDb(db);

    const token = signToken({
      userId: user.id,
      empresaId: createdDataset.empresa.id,
      papel: 'proprietario',
      isOperator: Boolean(user.isOperator),
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      token,
      user: sanitizeUser(user, db, createdDataset.empresa.id, 'proprietario'),
      dataset: createdDataset,
    });
  });

  app.post('/api/v1/auth/switch-company', requireAuth, (req: AuthedRequest, res) => {
    const empresaId = typeof req.body?.empresaId === 'string' ? req.body.empresaId.trim() : '';
    const db = ensureDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const memberships = getUserMemberships(user);
    const membership = memberships.find((m) => m.empresaId === empresaId);
    const dataset = db.tenants[empresaId];
    if (!membership || !dataset) {
      res.status(403).json({ error: 'Você não possui acesso a esta empresa.' });
      return;
    }

    user.empresaId = empresaId;
    user.papel = membership.papel;
    runTenantMaintenance(dataset);
    saveDb(db);

    const token = signToken({
      userId: user.id,
      empresaId,
      papel: membership.papel,
      isOperator: Boolean(user.isOperator),
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: sanitizeUser(user, db, empresaId, membership.papel),
      dataset,
    });
  });

  // Dados isolados do tenant autenticado (executa recorrência automática e atrasos)
  app.get('/api/v1/tenant', requireAuth, (req: AuthedRequest, res) => {
    const db = ensureDb();
    const dataset = db.tenants[req.auth!.empresaId];
    const user = db.users.find((u) => u.id === req.auth!.userId);
    const memberships = user ? getUserMemberships(user) : [];
    const membership = memberships.find((m) => m.empresaId === req.auth!.empresaId);
    if (!dataset || !user || !membership) {
      res.status(404).json({ error: 'Tenant não encontrado.' });
      return;
    }
    if (runTenantMaintenance(dataset)) {
      saveDb(db);
    }
    res.json({
      user: sanitizeUser(user, db, req.auth!.empresaId, membership.papel),
      dataset,
    });
  });

  // Salvar alterações do tenant autenticado (isolamento estrito + validação White-label e plano)
  app.put('/api/v1/tenant', requireAuth, (req: AuthedRequest, res) => {
    if (req.auth!.papel === 'leitura') {
      res.status(403).json({ error: 'Perfil somente leitura não pode alterar dados.' });
      return;
    }
    const incoming = req.body?.dataset as TenantDataset | undefined;
    if (!incoming || typeof incoming !== 'object' || !incoming.empresa) {
      res.status(400).json({ error: 'Payload inválido.' });
      return;
    }

    const db = ensureDb();
    const empresaId = req.auth!.empresaId;
    const current = db.tenants[empresaId];
    if (!current) {
      res.status(404).json({ error: 'Empresa não encontrada.' });
      return;
    }

    const nextPlan =
      incoming.empresa.plano === 'Essencial' ||
      incoming.empresa.plano === 'Profissional' ||
      incoming.empresa.plano === 'Premium'
        ? incoming.empresa.plano
        : current.empresa.plano;
    const entitlements = getPlanEntitlements(nextPlan);

    // Validação de logo White-label
    let nextLogo = current.empresa.logoDataUrl;
    if (incoming.empresa.logoDataUrl === '' || incoming.empresa.logoDataUrl === undefined) {
      nextLogo = undefined;
    } else if (incoming.empresa.logoDataUrl !== current.empresa.logoDataUrl) {
      if (!entitlements.allowWhiteLabel) {
        res.status(403).json({ error: 'Logotipo personalizado White-label disponível no plano Premium.' });
        return;
      }
      if (!isValidLogoDataUrl(incoming.empresa.logoDataUrl)) {
        res.status(400).json({ error: 'Logotipo inválido. Envie PNG, JPG, WebP ou SVG de até 500 KB.' });
        return;
      }
      nextLogo = incoming.empresa.logoDataUrl;
    }

    let nextSlug = current.empresa.siteSlug;
    if (typeof incoming.empresa.siteSlug === 'string' && incoming.empresa.siteSlug.trim()) {
      const normalized = normalizeSiteSlug(incoming.empresa.siteSlug);
      if (normalized.length < 3) {
        res.status(400).json({ error: 'O identificador do site precisa ter pelo menos 3 caracteres.' });
        return;
      }
      const takenByOther = Object.entries(db.tenants).some(
        ([otherId, otherTenant]) =>
          otherId !== empresaId && otherTenant.empresa.siteSlug === normalized,
      );
      if (takenByOther) {
        res.status(409).json({ error: 'Este link de site já está em uso por outra empresa.' });
        return;
      }
      nextSlug = normalized;
    }

    const sanitized: TenantDataset = {
      ...incoming,
      empresa: {
        ...incoming.empresa,
        id: empresaId,
        plano: nextPlan,
        logoDataUrl: nextLogo,
        siteSlug: nextSlug,
        siteWebhookKey: current.empresa.siteWebhookKey,
      },
      contas: (incoming.contas || []).map((c) => ({ ...c, empresaId })),
      categorias: (incoming.categorias || []).map((c) => ({ ...c, empresaId })),
      centrosCusto: (incoming.centrosCusto || []).map((c) => ({ ...c, empresaId })),
      produtos: (incoming.produtos || []).map((p) => ({ ...p, empresaId })),
      pessoas: (incoming.pessoas || []).map((p) => ({ ...p, empresaId })),
      lancamentos: (incoming.lancamentos || []).map((l) => ({ ...l, empresaId })),
      leads: (incoming.leads || []).map((l) => ({ ...l, empresaId })),
    };

    db.tenants[empresaId] = sanitized;
    saveDb(db);
    res.json({ ok: true, dataset: sanitized });
  });

  // Rotacionar chave privada de integração do site da empresa
  app.post('/api/v1/tenant/rotate-site-key', requireAuth, (req: AuthedRequest, res) => {
    if (req.auth!.papel !== 'proprietario') {
      res.status(403).json({ error: 'Apenas o proprietário pode renovar a chave do site.' });
      return;
    }
    const db = ensureDb();
    const tenant = db.tenants[req.auth!.empresaId];
    if (!tenant) {
      res.status(404).json({ error: 'Empresa não encontrada.' });
      return;
    }
    const nextKey = crypto.randomBytes(16).toString('hex');
    tenant.empresa.siteWebhookKey = nextKey;
    saveDb(db);
    res.json({ ok: true, siteWebhookKey: nextKey });
  });

  // Gestão de equipe isolada por empresa com limite real do plano
  app.get('/api/v1/tenant/members', requireAuth, (req: AuthedRequest, res) => {
    const db = ensureDb();
    const empresaId = req.auth!.empresaId;
    const members = db.users
      .filter((u) => getUserMemberships(u).some((m) => m.empresaId === empresaId))
      .map((u) => {
        const mem = getUserMemberships(u).find((m) => m.empresaId === empresaId)!;
        return sanitizeUser(u, db, empresaId, mem.papel);
      });
    res.json({ members });
  });

  app.post('/api/v1/tenant/members', requireAuth, (req: AuthedRequest, res) => {
    if (req.auth!.papel !== 'proprietario') {
      res.status(403).json({ error: 'Apenas o proprietário pode adicionar usuários à empresa.' });
      return;
    }
    const body = req.body as {
      nome?: unknown;
      email?: unknown;
      senha?: unknown;
      papel?: unknown;
    };
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const senha = typeof body.senha === 'string' ? body.senha : '';
    const papel: AccessRole = body.papel === 'leitura' ? 'leitura' : 'financeiro';

    if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Informe nome e e-mail válido do membro.' });
      return;
    }

    const db = ensureDb();
    const empresaId = req.auth!.empresaId;
    const tenant = db.tenants[empresaId];
    if (!tenant) {
      res.status(404).json({ error: 'Empresa não encontrada.' });
      return;
    }

    const entitlements = getPlanEntitlements(tenant.empresa.plano);
    if (papel === 'leitura' && !entitlements.allowContador) {
      res.status(403).json({ error: 'Perfil Contador (somente leitura) disponível a partir do plano Profissional.' });
      return;
    }

    const currentMembersCount = db.users.filter((u) =>
      getUserMemberships(u).some((m) => m.empresaId === empresaId),
    ).length;
    if (currentMembersCount >= entitlements.maxUsers) {
      res.status(403).json({
        error: `Limite de ${entitlements.maxUsers} usuários do plano ${tenant.empresa.plano} atingido.`,
      });
      return;
    }

    const existing = db.users.find((u) => u.email === email);
    if (existing) {
      const memberships = getUserMemberships(existing);
      if (memberships.some((m) => m.empresaId === empresaId)) {
        res.status(409).json({ error: 'Este e-mail já pertence a esta empresa.' });
        return;
      }
      memberships.push({ empresaId, papel });
      existing.memberships = memberships;
      saveDb(db);
      res.status(201).json({ member: sanitizeUser(existing, db, empresaId, papel) });
      return;
    }

    if (senha.length < 6) {
      res.status(400).json({ error: 'Informe senha inicial de pelo menos 6 caracteres para o novo usuário.' });
      return;
    }

    const newMember: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      nome,
      email,
      senhaHash: hashPassword(senha),
      empresaId,
      papel,
      memberships: [{ empresaId, papel }],
      twoFactorEnabled: false,
      emailVerified: false,
      isOperator: false,
    };
    db.users.push(newMember);
    saveDb(db);
    res.status(201).json({ member: sanitizeUser(newMember, db, empresaId, papel) });
  });

  app.delete('/api/v1/tenant/members/:memberId', requireAuth, (req: AuthedRequest, res) => {
    if (req.auth!.papel !== 'proprietario') {
      res.status(403).json({ error: 'Apenas o proprietário pode remover usuários.' });
      return;
    }
    if (req.params.memberId === req.auth!.userId) {
      res.status(400).json({ error: 'Não é possível remover o próprio acesso ativo.' });
      return;
    }
    const db = ensureDb();
    const empresaId = req.auth!.empresaId;
    const target = db.users.find(
      (u) =>
        u.id === req.params.memberId &&
        getUserMemberships(u).some((m) => m.empresaId === empresaId),
    );
    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado nesta empresa.' });
      return;
    }
    const remaining = getUserMemberships(target).filter((m) => m.empresaId !== empresaId);
    if (remaining.length === 0) {
      db.users = db.users.filter((u) => u.id !== target.id);
    } else {
      target.memberships = remaining;
      if (target.empresaId === empresaId) {
        target.empresaId = remaining[0].empresaId;
        target.papel = remaining[0].papel;
      }
    }
    saveDb(db);
    res.json({ ok: true });
  });

  // Exclusão de conta LGPD (remove apenas a empresa autenticada e seus vínculos)
  app.delete('/api/v1/tenant', requireAuth, (req: AuthedRequest, res) => {
    if (req.auth!.papel !== 'proprietario') {
      res.status(403).json({ error: 'Apenas o proprietário pode excluir a conta da empresa.' });
      return;
    }
    const db = ensureDb();
    const empresaId = req.auth!.empresaId;
    delete db.tenants[empresaId];
    db.users = db.users
      .map((u): StoredUser | null => {
        const remaining = getUserMemberships(u).filter((m) => m.empresaId !== empresaId);
        if (remaining.length === 0) return null;
        return {
          ...u,
          memberships: remaining,
          empresaId: u.empresaId === empresaId ? remaining[0].empresaId : u.empresaId,
          papel: u.empresaId === empresaId ? remaining[0].papel : u.papel,
        };
      })
      .filter((u): u is StoredUser => u !== null);
    saveDb(db);
    res.json({ ok: true });
  });

  // Vitrine pública do site conectado de UMA loja específica
  app.get('/api/v1/public/site/:slug', (req, res) => {
    const slug = normalizeSiteSlug(req.params.slug || '');
    const db = ensureDb();
    const tenant = Object.values(db.tenants).find((t) => t.empresa.siteSlug === slug);
    if (!tenant) {
      res.status(404).json({ error: 'Site não encontrado.' });
      return;
    }
    res.json({
      siteSlug: tenant.empresa.siteSlug,
      nomeFantasia: tenant.empresa.nomeFantasia,
      segmento: tenant.empresa.segmento,
      corPrimaria: tenant.empresa.corPrimaria,
      logoDataUrl: tenant.empresa.logoDataUrl || '',
      siteHeadline: tenant.empresa.siteHeadline || `Solicite seu orçamento com ${tenant.empresa.nomeFantasia}`,
      siteWhatsapp: tenant.empresa.siteWhatsapp || '',
      produtos: (tenant.produtos || [])
        .filter((p) => p.ativo)
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          tipo: p.tipo,
          precoVendaCents: p.precoVendaCents,
        })),
    });
  });

  // Captação direta Site -> Painel isolada exclusivamente na loja dona do :slug
  app.post('/api/v1/public/site/:slug/leads', (req, res) => {
    const slug = normalizeSiteSlug(req.params.slug || '');
    const rateKey = `site-lead:${req.ip || 'ip'}:${slug}`;
    if (!checkRateLimit(rateKey, 25, 10 * 60 * 1000)) {
      res.status(429).json({ error: 'Limite temporário de envios atingido.' });
      return;
    }

    const db = ensureDb();
    const tenant = Object.values(db.tenants).find((t) => t.empresa.siteSlug === slug);
    if (!tenant) {
      res.status(404).json({ error: 'Loja conectada não encontrada.' });
      return;
    }

    const providedKey = req.headers['x-lordes-site-key'];
    if (typeof providedKey === 'string' && providedKey.trim().length > 0) {
      const expectedKey = tenant.empresa.siteWebhookKey || '';
      if (!expectedKey || !timingSafeMatch(providedKey.trim(), expectedKey)) {
        res.status(401).json({ error: 'Chave de integração do site inválida para esta empresa.' });
        return;
      }
    }

    const body = req.body as Record<string, unknown>;
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const empresaNome =
      typeof body.empresaNome === 'string' && body.empresaNome.trim()
        ? body.empresaNome.trim()
        : nome;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : '';
    const servicoSolicitado =
      typeof body.servicoSolicitado === 'string' && body.servicoSolicitado.trim()
        ? body.servicoSolicitado.trim()
        : 'Orçamento enviado pelo site';
    const valorEstimadoCents =
      typeof body.valorEstimadoCents === 'number' && Number.isFinite(body.valorEstimadoCents) && body.valorEstimadoCents > 0
        ? Math.round(body.valorEstimadoCents)
        : 150000;

    if (nome.length < 2 || (!telefone && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      res.status(400).json({ error: 'Informe seu nome e WhatsApp ou e-mail para contato.' });
      return;
    }

    const origem = mapUtmToOrigin(body.utmSource ?? body.utm_source, body.origem);
    const newLead: LeadCRM = {
      id: `lead-site-${Date.now()}`,
      empresaId: tenant.empresa.id,
      nome,
      empresaNome,
      telefone: telefone || '—',
      email: email || '—',
      segmento: tenant.empresa.segmento,
      planoInteresse: tenant.empresa.plano,
      origem,
      valorEstimadoCents,
      servicoSolicitado,
      estagio: 'Novo Lead',
      criadoEm: getTodayISO(),
    };

    tenant.leads.unshift(newLead);
    tenant.auditoria.unshift({
      id: `aud-${Date.now()}`,
      usuario: 'Site Conectado',
      acao: 'criou',
      entidade: 'Lead CRM',
      resumo: `Lead recebido do site (${origem}): ${newLead.empresaNome} (${formatBRL(newLead.valorEstimadoCents)})`,
      timestamp: `${getTodayISO()} Site`,
    });
    saveDb(db);

    res.status(201).json({
      ok: true,
      leadId: newLead.id,
      empresaNome: tenant.empresa.nomeFantasia,
    });
  });

  // Captação pública da landing comercial da própria LORDES
  app.post('/api/v1/leads/public', (req, res) => {
    const body = req.body as Partial<LeadCRM> & { utmSource?: unknown };
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const empresaNome = typeof body.empresaNome === 'string' ? body.empresaNome.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : '';

    if (!nome || !empresaNome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Dados obrigatórios do orçamento inválidos.' });
      return;
    }

    const db = ensureDb();
    const newLead: LeadCRM = {
      id: `lead-pub-${Date.now()}`,
      empresaId: 'lordes-comercial',
      nome,
      empresaNome,
      telefone,
      email,
      segmento: typeof body.segmento === 'string' ? body.segmento : 'Serviços',
      planoInteresse:
        body.planoInteresse === 'Essencial' || body.planoInteresse === 'Premium'
          ? body.planoInteresse
          : 'Profissional',
      origem: mapUtmToOrigin(body.utmSource, body.origem),
      valorEstimadoCents:
        typeof body.valorEstimadoCents === 'number' && body.valorEstimadoCents > 0
          ? Math.round(body.valorEstimadoCents)
          : 350000,
      servicoSolicitado:
        typeof body.servicoSolicitado === 'string' ? body.servicoSolicitado : 'Pacote Site + Gestor',
      estagio: 'Novo Lead',
      criadoEm: getTodayISO(),
    };

    db.publicLeads.unshift(newLead);
    saveDb(db);
    res.status(201).json({ ok: true, leadId: newLead.id });
  });

  // Backoffice LORDES
  app.get('/api/v1/lordes-admin/clients', requireAuth, (req: AuthedRequest, res) => {
    if (!req.auth!.isOperator) {
      res.status(403).json({ error: 'Acesso restrito à equipe operadora LORDES.' });
      return;
    }
    const db = ensureDb();
    res.json({ clients: db.saasClients, publicLeads: db.publicLeads });
  });

  app.patch('/api/v1/lordes-admin/clients/:id', requireAuth, (req: AuthedRequest, res) => {
    if (!req.auth!.isOperator) {
      res.status(403).json({ error: 'Acesso restrito à equipe operadora LORDES.' });
      return;
    }
    const db = ensureDb();
    const target = db.saasClients.find((c) => c.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Cliente SaaS não encontrado.' });
      return;
    }
    const status = req.body?.status;
    if (status === 'trial_3m' || status === 'ativa' || status === 'inadimplente' || status === 'cancelada') {
      target.status = status;
    }
    saveDb(db);
    res.json({ ok: true, client: target });
  });

  if (options?.mountVite) {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distDir = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  return app;
}

const isEntrypoint =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isEntrypoint) {
  createLordesApp({
    dbPath: process.env.LORDES_DB_PATH || undefined,
    mountVite: true,
  })
    .then((app) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`LORDES server listening on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start LORDES server:', err);
      process.exit(1);
    });
}
