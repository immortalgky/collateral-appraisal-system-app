# Frontend Implementation Guide — Pricing Analysis (WQS, SaleGrid, DirectComparison)

> **Standalone reference for the frontend team.** Contains everything needed to implement the 3 pricing analysis method UIs.
>
> **Backend status:** All endpoints and models described here are fully implemented and passing build.

---

## Architecture Overview

- **3 pricing methods** under Market Approach: WQS, SaleGrid, DirectComparison
- **3-step UI flow** shared across all methods: Step 1 (Comparative Analysis) → Step 2 (Calculation) → Step 3 (Final Value)
- **Dual calculation**: Frontend calculates real-time for UX; Backend recalculates on SAVE as gate of truth
- **Frontend owns factor initialization**: Template selection + factor list = frontend only, no backend call needed
- **Atomic save**: All data sent in one PUT request per method

---

## API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Get comparative data | GET | `/pricing-analysis/{id}/methods/{methodId}/comparative-factors` |
| Save all data (atomic) | PUT | `/pricing-analysis/{id}/methods/{methodId}/comparative-analysis` |
| Link a comparable | POST | `/pricing-analysis/{pricingAnalysisId}/methods/{methodId}/comparables` |
| Unlink a comparable | DELETE | `/pricing-analysis/{pricingAnalysisId}/methods/{methodId}/comparables/{linkId}` |
| Set final value | POST | `/pricing-analysis/{id}/methods/{methodId}/final-value` |
| Update final value | PUT | `/pricing-analysis/{id}/final-values/{valueId}` |
| Recalculate factors | POST | `/pricing-analysis/{id}/methods/{methodId}/recalculate-factors` |
| Reset method | DELETE | `/pricing-analysis/{id}/methods/{methodId}/reset` |
| Get market comparable detail | GET | `/market-comparables/{id}` |
| Get appraisal comparables | GET | `/appraisals/{appraisalId}/comparables` |
| Get templates list | GET | `/comparative-analysis-templates` |
| Get template by ID | GET | `/comparative-analysis-templates/{id}` |
| Get factors list | GET | `/market-comparable-factors` |

---

## Data Models (API Response Shapes)

### GET `/appraisals/{appraisalId}/comparables` → AppraisalComparableDto[]
Returns only comparables linked to this specific appraisal (NOT all comparables in the system).
```json
{
  "comparables": [
    {
      "id": "guid",
      "appraisalId": "guid",
      "marketComparableId": "guid",
      "sequenceNumber": 1,
      "weight": 0.33,
      "originalPricePerUnit": 50000,
      "adjustedPricePerUnit": 47500,
      "totalAdjustmentPct": -5.0,
      "weightedValue": 15675,
      "selectionReason": "string?",
      "notes": "string?",
      "comparableNumber": "C001",
      "comparablePropertyType": "Land",
      "comparableSurveyName": "Survey Name",
      "comparableInfoDateTime": "2025-01-15T00:00:00",
      "comparableSourceInfo": "string?",
      "comparableOfferPrice": 4900000,
      "comparableOfferPriceAdjustmentPercent": 5.0,
      "comparableOfferPriceAdjustmentAmount": null,
      "comparableSalePrice": null,
      "comparableSaleDate": null,
      "adjustments": [
        {
          "id": "guid",
          "adjustmentCategory": "string",
          "adjustmentType": "string",
          "adjustmentPercent": -2.5,
          "adjustmentDirection": "string",
          "subjectValue": "string",
          "comparableValue": "string",
          "justification": "string"
        }
      ]
    }
  ]
}
```

### GET `/market-comparables/{id}` → MarketComparableDetailDto
```json
{
  "id": "guid",
  "comparableNumber": "C001",
  "propertyType": "Land",
  "surveyName": "Survey Name",
  "infoDateTime": "2025-01-15T00:00:00",
  "sourceInfo": "string?",
  "offerPrice": 4900000,
  "offerPriceAdjustmentPercent": 5.0,
  "offerPriceAdjustmentAmount": null,
  "salePrice": null,
  "saleDate": null,
  "notes": "string?",
  "templateId": "guid?",
  "factorData": [
    {
      "id": "guid",
      "factorId": "guid",
      "factorCode": "LOCATION",
      "fieldName": "Address/Location",
      "dataType": "Text",
      "fieldLength": null,
      "fieldDecimal": null,
      "parameterGroup": null,
      "value": "123 Main St",
      "otherRemarks": null,
      "translations": [{ "language": "th", "factorName": "ที่ตั้ง" }]
    }
  ],
  "images": [{ "id": "guid", "galleryPhotoId": "guid", "displaySequence": 1, "title": "Front View", "description": null }]
}
```

### GET `/comparative-analysis-templates/{id}` → Template
```json
{
  "id": "guid",
  "templateCode": "LAND_WQS",
  "templateName": "Land WQS Template",
  "propertyType": "Land",
  "description": "string?",
  "isActive": true,
  "factors": [
    {
      "id": "guid",
      "factorId": "guid",
      "displaySequence": 1,
      "isMandatory": true,
      "defaultWeight": 2.0,
      "defaultIntensity": 10.0
    }
  ]
}
```

**Important:**
- `factorId` links to `MarketComparableFactor` (with factorCode, fieldName, dataType)
- `defaultWeight` = ClusterWeight in WQS (0-100 range)
- `defaultIntensity` = WQS only, default Intensity value

### GET `.../comparative-factors` → GetComparativeFactorsResult
```json
{
  "pricingAnalysisId": "guid",
  "methodId": "guid",
  "methodType": "WQS",
  "linkedComparables": [
    { "linkId": "guid", "marketComparableId": "guid", "displaySequence": 1, "comparableName": "Survey 1", "comparableCode": "C001" }
  ],
  "comparativeFactors": [
    { "id": "guid", "factorId": "guid", "factorName": "Address", "factorCode": "LOCATION", "displaySequence": 1, "isSelectedForScoring": true, "remarks": null }
  ],
  "factorScores": [
    {
      "id": "guid",
      "factorId": "guid",
      "factorName": "Address",
      "marketComparableId": "guid or null",
      "comparableName": "Survey 1 or null",
      "factorWeight": 2.0,
      "displaySequence": 1,
      "value": "123 Main St",
      "score": 7,
      "weightedScore": 14,
      "adjustmentPct": null,
      "remarks": null,
      "intensity": 10,
      "comparisonResult": null,
      "adjustmentAmt": null
    }
  ],
  "calculations": [
    {
      "id": "guid",
      "marketComparableId": "guid",
      "comparableName": "Survey 1",
      "offeringPrice": 4900000,
      "offeringPriceUnit": "PerUnit",
      "adjustOfferPricePct": 5.0,
      "adjustOfferPriceAmt": null,
      "sellingPrice": null,
      "sellingPriceUnit": null,
      "buySellYear": null,
      "buySellMonth": null,
      "adjustedPeriodPct": null,
      "cumulativeAdjPeriod": null,
      "landAreaDeficient": -6.0,
      "landAreaDeficientUnit": "SqWa",
      "landPrice": 30000,
      "landValueAdjustment": -180000,
      "usableAreaDeficient": 0,
      "usableAreaDeficientUnit": "SqM",
      "usableAreaPrice": 20000,
      "buildingValueAdjustment": 0,
      "totalFactorDiffPct": -5.0,
      "totalFactorDiffAmt": -223750,
      "totalAdjustedValue": 4251250,
      "weight": 0.33333,
      "weightedAdjustedValue": 1417083
    }
  ],
  "rsqResult": {
    "coefficientOfDecision": 0.9965,
    "standardError": 49801.98,
    "intersectionPoint": 20823921.85,
    "slope": -237184.21,
    "rsqFinalValue": 4932579,
    "lowestEstimate": 4882777,
    "highestEstimate": 4982381
  }
}
```

**Notes:**
- `rsqResult` is only present for WQS methods, `null` for SaleGrid/DirectComparison
- `weight` and `weightedAdjustedValue` in calculations are only present for SaleGrid
- `intensity` in factorScores is only for WQS
- `comparisonResult` and `adjustmentAmt` in factorScores are for SaleGrid/DirectComparison

### POST `.../comparables` → LinkComparableResult
**Request:**
```json
{ "marketComparableId": "guid", "displaySequence": 1 }
```
**Response** (returns seeded pricing data from MarketComparable):
```json
{
  "linkId": "guid",
  "calculationId": "guid",
  "offerPrice": 4900000,
  "offerPriceAdjustmentPercent": 5.0,
  "offerPriceAdjustmentAmount": null,
  "salePrice": null,
  "saleDate": null
}
```

---

## Complete User Workflow (Step by Step)

### Step 0: Setup
1. User opens a PropertyGroup's pricing analysis
2. System shows available methods (WQS, SaleGrid, DirectComparison) under Market Approach
3. User selects a method → navigates to the 3-step flow

### Step 1: Comparative Analysis

**1a. Select Template (frontend-only)**
- User picks Collateral Type + Template from dropdowns
- Frontend calls `GET /comparative-analysis-templates/{id}`
- Initialize factor rows from `template.factors[]` using `factorId`, `displaySequence`, `defaultWeight`, `defaultIntensity` (WQS only)
- Each factor has a corresponding `MarketComparableFactor` (with `factorCode`, `fieldName`, `dataType`)

**1b. Select Market Comparables (backend call)**
- User clicks "+" to add Survey 1/2/3
- Frontend shows searchable list from `GET /appraisals/{appraisalId}/comparables` (only comparables linked to this appraisal, NOT all comparables in system)
- On select: `POST .../comparables` with `{ marketComparableId, displaySequence }`
- Backend returns `linkId` + `calculationId` + seeded pricing data

**1c. Populate Comparative Table (frontend reads, no backend call)**
- For each linked survey: `GET /market-comparables/{id}` → get `factorData[]`
- Match `factorData[].factorId` to template factor rows → populate survey columns
- For collateral column: read from existing `AppraisalProperty` data (already in appraisal context)
  - Land area → `LandAppraisalDetail` → land title areas
  - Usable area → `BuildingAppraisalDetail.TotalBuildingArea`
  - Other fields mapped by factor config

**1d. Add More Factors**
- User can add factors beyond template defaults
- Show factor picker from `GET /market-comparable-factors`

**UI Layout — Step 1:**
```
| Factor           | Collateral | Survey 1  | Survey 2  | Survey 3  |
|------------------|------------|-----------|-----------|-----------|
| Address/Location | value      | value     | value     | value     |
| Plot Location    | value      | value     | value     | value     |
| Land Area        | 65         | 71        | 65        | 73        |
| Usable Area      | 206        | 207       | 206       | 206       |
| Offering Price   | -          | 4,900,000 | 4,700,000 | 4,900,000 |
| [+ Add Factor]   |            |           |           |           |
```

---

### Step 2: Calculation (differs per method)

#### Initial Price Section (shared by all 3 methods)

Three mutually exclusive paths per survey — show based on available data:

**Path A — Offer Price + % adjustment:**
```
OfferingPrice:         [from MarketComparable.OfferPrice]
Adjust Offer Price %:  [editable, from OfferPriceAdjustmentPercent]
→ AdjustedPrice = OfferPrice × (1 - AdjustPct / 100)
```

**Path B — Offer Price + amount adjustment:**
```
OfferingPrice:             [from MarketComparable.OfferPrice]
Adjust Offer Price (Amt):  [editable, from OfferPriceAdjustmentAmount]
→ AdjustedPrice = AdjustmentAmount (direct value)
```

**Path C — Selling Price + time adjustment:**
```
SellingPrice:                  [from MarketComparable.SalePrice]
Number of Years:               [calculated: now - SaleDate, in years]
Month Display:                 [from SaleDate month/year]
Adjusted Period %:             [editable — annual rate]
Cumulative Adj Period %:       = NumberOfYears × AdjustedPeriodPct
→ AdjustedPrice = SellingPrice × (1 + CumulativeAdjPeriod / 100)
```

---

#### Step 2 — WQS Specific

**Scoring Table:**
```
| Factor          | ClusterWeight | Intensity | CalcScore | S1(Score,WS) | S2(Score,WS) | S3(Score,WS) | Collateral(Score,WS) |
|-----------------|--------------|-----------|-----------|--------------|--------------|--------------|---------------------|
| Address         | 1            | 10        | 10        | 7, 7         | 7, 7         | 7, 7         | 7, 7                |
| Plot Location   | 2            | 10        | 20        | 7, 14        | 7, 14        | 7, 14        | 7, 14               |
| Summation       | 10           |           | 100       | 68           | 71           | 66           | 67                  |
```

**Formulas:**
```
CalcScore = ClusterWeight × Intensity
WeightedScore = FactorScore × ClusterWeight
Summation = SUM(WeightedScores for all factors per survey/collateral)
```

**Scoring guide:** 1-2 Very Low, 3-4 Fair, 5-6 Average, 7-8 Good, 9-10 Very Good

**RSQ Section (after Initial Price):**
- Data points: `[(S1_Summation, S1_AdjustedPrice), (S2_Sum, S2_Adj), (S3_Sum, S3_Adj)]`
- Linear regression: `Y = Intercept + Slope × X`
- Display scatter plot + regression line

```
| Coefficient of decision (R²) | 0.9965         |
| Standard error                | 49,801.98      |
| Intersection point            | 20,823,921.85  |
| Slope                         | -237,184.21    |
| Final value                   | 4,932,579      |  ← Intercept + Slope × CollateralSummation
| Lowest estimate               | 4,882,777      |  ← FinalValue - (t_critical × StdError)
| Highest estimate              | 4,982,381      |  ← FinalValue + (t_critical × StdError)
```

---

#### Step 2 — SaleGrid Specific

**Factor Comparison Table:**
Each factor per survey gets a dropdown: Equal / Inferior / Superior
```
| Factor           | S1 Value | S1 Comparison | S2 Value | S2 Comparison | Collateral |
|------------------|----------|---------------|----------|---------------|------------|
| Address          | text     | [Equal ▼]     | text     | [Equal ▼]     | text       |
| Building Cond.   | text     | [Equal ▼]     | text     | [Inferior ▼]  | text       |
```

**2nd Revision Section (SaleGrid & DirectComparison only):**
```
LandAreaDeficient     = CollateralLandArea - SurveyLandArea
LandValueAdj          = LandAreaDeficient × LandPrice          // LandPrice = user input
UsableAreaDeficient   = CollateralUsableArea - SurveyUsableArea
BuildingValueAdj      = UsableAreaDeficient × UsableAreaPrice   // UsableAreaPrice = user input
TotalSecondRevision   = InitialPrice + LandValueAdj + BuildingValueAdj
```

**Factor Adjustments (per factor per survey):**
```
AdjustmentAmt      = TotalSecondRevision × (AdjustmentPct / 100)
TotalFactorDiffPct = SUM(all factor AdjustmentPct)
TotalFactorDiffAmt = SUM(all factor AdjustmentAmt)
AdjustedValue      = TotalSecondRevision + TotalFactorDiffAmt
```

**Adjust Weight Section (SaleGrid ONLY):**
```
WeightedAdjustedValue = AdjustedValue × Weight    // e.g., 0.33333
FinalValue = SUM(all WeightedAdjustedValues)
```

---

#### Step 2 — DirectComparison Specific

**Identical to SaleGrid** except:
- **NO Adjust Weight section** — no Weight, no WeightedAdjustedValue
- FinalValue = **appraiser-selected** (user picks from adjusted values)

---

### Step 3: Adjust Final Value

**WQS:**
```
| Coefficient of decision | 0.9965      |
| Appraisal Price         | 4,933,000   | Baht |
| Appraisal Price Rounded | [4,930,000] | Baht | [3,000] differentiate |
```

**SaleGrid / DirectComparison:**
```
| Appraisal Price         | 4,300,000   | Baht |
| Appraisal Price Rounded | [4,300,000] | Baht | [0] differentiate |
```

Formula: `PriceDifferentiate = AppraisalPrice - AppraisalPriceRounded`

**Buttons:** CLOSE | RESET | SAVE

---

## Save Payload (PUT `.../comparative-analysis`)

Frontend sends ALL data in one atomic request:

```json
{
  "comparativeFactors": [
    {
      "id": null,
      "factorId": "guid",
      "displaySequence": 1,
      "isSelectedForScoring": true,
      "remarks": null
    }
  ],
  "factorScores": [
    {
      "id": null,
      "factorId": "guid",
      "marketComparableId": "guid or null",
      "factorWeight": 1,
      "displaySequence": 1,
      "value": "text",
      "score": 7,
      "intensity": 10,
      "adjustmentPct": null,
      "adjustmentAmt": null,
      "comparisonResult": null,
      "remarks": null
    }
  ],
  "calculations": [
    {
      "marketComparableId": "guid",
      "offeringPrice": 4900000,
      "offeringPriceUnit": "PerUnit",
      "adjustOfferPricePct": 5.00,
      "adjustOfferPriceAmt": null,
      "sellingPrice": null,
      "sellingPriceUnit": null,
      "buySellYear": null,
      "buySellMonth": null,
      "adjustedPeriodPct": null,
      "cumulativeAdjPeriod": null,
      "landAreaDeficient": -6.00,
      "landAreaDeficientUnit": "SqWa",
      "landPrice": 30000,
      "landValueAdjustment": -180000,
      "usableAreaDeficient": 0,
      "usableAreaDeficientUnit": "SqM",
      "usableAreaPrice": 20000,
      "buildingValueAdjustment": 0,
      "totalFactorDiffPct": -5.00,
      "totalFactorDiffAmt": -223750,
      "totalAdjustedValue": 4251250,
      "weight": 0.33333,
      "weightedAdjustedValue": 1417083
    }
  ]
}
```

Backend recalculates all derived fields and returns updated result. **Frontend must sync with backend response.**

---

## Set Final Value Payload (POST `.../final-value`)

```json
{
  "finalValue": 4932579,
  "finalValueRounded": 4933000,
  "includeLandArea": true,
  "landArea": 65,
  "appraisalPrice": 4933000,
  "appraisalPriceRounded": 4930000,
  "priceDifferentiate": 3000,
  "hasBuildingCost": false,
  "buildingCost": null,
  "appraisalPriceWithBuilding": null,
  "appraisalPriceWithBuildingRounded": null
}
```

---

## Update Final Value Payload (PUT `.../final-values/{valueId}`)

Same shape as Set Final Value:
```json
{
  "finalValue": 4932579,
  "finalValueRounded": 4933000,
  "includeLandArea": true,
  "landArea": 65,
  "appraisalPrice": 4933000,
  "appraisalPriceRounded": 4930000,
  "priceDifferentiate": 3000,
  "hasBuildingCost": false,
  "buildingCost": null,
  "appraisalPriceWithBuilding": null,
  "appraisalPriceWithBuildingRounded": null
}
```

---

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         FRONTEND                               │
│                                                                │
│  1. GET /comparative-analysis-templates/{id}                   │
│     → Load template factors (FactorId, FieldName, Weight)      │
│     → Initialize factor rows in UI (no backend needed)         │
│                                                                │
│  2. GET /appraisals/{appraisalId}/comparables                  │
│     → Get comparables linked to THIS appraisal only            │
│     → Show picker for user to select Survey 1/2/3              │
│                                                                │
│  3. POST .../comparables                                       │
│     → Link selected comparable to pricing method               │
│     ← Backend returns linkId + calculationId + seeded pricing  │
│                                                                │
│  4. GET /market-comparables/{id}                               │
│     → Read factorData[] (EAV: FactorId → Value)                │
│     → Match factorData by FactorId to populate survey columns  │
│     → Read AppraisalProperty for collateral column             │
│                                                                │
│  5. User edits scores/weights/adjustments                      │
│     → Frontend calculates ALL derived values in real-time      │
│                                                                │
│  6. PUT .../comparative-analysis                               │
│     → Send full payload (factors + scores + calculations)      │
│     ← Backend recalculates & returns verified results          │
│     → Frontend syncs state with backend response               │
│                                                                │
│  7. POST .../final-value                                       │
│     → Send final appraisal values + PriceDifferentiate         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Method Differences Summary

| Feature | WQS | SaleGrid | DirectComparison |
|---------|-----|----------|-----------------|
| Factor scoring (Score, WeightedScore) | Yes | No | No |
| ClusterWeight × Intensity | Yes | No | No |
| Summation of weighted scores | Yes | No | No |
| RSQ regression (R², scatter chart) | Yes | No | No |
| Factor comparison dropdown (Equal/Inferior/Superior) | No | Yes | Yes |
| 2nd Revision (land/building area adjustments) | No | Yes | Yes |
| Per-factor adjustment % and amount | No | Yes | Yes |
| Adjust Weight (reliability weighting) | No | Yes | No |
| Final Value derivation | RSQ regression | Weighted average | Appraiser-selected |

---

## Key Frontend Implementation Notes

1. **FactorId is the universal key** — use it to match template factors → MarketComparableData → PricingFactorScore
2. **MarketComparableId = null** in FactorScores means "Collateral" (the property being appraised)
3. **id = null** in save payload means "create new"; existing Guid means "update existing"
4. **Factor data is read-only from MarketComparable** — the `value` field in FactorScores stores a snapshot
5. **LandPrice and UsableAreaPrice are user inputs** — same value applied across all surveys
6. **Weight values for SaleGrid** typically sum to 1.0 (e.g., 3 surveys × 0.33333)
7. **t_critical for RSQ** — use Student's t-distribution critical value (typically ~4.303 for n=3, df=1, 95% confidence)
8. **All monetary values are in Baht** — display with thousand separators
9. **On RESET** — call `DELETE /pricing-analysis/{id}/methods/{methodId}/reset`, then re-initialize from template
10. **Backend recalculates on save** — after `PUT .../comparative-analysis`, the backend recalculates all derived fields (AdjustmentAmt, TotalFactorDiff, WeightedAdjustedValue, RSQ regression, etc.). Frontend should sync its state with the backend response to stay in sync.
