import { SegmentKey } from '../types/finance';

export interface SegmentOption {
  value: SegmentKey;
  label: string;
  shortLabel: string;
}

export const SEGMENT_OPTIONS: SegmentOption[] = [
  { value: 'servicos', label: 'Prestação de Serviços', shortLabel: 'Serviços' },
  { value: 'comercio', label: 'Comércio Local', shortLabel: 'Comércio' },
  { value: 'alimentacao', label: 'Alimentação & Delivery', shortLabel: 'Alimentação' },
  { value: 'sites', label: 'Sites & Presença Digital', shortLabel: 'Sites' },
  { value: 'saas', label: 'SaaS & Assinaturas', shortLabel: 'SaaS' },
  { value: 'software', label: 'Software & Tecnologia', shortLabel: 'Software' },
];

const SEGMENT_VALUES = new Set<SegmentKey>(SEGMENT_OPTIONS.map((option) => option.value));

export function isSegmentKey(value: unknown): value is SegmentKey {
  return typeof value === 'string' && SEGMENT_VALUES.has(value as SegmentKey);
}

export function getSegmentLabel(segment: SegmentKey): string {
  return SEGMENT_OPTIONS.find((option) => option.value === segment)?.label || 'Prestação de Serviços';
}
