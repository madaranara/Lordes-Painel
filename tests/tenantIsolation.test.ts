import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createLordesApp } from '../server.ts';

async function startIsolatedTestServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lordes-isolation-'));
  const dbPath = path.join(tmpDir, 'test-db.json');
  const app = await createLordesApp({ dbPath, mountVite: false });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('Failed to bind test server');
  }
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  return {
    baseUrl,
    cleanup: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

test('Multi-tenant isolation: two stores stay strictly separated and linked sites route only to owner store', async () => {
  const { baseUrl, cleanup } = await startIsolatedTestServer();
  try {
    // 1. Loja Alfa cria conta
    const regA = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Ana Silva',
        email: 'ana@alfa.com.br',
        senha: 'SenhaForte123',
        empresaNome: 'Loja Alfa',
        segmento: 'comercio',
        aceiteLgpd: true,
      }),
    });
    assert.equal(regA.status, 201);
    const dataA = await regA.json();
    assert.equal(dataA.dataset.lancamentos.length, 0);
    assert.equal(dataA.dataset.leads.length, 0);
    assert.ok(dataA.dataset.empresa.siteSlug);
    assert.ok(dataA.dataset.empresa.siteWebhookKey);

    // 2. Loja Beta cria conta
    const regB = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Bruno Costa',
        email: 'bruno@beta.com.br',
        senha: 'SenhaForte456',
        empresaNome: 'Loja Beta',
        segmento: 'servicos',
        aceiteLgpd: true,
      }),
    });
    assert.equal(regB.status, 201);
    const dataB = await regB.json();
    assert.notEqual(dataA.user.empresaId, dataB.user.empresaId);
    assert.notEqual(dataA.dataset.empresa.siteSlug, dataB.dataset.empresa.siteSlug);

    // 3. Loja Alfa tenta forjar empresa.id de Loja Beta no PUT /api/v1/tenant
    const forgedPut = await fetch(`${baseUrl}/api/v1/tenant`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dataA.token}`,
      },
      body: JSON.stringify({
        dataset: {
          ...dataA.dataset,
          empresa: { ...dataA.dataset.empresa, id: dataB.user.empresaId, nomeFantasia: 'Hack Beta' },
        },
      }),
    });
    assert.equal(forgedPut.status, 200);
    const forgedRes = await forgedPut.json();
    assert.equal(forgedRes.dataset.empresa.id, dataA.user.empresaId);

    // Verifica que Loja Beta permanece intacta
    const getB = await fetch(`${baseUrl}/api/v1/tenant`, {
      headers: { Authorization: `Bearer ${dataB.token}` },
    });
    const getBData = await getB.json();
    assert.equal(getBData.dataset.empresa.nomeFantasia, 'Loja Beta');

    // 4. Loja Alfa não pode assumir o siteSlug da Loja Beta
    const hijackSlug = await fetch(`${baseUrl}/api/v1/tenant`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dataA.token}`,
      },
      body: JSON.stringify({
        dataset: {
          ...forgedRes.dataset,
          empresa: {
            ...forgedRes.dataset.empresa,
            siteSlug: dataB.dataset.empresa.siteSlug,
          },
        },
      }),
    });
    assert.equal(hijackSlug.status, 409);

    // 5. Loja cliente não acessa lista global do backoffice LORDES
    const adminAttempt = await fetch(`${baseUrl}/api/v1/lordes-admin/clients`, {
      headers: { Authorization: `Bearer ${dataA.token}` },
    });
    assert.equal(adminAttempt.status, 403);

    // 6. Chave errada no webhook do site de Alfa é rejeitada com 401
    const badKeyLead = await fetch(
      `${baseUrl}/api/v1/public/site/${dataA.dataset.empresa.siteSlug}/leads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lordes-Site-Key': 'chave-errada',
        },
        body: JSON.stringify({
          nome: 'Cliente Teste',
          telefone: '(11) 99999-0000',
          servicoSolicitado: 'Pedido Web',
          valorEstimadoCents: 45000,
        }),
      },
    );
    assert.equal(badKeyLead.status, 401);

    // 7. Lead enviado no site conectado de Loja Alfa cai SOMENTE em Loja Alfa
    const goodLead = await fetch(
      `${baseUrl}/api/v1/public/site/${dataA.dataset.empresa.siteSlug}/leads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lordes-Site-Key': dataA.dataset.empresa.siteWebhookKey,
        },
        body: JSON.stringify({
          nome: 'Mariana Cliente',
          empresaNome: 'Café Mariana',
          telefone: '(11) 98888-7777',
          servicoSolicitado: 'Kit Corporativo',
          valorEstimadoCents: 180000,
          utmSource: 'google',
        }),
      },
    );
    assert.equal(goodLead.status, 201);

    const getA = await fetch(`${baseUrl}/api/v1/tenant`, {
      headers: { Authorization: `Bearer ${dataA.token}` },
    });
    const getAData = await getA.json();
    assert.equal(getAData.dataset.leads.length, 1);
    assert.equal(getAData.dataset.leads[0].origem, 'Google');

    const getB2 = await fetch(`${baseUrl}/api/v1/tenant`, {
      headers: { Authorization: `Bearer ${dataB.token}` },
    });
    const getB2Data = await getB2.json();
    assert.equal(getB2Data.dataset.leads.length, 0);

    // 8. Proprietário de Alfa cria contador (leitura) isolado na empresa
    const addMember = await fetch(`${baseUrl}/api/v1/tenant/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dataA.token}`,
      },
      body: JSON.stringify({
        nome: 'Carlos Contador',
        email: 'carlos@contabil.com.br',
        senha: 'Contador123',
        papel: 'leitura',
      }),
    });
    assert.equal(addMember.status, 201);

    const loginContador = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos@contabil.com.br', senha: 'Contador123' }),
    });
    assert.equal(loginContador.status, 200);
    const contadorData = await loginContador.json();
    assert.equal(contadorData.user.empresaId, dataA.user.empresaId);

    const readOnlyPut = await fetch(`${baseUrl}/api/v1/tenant`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contadorData.token}`,
      },
      body: JSON.stringify({ dataset: getAData.dataset }),
    });
    assert.equal(readOnlyPut.status, 403);
  } finally {
    await cleanup();
  }
});

function generateTotpForTest(secretBase32: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = secretBase32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const key = Buffer.from(bytes);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

test('2FA TOTP QR setup, multi-company switching, and Essencial plan limits enforcement', async () => {
  const { baseUrl, cleanup } = await startIsolatedTestServer();
  try {
    const reg = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Marina Dona',
        email: 'marina@grupo.com.br',
        senha: 'SenhaForte123',
        empresaNome: 'Matriz Marina',
        segmento: 'servicos',
        aceiteLgpd: true,
      }),
    });
    assert.equal(reg.status, 201);
    const regData = await reg.json();
    const token1 = regData.token as string;
    const emp1Id = regData.user.empresaId as string;

    // 1. Setup e ativação real de 2FA TOTP com QR Code
    const setupRes = await fetch(`${baseUrl}/api/v1/auth/2fa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert.equal(setupRes.status, 200);
    const setupData = await setupRes.json();
    assert.ok(setupData.secret);
    assert.ok(String(setupData.otpauthUrl).startsWith('otpauth://totp/'));
    assert.ok(String(setupData.qrDataUrl).startsWith('data:image/png;base64,'));

    const validCode = generateTotpForTest(setupData.secret);
    const enableRes = await fetch(`${baseUrl}/api/v1/auth/2fa/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ code: validCode }),
    });
    assert.equal(enableRes.status, 200);

    // Login sem código pede 2FA (202); código errado falha (401); código RFC 6238 entra (200)
    const loginNo2fa = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'marina@grupo.com.br', senha: 'SenhaForte123' }),
    });
    assert.equal(loginNo2fa.status, 202);

    const loginBad2fa = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'marina@grupo.com.br', senha: 'SenhaForte123', totpCode: '000000' }),
    });
    assert.equal(loginBad2fa.status, 401);

    const loginGood2fa = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'marina@grupo.com.br',
        senha: 'SenhaForte123',
        totpCode: generateTotpForTest(setupData.secret),
      }),
    });
    assert.equal(loginGood2fa.status, 200);

    // 2. Multi-empresa: usuário cria 2ª empresa isolada e alterna entre elas
    const newCoRes = await fetch(`${baseUrl}/api/v1/tenant/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ empresaNome: 'Filial Sul', segmento: 'comercio' }),
    });
    assert.equal(newCoRes.status, 201);
    const newCoData = await newCoRes.json();
    assert.notEqual(newCoData.user.empresaId, emp1Id);
    assert.equal(newCoData.user.companies.length, 2);

    const switchBack = await fetch(`${baseUrl}/api/v1/auth/switch-company`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newCoData.token}`,
      },
      body: JSON.stringify({ empresaId: emp1Id }),
    });
    assert.equal(switchBack.status, 200);
    const switchData = await switchBack.json();
    assert.equal(switchData.user.empresaId, emp1Id);

    // 3. Limite de plano Essencial: máximo 2 usuários e bloqueio de perfil Contador
    const downgrade = await fetch(`${baseUrl}/api/v1/tenant`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${switchData.token}`,
      },
      body: JSON.stringify({
        dataset: {
          ...switchData.dataset,
          empresa: { ...switchData.dataset.empresa, plano: 'Essencial' },
        },
      }),
    });
    assert.equal(downgrade.status, 200);

    const blockedContador = await fetch(`${baseUrl}/api/v1/tenant/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${switchData.token}`,
      },
      body: JSON.stringify({
        nome: 'Contador Bloqueado',
        email: 'cont@essencial.com.br',
        senha: 'Senha123',
        papel: 'leitura',
      }),
    });
    assert.equal(blockedContador.status, 403);
  } finally {
    await cleanup();
  }
});

