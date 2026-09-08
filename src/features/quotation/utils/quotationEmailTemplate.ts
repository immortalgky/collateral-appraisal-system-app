export interface QuotationTitleInput {
  titleFamily: string;
  titleNumber?: string | null;
  buildingType?: string | null;
  areaRai?: number | null;
  areaNgan?: number | null;
  areaSquareWa?: number | null;
  condoName?: string | null;
  roomNumber?: string | null;
  usableArea?: number | null;
  installationStatus?: string | null;
  numberOfMachine?: number | null;
  dopaSubDistrictName?: string | null;
  dopaDistrictName?: string | null;
  dopaProvinceName?: string | null;
}

export interface QuotationEmailAppraisalInput {
  appraisalNumber?: string | null;
  customerName?: string | null;
  propertyType?: string | null;
  titles?: QuotationTitleInput[];
}

export interface BuildQuotationEmailHtmlParams {
  appraisals: QuotationEmailAppraisalInput[];
  targetTime: string;
  targetDate: string;
  adminFullName: string;
  propertyTypeDescription: (code: string | null | undefined) => string;
  buildingTypeDescription: (code: string | null | undefined) => string;
  machineStatusDescription: (code: string | null | undefined) => string;
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const LAND_BUILDING_LABELS: Record<string, string> = {
  LB: 'ที่ดินพร้อมสิ่งปลูกสร้าง',
  LS: 'สิทธิการเช่าที่ดินพร้อมสิ่งปลูกสร้าง',
};
const LAND_ONLY_LABELS: Record<string, string> = {
  L: 'ที่ดินเปล่า',
  LSL: 'สิทธการเช่าที่ดิน',
};
const CONDO_FAMILIES = new Set(['U', 'LSU']);
const MACHINE_FAMILIES = new Set(['MAC']);
const LAND_FAMILIES = new Set(['L', 'LB']);
const LEASE_LAND_FAMILIES = new Set(['LS', 'LSL']);
const BUILDING_ONLY_FAMILIES = new Set(['B', 'LSB']);
const LAND_OR_BUILDING_FAMILIES = new Set([
  ...LAND_FAMILIES,
  ...LEASE_LAND_FAMILIES,
  ...BUILDING_ONLY_FAMILIES,
]);

function sumThaiLandArea(titles: QuotationTitleInput[]): { rai: number; ngan: number; wa: number } {
  const totalSqWa = titles.reduce(
    (sum, t) =>
      sum +
      (Number(t.areaRai) || 0) * 400 +
      (Number(t.areaNgan) || 0) * 100 +
      (Number(t.areaSquareWa) || 0),
    0,
  );
  const rai = Math.floor(totalSqWa / 400);
  const afterRai = totalSqWa - rai * 400;
  const ngan = Math.floor(afterRai / 100);
  const wa = Math.round((afterRai - ngan * 100) * 100) / 100;
  return { rai, ngan, wa };
}

function formatDopaAddress(titles: QuotationTitleInput[]): string {
  const first = titles[0];
  if (!first) return '';
  return [
    first.dopaSubDistrictName ? `ตำบล ${first.dopaSubDistrictName}` : '',
    first.dopaDistrictName ? `อำเภอ ${first.dopaDistrictName}` : '',
    first.dopaProvinceName ? `จังหวัด ${first.dopaProvinceName}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildPropertyDescription(
  appraisal: QuotationEmailAppraisalInput,
  propertyTypeDescription: (code: string | null | undefined) => string,
  buildingTypeDescription: (code: string | null | undefined) => string,
  machineStatusDescription: (code: string | null | undefined) => string,
): string {
  const code = appraisal.propertyType ?? '';
  const allTitles = appraisal.titles ?? [];

  if (allTitles.length === 0) return propertyTypeDescription(appraisal.propertyType);

  if (LAND_OR_BUILDING_FAMILIES.has(code)) {
    const landTitles = allTitles.filter(
      t => LAND_FAMILIES.has(t.titleFamily) || LEASE_LAND_FAMILIES.has(t.titleFamily),
    );
    const buildingTitles = allTitles.filter(
      t =>
        BUILDING_ONLY_FAMILIES.has(t.titleFamily) ||
        t.titleFamily === 'LB' ||
        t.titleFamily === 'LS',
    );
    const buildingTypes = [
      ...new Set(buildingTitles.map(t => buildingTypeDescription(t.buildingType)).filter(Boolean)),
    ].join(', ');

    if (landTitles.length > 0) {
      const isLease = LEASE_LAND_FAMILIES.has(landTitles[0].titleFamily);
      const label = buildingTypes
        ? LAND_BUILDING_LABELS[isLease ? 'LS' : 'LB']
        : LAND_ONLY_LABELS[isLease ? 'LSL' : 'L'];
      const titleNumbers = landTitles
        .map(t => t.titleNumber)
        .filter(Boolean)
        .join(', ');
      const { rai, ngan, wa } = sumThaiLandArea(landTitles);
      return [
        buildingTypes ? `${label} (${buildingTypes})` : label,
        titleNumbers ? `โฉนดเลขที่ ${titleNumbers}` : '',
        `เนื้อที่ ${rai}-${ngan}-${wa}`,
        formatDopaAddress(landTitles),
      ]
        .filter(Boolean)
        .join(' ');
    }

    if (buildingTitles.length > 0) {
      return [
        buildingTypes ? `สิ่งปลูกสร้าง (${buildingTypes})` : 'สิ่งปลูกสร้าง',
        formatDopaAddress(buildingTitles),
      ]
        .filter(Boolean)
        .join(' ');
    }

    return propertyTypeDescription(appraisal.propertyType);
  }

  const titles = allTitles.filter(t => t.titleFamily === code);

  if (titles.length === 0) return propertyTypeDescription(appraisal.propertyType);

  if (CONDO_FAMILIES.has(code)) {
    const roomNumbers = titles
      .map(t => t.roomNumber)
      .filter(Boolean)
      .join(', ');
    const usableArea = titles.reduce((sum, t) => sum + (Number(t.usableArea) || 0), 0);
    return [
      roomNumbers ? `ห้องชุดเลขที่ ${roomNumbers}` : 'ห้องชุด',
      titles[0]?.condoName ? `โครงการ ${titles[0].condoName}` : '',
      usableArea ? `พื้นที่ ${usableArea} ตร.ม` : '',
      formatDopaAddress(titles),
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (MACHINE_FAMILIES.has(code)) {
    const statuses = [
      ...new Set(titles.map(t => machineStatusDescription(t.installationStatus)).filter(Boolean)),
    ].join(', ');
    const totalMachines = titles.reduce((sum, t) => sum + (Number(t.numberOfMachine) || 0), 0);
    return [
      statuses ? `เครื่องจักร (${statuses})` : 'เครื่องจักร',
      totalMachines ? `จำนวน ${totalMachines} เครื่อง` : '',
      formatDopaAddress(titles),
    ]
      .filter(Boolean)
      .join(' ');
  }

  return propertyTypeDescription(appraisal.propertyType);
}

const CELL_STYLE =
  'border:1px solid #999999;padding:6px 10px;word-break:break-word;overflow-wrap:break-word;';
const HEADER_CELL_STYLE = `${CELL_STYLE}background:#f2f4f6;font-weight:600;text-align:left;`;

const COLUMN_WIDTHS_PX = [60, 120, 210, 210];
const TABLE_ROW_THRESHOLD = 5;

export function formatQuotationSubjectCustomerLabel(distinctCustomerNames: string[]): string {
  if (distinctCustomerNames.length > TABLE_ROW_THRESHOLD) return 'ลูกค้าหลายราย';
  return `ลูกค้าราย ${distinctCustomerNames.join(', ')}`;
}

export function formatQuotationSubjectAppraisalNumbersLabel(appraisalNumbers: string[]): string {
  if (appraisalNumbers.length > TABLE_ROW_THRESHOLD)
    return 'รายการเล่มประเมินตามเอกสารที่แนบมาพร้อมนี้';
  return appraisalNumbers.join(', ');
}

export function buildQuotationEmailHtml({
  appraisals,
  targetTime,
  targetDate,
  adminFullName,
  propertyTypeDescription,
  buildingTypeDescription,
  machineStatusDescription,
}: BuildQuotationEmailHtmlParams): string {
  const rows = appraisals
    .map(
      (a, i) => `
      <tr>
        <td colwidth="${COLUMN_WIDTHS_PX[0]}" style="${CELL_STYLE}text-align:center;">${i + 1}.</td>
        <td colwidth="${COLUMN_WIDTHS_PX[1]}" style="${CELL_STYLE}">${escapeHtml(a.appraisalNumber ?? '')}</td>
        <td colwidth="${COLUMN_WIDTHS_PX[2]}" style="${CELL_STYLE}">${escapeHtml(a.customerName ?? '')}</td>
        <td colwidth="${COLUMN_WIDTHS_PX[3]}" style="${CELL_STYLE}">${escapeHtml(buildPropertyDescription(a, propertyTypeDescription, buildingTypeDescription, machineStatusDescription))}</td>
      </tr>`,
    )
    .join('');

  const table = `<table style="border-collapse:collapse;width:100%;table-layout:fixed;">
      <thead>
        <tr>
          <th colwidth="${COLUMN_WIDTHS_PX[0]}" style="${HEADER_CELL_STYLE}text-align:center;">ลำดับ</th>
          <th colwidth="${COLUMN_WIDTHS_PX[1]}" style="${HEADER_CELL_STYLE}">ApplicationNo</th>
          <th colwidth="${COLUMN_WIDTHS_PX[2]}" style="${HEADER_CELL_STYLE}">ชื่อลูกค้า</th>
          <th colwidth="${COLUMN_WIDTHS_PX[3]}" style="${HEADER_CELL_STYLE}">ประเภททรัพย์สิน</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  const appraisalListing =
    appraisals.length > TABLE_ROW_THRESHOLD
      ? `<p style="margin:0 0 8px;">โดยมีรายการเล่มประเมินทั้งหมด ${appraisals.length} เล่ม ตามเอกสารที่แนบมาพร้อมนี้</p>`
      : `<p style="margin:0 0 8px;">โดยมีรายการเล่มประเมินดังนี้</p>${table}`;

  return [
    '<p style="margin:0 0 8px;">เรียน เจ้าหน้าที่ที่เกี่ยวข้อง</p>',
    `<p style="margin:0 0 8px;">&nbsp;&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp;&nbsp;รบกวนแจ้งกลับเสนอราคาก่อน ${escapeHtml(targetTime)} น. วันที่ ${escapeHtml(targetDate)}</p>`,
    appraisalListing,
    '<p style="margin:16px 0 0;">จึงเรียนมาเพื่อโปรดทราบ</p>',
    `<p style="margin:0;">${escapeHtml(adminFullName)}</p>`,
  ].join('');
}
