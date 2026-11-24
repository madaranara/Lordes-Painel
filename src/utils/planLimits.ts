import { EmpresaConfig } from '../types/finance';

export type PlanTier = EmpresaConfig['plano'];

export interface PlanEntitlements {
  plano: PlanTier;
  precoMensalCents: number;
  maxUsers: number;
  maxCompanies: number;
  allowOfx: boolean;
  allowPixWhatsapp: boolean;
  allowContador: boolean;
  allowSiteLeads: boolean;
  allowWhiteLabel: boolean;
  resumo: string;
}

const ENTITLEMENTS_MAP: Record<PlanTier, PlanEntitlements> = {
  Essencial: {
    plano: 'Essencial',
    precoMensalCents: 6900,
    maxUsers: 2,
    maxCompanies: 1,
    allowOfx: false,
    allowPixWhatsapp: false,
    allowContador: false,
    allowSiteLeads: false,
    allowWhiteLabel: false,
    resumo: 'Até 2 usuários, 1 empresa, painel financeiro completo, lançamentos, DRE e exportação CSV/XLSX/PDF.',
  },
  Profissional: {
    plano: 'Profissional',
    precoMensalCents: 12900,
    maxUsers: 5,
    maxCompanies: 3,
    allowOfx: true,
    allowPixWhatsapp: true,
    allowContador: true,
    allowSiteLeads: true,
    allowWhiteLabel: false,
    resumo: 'Até 5 usuários, até 3 empresas, conciliação OFX, Pix/WhatsApp, leitura para contador e integração Site ↔ CRM.',
  },
  Premium: {
    plano: 'Premium',
    precoMensalCents: 24900,
    maxUsers: 15,
    maxCompanies: 10,
    allowOfx: true,
    allowPixWhatsapp: true,
    allowContador: true,
    allowSiteLeads: true,
    allowWhiteLabel: true,
    resumo: 'Até 15 usuários, até 10 empresas, Site + CRM integrados, multi-unidade e identidade White-label completa (logo e cores).',
  },
};

export function getPlanEntitlements(plano: PlanTier | string | undefined): PlanEntitlements {
  if (plano === 'Essencial' || plano === 'Profissional' || plano === 'Premium') {
    return ENTITLEMENTS_MAP[plano];
  }
  return ENTITLEMENTS_MAP.Profissional;
}
