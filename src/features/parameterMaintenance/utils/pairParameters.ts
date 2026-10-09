export interface ParameterItem {
  parId: number;
  group: string;
  country: string;
  language: string;
  code: string;
  description: string;
  isActive: boolean;
  seqNo: number;
}

export interface ParameterPairRow {
  code: string;
  descriptionTh: string;
  descriptionEn: string;
  country: string;
  seqNo: number;
  isActive: boolean;
  parIdTh: number;
  parIdEn: number;
}

export function pairParameters(parameters: ParameterItem[]): ParameterPairRow[] {
  const map = new Map<string, { th?: ParameterItem; en?: ParameterItem }>();

  for (const p of parameters) {
    const existing = map.get(p.code) ?? {};
    if (p.language === 'TH') {
      map.set(p.code, { ...existing, th: p });
    } else if (p.language === 'EN') {
      map.set(p.code, { ...existing, en: p });
    } else {
      if (!existing.th) map.set(p.code, { ...existing, th: p });
    }
  }

  const rows: ParameterPairRow[] = [];
  for (const [code, pair] of map.entries()) {
    const base = pair.th ?? pair.en!;
    rows.push({
      code,
      descriptionTh: pair.th?.description ?? '',
      descriptionEn: pair.en?.description ?? '',
      country: base.country,
      seqNo: base.seqNo,
      isActive: base.isActive,
      parIdTh: pair.th?.parId ?? 0,
      parIdEn: pair.en?.parId ?? 0,
    });
  }

  return rows.sort((a, b) => a.seqNo - b.seqNo || a.code.localeCompare(b.code));
}
