import { describe, expect, it } from 'vitest';
import {
  buildingLine,
  buildingName,
  codeListDisplay,
  codedDisplay,
  condoClause,
  condoClauses,
  condoGovernmentPriceText,
  developmentLine,
  formatGps,
  formatLandBuilding,
  governmentPriceText,
  isStated,
  landClause,
  landDescription,
  landGovernmentPriceText,
  machineLine,
  machineSections,
  progressSuffix,
  projectAddress,
  projectDetails,
  projectRows,
  stated,
  thaiPartialDate,
  titleDeedNoun,
  titleDeedNumberPrefix,
} from './summaryText';

// Expected strings are hand-traced from the C# report providers (see the header of summaryText.ts).

describe('stated / isStated (ThaiAddressFormatter, CollateralLocationTests)', () => {
  it.each([null, undefined, '', ' ', '-', '--', ' – ', '—', '−', '- -', '- - -', '-  –  -'])(
    'treats %j as no value',
    v => expect(stated(v)).toBeNull(),
  );

  it('keeps a real value trimmed', () => expect(stated(' 3/48 ')).toBe('3/48'));

  it.each(['0', '00', '–0', '0 -', '--', ' ', '0.0'])('floor %j is not stated', v =>
    expect(isStated(v)).toBe(false),
  );

  it.each(['7', 'G', '12A', '-7'])('floor %j is stated', v => expect(isStated(v)).toBe(true));
});

describe('formatLandBuilding / formatGps', () => {
  it('prints every part in report order (FSD example)', () => {
    expect(
      formatLandBuilding({
        houseNumber: '99/172',
        village: 'หมู่บ้านสุขสันต์',
        moo: '2',
        soi: 'ไม่มีชื่อ',
        road: 'ทางหลวงชนบท',
        subDistrict: 'หินเหล็กไฟ',
        district: 'คูเมือง',
        province: 'บุรีรัมย์',
      }),
    ).toBe(
      'เลขที่ 99/172 หมู่บ้านสุขสันต์ ม.2 ซอย ไม่มีชื่อ ถนน ทางหลวงชนบท ตำบล/แขวง หินเหล็กไฟ อำเภอ/เขต คูเมือง จังหวัดบุรีรัมย์',
    );
  });

  it('drops a blank or dash part together with its label', () => {
    expect(formatLandBuilding({ houseNumber: '-', soi: '—', road: 'ราชวิถี', province: ' ' })).toBe(
      'ถนน ราชวิถี',
    );
    expect(formatLandBuilding({})).toBe('');
  });

  it('formats GPS with sign-derived hemisphere and 6 decimals', () => {
    expect(formatGps(13.270399, 100.94802)).toBe('N 13.270399 E 100.948020');
    expect(formatGps(-1.5, -2)).toBe('S 1.500000 W 2.000000');
    expect(formatGps(13.2, null)).toBeNull();
  });
});

describe('title deed wording', () => {
  it('takes the report wording from the brief, trimmed', () => {
    expect(titleDeedNumberPrefix(' น.ส.3 ก. เลขที่ ')).toBe('น.ส.3 ก. เลขที่');
    expect(titleDeedNoun('น.ส.3 ก.')).toBe('น.ส.3 ก.');
  });

  it('falls back to the generic wording when an older API sends none', () => {
    for (const v of ['', '  ', null, undefined]) {
      expect(titleDeedNumberPrefix(v)).toBe('เอกสารสิทธิ์เลขที่');
      expect(titleDeedNoun(v)).toBe('เอกสารสิทธิ์');
    }
  });
});

describe('landClause / landDescription', () => {
  it('prints the full clause', () => {
    expect(
      landClause({
        titleNumberPrefix: 'โฉนดที่ดินเลขที่',
        titleNumber: '1234',
        bookNumber: '5',
        pageNumber: '6',
        landParcelNumber: '7',
        surveyNumber: '8',
        rawang: '9',
        areaRai: 9,
        areaNgan: 2,
        areaSquareWa: 41.5,
        subDistrict: 'บางพลัด',
        district: 'บางพลัด',
        province: 'กรุงเทพมหานคร',
      }),
    ).toBe(
      'โฉนดที่ดินเลขที่ 1234 เล่ม 5 หน้า 6 เลขที่ดิน 7 หน้าสำรวจ 8 ระวาง 9 เนื้อที่ 9-2-41.5 ไร่ ตำบล/แขวง บางพลัด อำเภอ/เขต บางพลัด จังหวัดกรุงเทพมหานคร',
    );
  });

  it('with every optional part blank keeps only the area, shown as 0-0-0', () => {
    expect(landClause({})).toBe('เนื้อที่ 0-0-0 ไร่');
    expect(
      landClause({ titleNumber: '  ', bookNumber: null, subDistrict: '-', province: '–' }),
    ).toBe('เนื้อที่ 0-0-0 ไร่');
  });

  it('names the document by its own type and keeps a "-" title number (blank test is whitespace only)', () => {
    expect(landClause({ titleNumberPrefix: 'น.ส.3 เลขที่', titleNumber: '5678', areaRai: 1 })).toBe(
      'น.ส.3 เลขที่ 5678 เนื้อที่ 1-0-0 ไร่',
    );
    expect(landClause({ titleNumber: '-' })).toBe('เอกสารสิทธิ์เลขที่ - เนื้อที่ 0-0-0 ไร่');
  });

  it('formats area numbers as #,##0.## (thousands separator, 2 decimals, half away from zero)', () => {
    expect(landClause({ areaSquareWa: 1234.567 })).toBe('เนื้อที่ 0-0-1,234.57 ไร่');
    expect(landClause({ areaSquareWa: 1.005 })).toBe('เนื้อที่ 0-0-1.01 ไร่');
  });

  it('joins several titles with a space and is null with none', () => {
    expect(
      landDescription([
        { titleNumber: '1' },
        { titleNumberPrefix: 'น.ส.3 เลขที่', titleNumber: '2' },
      ]),
    ).toBe('เอกสารสิทธิ์เลขที่ 1 เนื้อที่ 0-0-0 ไร่ น.ส.3 เลขที่ 2 เนื้อที่ 0-0-0 ไร่');
    expect(landDescription([])).toBeNull();
  });
});

describe('codedDisplay (BuildingTypeDisplay SQL CASE)', () => {
  it('uses the remark for code 99, else label, else remark, else code', () => {
    expect(codedDisplay('99', 'โกดังเก็บสินค้า', 'อื่นๆ')).toBe('โกดังเก็บสินค้า');
    expect(codedDisplay('99', '', 'อื่นๆ')).toBe('อื่นๆ');
    expect(codedDisplay('01', null, 'บ้านเดี่ยว')).toBe('บ้านเดี่ยว');
    expect(codedDisplay('05', 'เรือนไทย', null)).toBe('เรือนไทย');
    expect(codedDisplay('05', null, null)).toBe('05');
    expect(codedDisplay(null, null, null)).toBeNull();
  });

  it('treats a label that is only the code, or a dash, as no label (what a lookup gives for an unknown code)', () => {
    expect(codedDisplay('05', 'เรือนไทย', '05')).toBe('เรือนไทย');
    expect(codedDisplay('05', null, '05')).toBe('05');
    expect(codedDisplay('05', null, '—')).toBe('05');
  });
});

describe('buildingName / buildingLine', () => {
  it('names a building by its type, which for code 99 is the appraiser remark', () => {
    expect(buildingName({ buildingTypeDisplay: ' อาคารโรงงาน ' })).toBe('อาคารโรงงาน');
    expect(
      buildingName({ buildingTypeDisplay: codedDisplay('99', 'โกดังเก็บสินค้า', 'อื่นๆ') }),
    ).toBe('โกดังเก็บสินค้า');
    expect(buildingName({ buildingTypeDisplay: ' ', propertyName: ' บ้านพักคนงาน ' })).toBe(
      'บ้านพักคนงาน',
    );
    expect(buildingName({})).toBeNull();
  });

  it('prints every part, with no "พร้อม" and no เลขที่', () => {
    expect(
      buildingLine({
        buildingTypeDisplay: 'อาคารโรงงาน',
        numberOfFloors: 1,
        totalBuildingArea: 1800,
        buildingAge: 9,
        buildingConditionDisplay: 'ปานกลาง',
      }),
    ).toBe('อาคารโรงงาน 1 ชั้น พื้นที่ใช้สอย 1,800 ตารางเมตร อายุอาคาร 9 ปี สภาพอาคารปานกลาง');
  });

  it('skips a 0 floor count and a 0 age but still prints a 0 area; no condition, no clause', () => {
    expect(
      buildingLine({
        buildingTypeDisplay: 'บ้านเดี่ยว',
        numberOfFloors: 2,
        totalBuildingArea: 150.5,
        buildingAge: 0,
      }),
    ).toBe('บ้านเดี่ยว 2 ชั้น พื้นที่ใช้สอย 150.5 ตารางเมตร');
    expect(
      buildingLine({ buildingTypeDisplay: 'โกดัง', numberOfFloors: 0, totalBuildingArea: 0 }),
    ).toBe('โกดัง พื้นที่ใช้สอย 0 ตารางเมตร');
  });

  it('appends the construction progress and is null when nothing is filled in', () => {
    expect(buildingLine({ buildingTypeDisplay: 'บ้านเดี่ยว' }, 47.07)).toBe(
      'บ้านเดี่ยว (แล้วเสร็จ 47.07%)',
    );
    expect(buildingLine({ buildingTypeDisplay: 'บ้านเดี่ยว' }, 0)).toBe(
      'บ้านเดี่ยว (ยังไม่ก่อสร้าง)',
    );
    expect(buildingLine({ buildingTypeDisplay: 'บ้านเดี่ยว' }, 100)).toBe('บ้านเดี่ยว');
    expect(buildingLine({})).toBeNull();
  });

  it('progressSuffix: none without an inspection, none when complete', () => {
    expect(progressSuffix(null)).toBeNull();
    expect(progressSuffix(120)).toBeNull();
    expect(progressSuffix(-5)).toBe('(ยังไม่ก่อสร้าง)');
  });
});

describe('developmentLine (BuildItemDesc)', () => {
  it('prints name, area and age', () => {
    expect(developmentLine({ areaDescription: ' รั้วตาข่ายเหล็ก ', area: 120, year: 3 })).toBe(
      'รั้วตาข่ายเหล็ก พื้นที่ 120 ตารางเมตร อายุ 3 ปี',
    );
  });

  it('lets the owning building name replace the free-text description', () => {
    expect(developmentLine({ areaDescription: 'รั้ว', area: 120, year: 3 }, null, 'ถังน้ำ')).toBe(
      'ถังน้ำ พื้นที่ 120 ตารางเมตร อายุ 3 ปี',
    );
  });

  it('skips a 0 area and a 0 age, appends progress, and is null when empty', () => {
    expect(developmentLine({ area: 10.256, year: 0 })).toBe('พื้นที่ 10.26 ตารางเมตร');
    expect(developmentLine({ areaDescription: 'ถนนคอนกรีต', area: 0 }, 0)).toBe(
      'ถนนคอนกรีต (ยังไม่ก่อสร้าง)',
    );
    expect(developmentLine({ areaDescription: ' ' })).toBeNull();
  });
});

describe('government price text', () => {
  it('prints just the rate when every parcel shares one price (land, ตารางวาละ N2)', () => {
    expect(
      landGovernmentPriceText([
        { number: '1234', titleNumberPrefix: 'โฉนดที่ดินเลขที่', price: 12500, displayOrder: 0 },
        { number: '1235', titleNumberPrefix: 'โฉนดที่ดินเลขที่', price: 12500, displayOrder: 1 },
      ]),
    ).toBe('ตารางวาละ 12,500.00 บาท');
  });

  it('prefixes each price segment with its numbers, joined by " , "', () => {
    expect(
      landGovernmentPriceText([
        { number: '1234', titleNumberPrefix: 'โฉนดที่ดินเลขที่', price: 12500, displayOrder: 0 },
        { number: '5678', titleNumberPrefix: 'น.ส.3 เลขที่', price: 8000.5, displayOrder: 1 },
      ]),
    ).toBe(
      'โฉนดที่ดินเลขที่ 1234 ตารางวาละ 12,500.00 บาท , น.ส.3 เลขที่ 5678 ตารางวาละ 8,000.50 บาท',
    );
  });

  it('announces each deed kind once per segment and lists the numbers with "และ"', () => {
    expect(
      landGovernmentPriceText([
        { number: '1234', titleNumberPrefix: 'โฉนดที่ดินเลขที่', price: 12500, displayOrder: 0 },
        { number: '5678', titleNumberPrefix: 'น.ส.3 เลขที่', price: 12500, displayOrder: 1 },
        { number: '1235', titleNumberPrefix: 'โฉนดที่ดินเลขที่', price: 12500, displayOrder: 2 },
        { number: '9', titleNumberPrefix: 'โฉนดที่ดินเลขที่', price: 8000, displayOrder: 3 },
      ]),
    ).toBe(
      'โฉนดที่ดินเลขที่ 1234 และ 1235 และ น.ส.3 เลขที่ 5678 ตารางวาละ 12,500.00 บาท , โฉนดที่ดินเลขที่ 9 ตารางวาละ 8,000.00 บาท',
    );
  });

  it('lets ตกสำรวจ beat the price, and sorts segments by their first item', () => {
    expect(
      landGovernmentPriceText([
        {
          number: '1234',
          titleNumberPrefix: 'โฉนดที่ดินเลขที่',
          price: 12500,
          isMissingFromSurvey: true,
          displayOrder: 0,
        },
        { number: '5678', titleNumberPrefix: 'โฉนดที่ดินเลขที่', price: 8000, displayOrder: 1 },
      ]),
    ).toBe('โฉนดที่ดินเลขที่ 1234 ตกสำรวจ , โฉนดที่ดินเลขที่ 5678 ตารางวาละ 8,000.00 บาท');
    expect(
      landGovernmentPriceText([
        { number: '1', titleNumberPrefix: 'โฉนดที่ดินเลขที่', price: 5, isMissingFromSurvey: true },
      ]),
    ).toBe('ตกสำรวจ');
    expect(
      governmentPriceText(
        [
          { number: 'A', price: 1, displayOrder: 5 },
          { number: 'B', price: 2, displayOrder: 1 },
        ],
        'ที่',
        p => `ราคา ${p}`,
      ),
    ).toBe('ที่ B ราคา 2 , ที่ A ราคา 1');
  });

  it('is null with nothing to print', () => {
    expect(landGovernmentPriceText([])).toBeNull();
    expect(landGovernmentPriceText([{ number: '1', price: null }])).toBeNull();
  });

  it('condo: ตารางเมตรละ, one rate or per-room segments in input order', () => {
    expect(condoGovernmentPriceText([{ number: '176/120', price: 85000 }])).toBe(
      'ตารางเมตรละ 85,000.00 บาท',
    );
    expect(
      condoGovernmentPriceText([
        { number: '176/120', price: 85000 },
        { number: '176/121', price: 90000.5 },
      ]),
    ).toBe(
      'ห้องชุดเลขที่ 176/120 ตารางเมตรละ 85,000.00 บาท , ห้องชุดเลขที่ 176/121 ตารางเมตรละ 90,000.50 บาท',
    );
    expect(condoGovernmentPriceText([{ number: '176/120', isMissingFromSurvey: true }])).toBe(
      'ตกสำรวจ',
    );
  });
});

describe('condoClause / condoClauses', () => {
  const full = {
    roomNumber: '176/120',
    floorNumber: '7',
    buildingNumber: 'A',
    condoName: 'เออร์บาโน ราชวิถี',
    condoRegistrationNumber: '12/2560',
    builtOnTitleNumber: '999',
    subDistrict: 'บางพลัด',
    district: 'บางพลัด',
    province: 'กรุงเทพมหานคร',
    areas: [
      { areaDescription: 'พื้นที่ภายในห้องชุด', areaSize: 35.5 },
      { areaDescription: null, areaSize: 4 },
    ],
    numberOfFloors: 30,
    buildingAge: 5,
    buildingConditionDisplay: 'ดี',
  };

  it('prints one unit in report order, with area components and their total', () => {
    expect(condoClause(full)).toBe(
      'ห้องชุดเลขที่ 176/120 ชั้นที่ 7 อาคารเลขที่ A ชื่ออาคารชุด เออร์บาโน ราชวิถี ทะเบียนอาคารชุดเลขที่ 12/2560 ปลูกสร้างบนโฉนดเลขที่ 999 ตำบล/แขวง บางพลัด อำเภอ/เขต บางพลัด จังหวัดกรุงเทพมหานคร พื้นที่ภายในห้องชุด 35.5 ตารางเมตร พื้นที่ 4 ตารางเมตร รวมพื้นที่ 39.5 ตารางเมตร อาคารสูง 30 ชั้น อายุอาคาร 5 ปี สภาพอาคารดี',
    );
  });

  it('drops an unstated floor and a dash building number; falls back to the usable area', () => {
    expect(
      condoClause({ roomNumber: '206', floorNumber: '0', buildingNumber: '-', usableArea: 42 }),
    ).toBe('ห้องชุดเลขที่ 206 พื้นที่ห้องชุด 42 ตารางเมตร');
  });

  it('prints no total for a single area row, and skips non-positive rows', () => {
    expect(condoClause({ areas: [{ areaSize: 30 }], usableArea: 99 })).toBe('พื้นที่ 30 ตารางเมตร');
    expect(
      condoClause({ roomNumber: '1', areas: [{ areaSize: 0 }, { areaSize: -2 }], usableArea: 99 }),
    ).toBe('ห้องชุดเลขที่ 1');
  });

  it('is null when empty, and a 0 height / age is skipped', () => {
    expect(condoClause({})).toBeNull();
    expect(condoClause({ roomNumber: '1', numberOfFloors: 0, buildingAge: 0 })).toBe(
      'ห้องชุดเลขที่ 1',
    );
  });

  it('joins two units with " | " and skips an empty one', () => {
    expect(
      condoClauses([
        { roomNumber: '1', floorNumber: '2' },
        {},
        { roomNumber: '3', floorNumber: '4' },
      ]),
    ).toBe('ห้องชุดเลขที่ 1 ชั้นที่ 2 | ห้องชุดเลขที่ 3 ชั้นที่ 4');
    expect(condoClauses([{ roomNumber: '1' }])).toBe('ห้องชุดเลขที่ 1');
    expect(condoClauses([])).toBeNull();
  });
});

describe('machineLine / machineSections', () => {
  const registered = {
    machineName: 'เครื่องกลึง CNC',
    brand: 'Mazak',
    model: 'QT-250',
    registrationNumber: 'ทร.2401/2558',
    serialNumber: 'SN-1',
    yearOfManufacture: 2015,
    machineCondition: 'ดี',
    section: 'registered' as const,
    isPriceCertified: true,
    conditionUse: '01',
  };

  it('describes a machine in report order', () => {
    expect(machineLine(registered)).toBe(
      'เครื่องกลึง CNC ยี่ห้อ Mazak รุ่น QT-250 ทะเบียนเลขที่ ทร.2401/2558 หมายเลขเครื่อง SN-1 ปีที่ผลิต 2015 สภาพดี',
    );
  });

  it('adds (สำรวจไม่พบ) and (ไม่รับรองราคา) flags', () => {
    expect(
      machineLine({ machineName: 'เครื่องอัดลม', conditionUse: '03', isPriceCertified: false }),
    ).toBe('เครื่องอัดลม (สำรวจไม่พบ) (ไม่รับรองราคา)');
    expect(machineLine({})).toBe('');
  });

  it('splits into registered / not registered / not yet installed with row counts', () => {
    expect(
      machineSections([
        registered,
        {
          machineName: 'เครื่องอัดลม',
          section: 'notRegistered',
          conditionUse: '03',
          isPriceCertified: false,
        },
        { machineName: 'หม้อไอน้ำ', section: 'notInstalled' },
        { machineName: 'ปั๊มน้ำ', section: 'notRegistered' },
        { section: 'notRegistered' }, // nothing recorded: no line, not counted
      ]),
    ).toEqual([
      {
        section: 'registered',
        lines: [machineLine(registered)],
      },
      {
        section: 'notRegistered',
        lines: ['เครื่องอัดลม (สำรวจไม่พบ) (ไม่รับรองราคา)', 'ปั๊มน้ำ'],
      },
      { section: 'notInstalled', lines: ['หม้อไอน้ำ'] },
    ]);
  });

  it('omits an empty bucket, and one whose machines are all blank', () => {
    expect(machineSections([])).toEqual([]);
    expect(
      machineSections([{ section: 'registered' }, { machineName: 'A', section: 'notRegistered' }]),
    ).toEqual([{ section: 'notRegistered', lines: ['A'] }]);
  });
});

describe('thaiPartialDate (Buddhist era)', () => {
  it.each([
    ['2024', '2567'],
    ['2024-05', 'พฤษภาคม 2567'],
    ['2024-05-09', '9 พฤษภาคม 2567'],
    [' 2024-12-31 ', '31 ธันวาคม 2567'],
    ['2024-13', '2567'],
    ['2024-05-00', 'พฤษภาคม 2567'],
    ['2024-xx-09', '2567'],
    ['2024abc', null],
    ['abc', null],
    ['', null],
    [null, null],
  ])('%j -> %j', (raw, expected) => expect(thaiPartialDate(raw)).toBe(expected));
});

describe('project', () => {
  const village = {
    projectType: 'LB',
    landAreaRai: 12,
    landAreaNgan: 1,
    landAreaSquareWa: 50.5,
    unitForSaleCount: 120,
  };

  it('composes ลักษณะโครงการ with numbered model lines (position kept when a model is skipped)', () => {
    expect(
      projectDetails(village, [
        {
          modelName: 'แบบ A',
          buildingType: 'บ้านเดี่ยว',
          numberOfFloors: 2,
          numberOfHouse: 40,
          standardUsableArea: 180,
          startingPriceMin: 3500000,
          startingPriceMax: 3500000,
        },
        {},
        {
          modelName: 'แบบ C',
          usableAreaMin: 95.5,
          startingPriceMin: 2000000,
          startingPriceMax: 2500000,
        },
      ]),
    ).toBe(
      'โครงการบ้านจัดสรร พื้นที่โครงการประมาณ 12-1-50.5 ไร่ จำนวนแปลงขาย 120 ยูนิต/แปลง มีแบบบ้าน 3 แบบ ได้แก่\n' +
        '1.) แบบ A บ้านเดี่ยว 2 ชั้น จำนวน 40 หลัง พื้นที่ใช้สอย 180 ตร.ม. ราคาเริ่มต้น 3,500,000 บาท\n' +
        '3.) แบบ C พื้นที่ใช้สอย 95.5 ตร.ม. ราคา 2,000,000–2,500,000 บาท',
    );
  });

  it('names the type, says แบบห้องชุด for a condo and drops the area when it is 0', () => {
    expect(projectDetails({ projectType: 'u', landAreaRai: 1 }, [{ modelName: 'Studio' }])).toBe(
      'อาคารชุด พื้นที่โครงการประมาณ 1-0-0 ไร่ มีแบบห้องชุด 1 แบบ ได้แก่\n1.) Studio',
    );
    expect(projectDetails({ projectType: 'L' })).toBe('โครงการที่ดินจัดสรร');
    expect(projectDetails({ projectType: 'X', landAreaRai: 0, unitForSaleCount: 0 })).toBe(
      'โครงการ',
    );
  });

  it('builds the address without village / ม. and drops blank parts', () => {
    expect(
      projectAddress({
        houseNumber: '99',
        soi: '-',
        road: 'พหลโยธิน',
        subDistrict: 'จตุจักร',
        district: 'จตุจักร',
        province: 'กรุงเทพมหานคร',
      }),
    ).toBe('เลขที่ 99 ถนน พหลโยธิน ตำบล/แขวง จตุจักร อำเภอ/เขต จตุจักร จังหวัดกรุงเทพมหานคร');
    expect(projectAddress({ soi: '-' })).toBeNull();
  });

  it('joins decoded codes with the free-text other', () => {
    const labels: Record<string, string> = { '01': 'ไฟฟ้า', '02': 'ประปา' };
    const label = (c: string) => labels[c];
    expect(codeListDisplay(['01', '02', 'x', ' '], ' บ่อบำบัด ', label)).toBe(
      'ไฟฟ้า, ประปา, x, บ่อบำบัด',
    );
    expect(codeListDisplay([], 'อื่น ๆ', label)).toBe('อื่น ๆ');
    expect(codeListDisplay(null, ' ', label)).toBeNull();
  });

  it('lists the project-level rows in report order, null where nothing is stated', () => {
    const rows = projectRows(
      {
        ...village,
        houseNumber: '99',
        province: 'กรุงเทพมหานคร',
        developer: 'บริษัท เอ จำกัด',
        projectSaleLaunchDate: '2023-06',
        utilities: ['01'],
        facilities: [],
        facilitiesOther: ' ',
        latitude: 13.756331,
        longitude: 100.501762,
      },
      [],
      (group, code) => (group === 'PublicUtility' && code === '01' ? 'ไฟฟ้า' : null),
    );
    expect(rows).toEqual([
      { key: 'address', value: 'เลขที่ 99 จังหวัดกรุงเทพมหานคร' },
      { key: 'developer', value: 'บริษัท เอ จำกัด' },
      {
        key: 'details',
        value: 'โครงการบ้านจัดสรร พื้นที่โครงการประมาณ 12-1-50.5 ไร่ จำนวนแปลงขาย 120 ยูนิต/แปลง',
      },
      { key: 'saleLaunch', value: 'มิถุนายน 2566' },
      { key: 'utilities', value: 'ไฟฟ้า' },
      { key: 'facilities', value: null },
      { key: 'coordinates', value: 'N 13.756331 E 100.501762' },
    ]);
  });
});
