import Table from '@/shared/components/tables/Table';
import type { RequestTitleDtoType } from '@/shared/forms/v1';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type TableData = {
  itemNo: string;
  propertyType: string;
  buildingType: string;
  area: number | string;
};

const TitleInformationTable = () => {
  const { t } = useTranslation('request');
  const { control } = useFormContext();
  const titles: RequestTitleDtoType[] = useWatch({ name: 'titles', control });
  const [tableData, setTableData] = useState<TableData[]>([]);

  const headers: { name: keyof TableData; label: string }[] = [
    { name: 'itemNo', label: t('titleTable.itemNo') },
    { name: 'propertyType', label: t('titleTable.propertyType') },
    { name: 'buildingType', label: t('titleTable.buildingType') },
    { name: 'area', label: t('titleTable.area') },
  ];

  useEffect(() => {
    setTableData(titles.map(title => mapTitleToTableData(title)));
  }, [titles]);
  return <Table<TableData> data={tableData} headers={headers} />;
};

function mapTitleToTableData(title: RequestTitleDtoType): TableData {
  const itemNoCandidates = [title.titleNo, title.condo?.condoRoomNo, title.titleAddress?.roomNo];
  const propertyTypeCandidates = [title.collateralType];
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

export default TitleInformationTable;
