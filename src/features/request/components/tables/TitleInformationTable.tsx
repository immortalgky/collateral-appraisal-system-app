import Table from '@/shared/components/tables/Table';
import type { RequestTitleDtoType } from '@/shared/forms/v1';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

type TableData = {
  itemNo: string;
  propertyType: string;
  buildingType: string;
  area: number | string;
};

const TitleInformationTable = () => {
  const { control } = useFormContext();
  const titles: RequestTitleDtoType[] = useWatch({ name: 'titles', control });
  const [tableData, setTableData] = useState<TableData[]>([]);

  useEffect(() => {
    setTableData(titles.map(title => mapTitleToTableData(title)));
  }, [titles]);
  return <Table<TableData> data={tableData} headers={headers} />;
};

function mapTitleToTableData(title: RequestTitleDtoType): TableData {
  const itemNoCandidates = [
    title.collateral?.titleNo,
    title.condo?.condoRoomNo,
    title.titleAddress?.roomNo,
  ];
  const propertyTypeCandidates = [title.collateral?.collateralType];
  const buildingTypeCandidates = [title.building?.buildingType];
  return {
    itemNo: checkCandidates(itemNoCandidates),
    propertyType: checkCandidates(propertyTypeCandidates),
    buildingType: checkCandidates(buildingTypeCandidates),
    area:
      typeof title.area?.usageArea === 'number' || typeof title.area?.usageArea === 'string'
        ? title.area?.usageArea
        : '',
  };
}

function checkCandidates(candidates: unknown[]): string {
  let text = '';
  for (const candidate of candidates) {
    if (checkValidText(candidate)) {
      text = candidate;
      break;
    }
  }
  return text;
}

function checkValidText(text: unknown): text is string {
  return typeof text === 'string' && text.trim() !== '';
}

const headers: { name: keyof TableData; label: string }[] = [
  {
    name: 'itemNo',
    label: 'Title No / Room No',
  },
  {
    name: 'propertyType',
    label: 'Property Type',
  },
  {
    name: 'buildingType',
    label: 'Building Type',
  },
  {
    name: 'area',
    label: 'Area',
  },
];

export default TitleInformationTable;
