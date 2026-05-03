import { describe, it, expect } from 'vitest';
import {
  LandBuildingFormSchema,
  CondominiumFormSchema,
  HypothesisCostItemSchema,
  HypothesisCostItemKindEnum,
  landBuildingFormDefaults,
  condominiumFormDefaults,
} from '../hypothesisForm';

// ─── Cost item schema ─────────────────────────────────────────────────────────

describe('HypothesisCostItemSchema', () => {
  it('accepts a valid L&B cost-of-building row', () => {
    const result = HypothesisCostItemSchema.safeParse({
      id: null,
      category: 'CostOfBuilding',
      kind: 'BuildingConstruction',
      description: 'Building Area B01',
      displaySequence: 0,
      amount: 1500000,
      modelName: 'A01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty description', () => {
    const result = HypothesisCostItemSchema.safeParse({
      id: null,
      category: 'CostOfBuilding',
      kind: 'BuildingConstruction',
      description: '',
      displaySequence: 0,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = HypothesisCostItemSchema.safeParse({
      category: 'InvalidCategory',
      description: 'Test',
      displaySequence: 0,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid categories', () => {
    const categories = [
      'CostOfBuilding',
      'ProjectDevCost',
      'ProjectCost',
      'GovernmentTax',
      'HardCost',
      'SoftCost',
      'CondoGovTax',
    ] as const;

    for (const category of categories) {
      const result = HypothesisCostItemSchema.safeParse({
        category,
        description: 'Test item',
        displaySequence: 0,
        amount: 100,
      });
      expect(result.success, `category ${category} should be valid`).toBe(true);
    }
  });

  it('defaults kind to Other when omitted', () => {
    const result = HypothesisCostItemSchema.safeParse({
      category: 'ProjectCost',
      description: 'Ad-hoc item',
      displaySequence: 0,
      amount: 50000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe('Other');
    }
  });

  it('preserves explicit kind value when provided', () => {
    const result = HypothesisCostItemSchema.safeParse({
      category: 'ProjectCost',
      kind: 'AllocationPermitFee',
      description: 'Allocation Permit',
      displaySequence: 0,
      amount: 50000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe('AllocationPermitFee');
    }
  });

  it('rejects invalid kind value', () => {
    const result = HypothesisCostItemSchema.safeParse({
      category: 'ProjectCost',
      kind: 'NotARealKind',
      description: 'Test',
      displaySequence: 0,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ─── CostItemKind enum ────────────────────────────────────────────────────────

describe('HypothesisCostItemKindEnum', () => {
  const allKinds = [
    'PublicUtilityConstruction',
    'LandFilling',
    'AllocationPermitFee',
    'LandTitleDeedDivisionFee',
    'ProfessionalFee',
    'AdminFee',
    'SellingAdvertising',
    'TransferFee',
    'SpecificBusinessTax',
    'CondoBuildingConstruction',
    'Furniture',
    'ExternalUtilities',
    'CondoTitleDeedFee',
    'EIA',
    'CondoRegistrationFee',
    'Other',
    'BuildingConstruction',
  ] as const;

  it('accepts all known kind values', () => {
    for (const kind of allKinds) {
      const result = HypothesisCostItemKindEnum.safeParse(kind);
      expect(result.success, `kind ${kind} should be valid`).toBe(true);
    }
  });

  it('rejects unknown kind value', () => {
    expect(HypothesisCostItemKindEnum.safeParse('Unknown').success).toBe(false);
  });
});

// ─── Land & Building form schema ──────────────────────────────────────────────

describe('LandBuildingFormSchema', () => {
  it('accepts default values', () => {
    const result = LandBuildingFormSchema.safeParse(landBuildingFormDefaults);
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated form', () => {
    const result = LandBuildingFormSchema.safeParse({
      summary: {
        totalArea: 1200,
        sellingAreaPercent: 80,
        publicUtilityAreaPercent: 20,
        estSalesPeriod: 5,
        publicUtilityRatePerSqWa: 3000,
        landFillingRatePerSqWa: 500,
        contingencyPercent: 3,
        estConstructionPeriod: 4,
        allocationPermitFee: 50000,
        landTitleFeePerPlot: 2000,
        professionalFeePerMonth: 80000,
        adminCostPerMonth: 50000,
        sellingAdvPercent: 3,
        projectContingencyPercent: 3,
        transferFeePercent: 2,
        specificBizTaxPercent: 3.3,
        riskPremiumPercent: 10,
        discountRate: 8,
        remark: 'Test run',
      },
      costOfBuildingItems: [
        {
          id: null,
          category: 'CostOfBuilding',
          kind: 'BuildingConstruction',
          description: 'Construction',
          displaySequence: 0,
          amount: 1500000,
          modelName: 'A01',
        },
      ],
      otherCostItems: [],
      remark: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative area', () => {
    const result = LandBuildingFormSchema.safeParse({
      ...landBuildingFormDefaults,
      summary: { ...landBuildingFormDefaults.summary, totalArea: -10 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects percent > 100', () => {
    const result = LandBuildingFormSchema.safeParse({
      ...landBuildingFormDefaults,
      summary: { ...landBuildingFormDefaults.summary, sellingAreaPercent: 150 },
    });
    expect(result.success).toBe(false);
  });
});

// ─── Condominium form schema ──────────────────────────────────────────────────

describe('CondominiumFormSchema', () => {
  it('accepts default values', () => {
    const result = CondominiumFormSchema.safeParse(condominiumFormDefaults);
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated form', () => {
    const result = CondominiumFormSchema.safeParse({
      summary: {
        areaTitleDeed: 400,
        far: 40,
        totalBuildingArea: 64000,
        estSalesDurationMonths: 36,
        condoBuildingCostPerSqM: 25000,
        furniturePerUnit: 300000,
        externalUtilities: 5000000,
        hardCostContingencyPercent: 3,
        estConstructionPeriodMonths: 30,
        professionalFeePerMonth: 300000,
        adminCostPerMonth: 200000,
        sellingAdvPercent: 5,
        titleDeedFee: 2000000,
        eiaCost: 3000000,
        condoRegistrationFee: 1000000,
        otherExpensesPercent: 2,
        transferFeePercent: 1,
        specificBizTaxPercent: 3.3,
        riskProfitPercent: 15,
        discountRate: 8,
        remark: null,
      },
      remark: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative building area', () => {
    const result = CondominiumFormSchema.safeParse({
      ...condominiumFormDefaults,
      summary: { ...condominiumFormDefaults.summary, totalBuildingArea: -1 },
    });
    expect(result.success).toBe(false);
  });

  it('default transfer fee percent is 1', () => {
    expect(condominiumFormDefaults.summary.transferFeePercent).toBe(1);
  });

  it('E03 FAR accepts decimal values like 4.5 (precision widened BE-side)', () => {
    // BE changed E03FAR from decimal(3,0) to decimal(7,2) — schema must not block decimals.
    const result = CondominiumFormSchema.safeParse({
      ...condominiumFormDefaults,
      summary: { ...condominiumFormDefaults.summary, far: 4.5 },
    });
    expect(result.success).toBe(true);
  });

  it('E03 FAR still rejects negative values', () => {
    const result = CondominiumFormSchema.safeParse({
      ...condominiumFormDefaults,
      summary: { ...condominiumFormDefaults.summary, far: -1 },
    });
    expect(result.success).toBe(false);
  });
});
