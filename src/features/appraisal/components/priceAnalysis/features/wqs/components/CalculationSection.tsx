// import { RHFInputCell } from '../../../components/table/RHFInputCell';
// import { getDesciptions } from './WQSSection';
// import { Icon } from '@/shared/components';
// import { useFormContext, useWatch } from 'react-hook-form';
// import clsx from 'clsx';
// import { forecast } from '../domain/forecast';
// import { useMemo } from 'react';
// import {
//   RHFHorizontalArrayTable,
//   RHFVerticalArrayTable,
// } from '../../adapters/rhf-table/RHFArrayTable';
// import type { RHFHorizontalColumn, RHFVerticalRowDef } from '../../adapters/rhf-table/spec';
// import type { GridGroup } from '../../components/table/types';
// import { useDerivedFields } from '../../../components/useDerivedFieldArray';
// import { formatNumber } from '@/shared/utils/formatUtils';

// interface CalculationSectionProps {
//   comparativeSurveys: Record<string, string>[];
//   template: Record<string, string>[];
//   allFactors: Record<string, string>[];
//   property: Record<string, any>;
// }

// export const CalculationSection = ({
//   comparativeSurveys,
//   template,
//   allFactors,
//   property,
// }: CalculationSectionProps) => {
//   const { getValues, setValue } = useFormContext();

//   const WQScomparativeFactors = useWatch({ name: 'comparativeFactors' });
//   const WQSScores = useWatch({ name: 'WQSScores' });
//   const WQSCalculations = useWatch({ name: 'WQSCalculations' });

//   const derivedRules = useMemo(() => {
//     const finalValueRule = {
//       targetPath: 'WQSFinalValue.finalValue',
//       deps: ['WQSCalculations', 'WQSScores'],
//       compute: () => {
//         const x = (WQSScores ?? []).reduce((acc, curr) => acc + curr.collateral * curr.weight, 0);
//         // known_y = adjusted values of each comparable
//         const known_ys = (WQSCalculations ?? [])
//           .map((c: any) => Number(c?.adjustedValue))
//           .filter(Number.isFinite);

//         const known_xs = (WQSScores ?? [])
//           .map(
//             f =>
//               f.surveys?.map(survey => ({
//                 score: survey.surveyScore ?? 0,
//                 weight: f.weight ?? 0,
//               })) ?? [],
//           )
//           .reduce((acc, curr) => {
//             curr.forEach((value, i) => {
//               acc[i] = (acc[i] ?? 0) + value.score * value.weight;
//             });
//             return acc;
//           }, []);

//         // must have >= 2 points
//         if (known_xs.length < 2 || known_ys.length < 2 || known_xs.length !== known_ys.length) {
//           return <div>0</div>;
//         }

//         const forecastResult = Number.isFinite(forecast({ x, known_ys, known_xs }))
//           ? parseFloat(forecast({ x, known_ys, known_xs }).toFixed(2))
//           : 0;

//         return forecastResult;
//       },
//     };

//     const finalValueRoundedRule = {
//       targetPath: 'WQSFinalValue.finalValueRounded',
//       deps: ['WQSCalculations', 'WQSScores'],
//       compute: () => {
//         const x = (WQSScores ?? []).reduce((acc, curr) => acc + curr.collateral * curr.weight, 0);
//         // known_y = adjusted values of each comparable
//         const known_ys = (WQSCalculations ?? [])
//           .map((c: any) => Number(c?.adjustedValue))
//           .filter(Number.isFinite);

//         const known_xs = (WQSScores ?? [])
//           .map(
//             f =>
//               f.surveys?.map(survey => ({
//                 score: survey.surveyScore ?? 0,
//                 weight: f.weight ?? 0,
//               })) ?? [],
//           )
//           .reduce((acc, curr) => {
//             curr.forEach((value, i) => {
//               acc[i] = (acc[i] ?? 0) + value.score * value.weight;
//             });
//             return acc;
//           }, []);

//         // must have >= 2 points
//         if (known_xs.length < 2 || known_ys.length < 2 || known_xs.length !== known_ys.length) {
//           return <div>0</div>;
//         }

//         const forecastResult = Number.isFinite(forecast({ x, known_ys, known_xs }))
//           ? parseFloat(forecast({ x, known_ys, known_xs }).toPrecision(3))
//           : 0;

//         return forecastResult;
//       },
//     };

//     return [
//       finalValueRule,
//       finalValueRoundedRule,
//       ...WQSCalculations.map((column, index) => {
//         return {
//           targetPath: `WQSCalculations.[${index}].adjustedValue`,
//           deps: ['WQSCaculations'],
//           compute: () => {
//             if (column.offeringPrice) {
//               return column.offeringPriceAdjustmentPct > 0
//                 ? column.offeringPrice -
//                     (column.offeringPrice * column.offeringPriceAdjustmentPct) / 100
//                 : column.offeringPriceAdjustmentAmt > 0
//                   ? column.offeringPriceAdjustmentAmt
//                   : column.offeringPrice;
//             }
//             if (column.sellingPrice) {
//               return (
//                 column.sellingPrice +
//                 (column.sellingPrice * column.numberOfYears * column.sellingPriceAdjustmentYear) /
//                   100
//               );
//             }
//             return 0;
//           },
//         };
//       }),
//     ];
//   }, [WQSCalculations, WQSScores]);

//   useDerivedFields({
//     rules: derivedRules,
//     ctx: {},
//   });

//   const { scoreConfigurations, scoreColumnGroupConfigurations } =
//     getWQSScoreConfigurations(comparativeSurveys);
//   const { calculationConfigurations } = getCalculationConfigurations();

//   return (
//     <div className="flex flex-col rounded-lg border border-gray-300 border-spacing border-spacing-0 overflow-hidden">
//       <div className="flex-1 min-w-0 min-h-0 flex flex-col">
//         <RHFHorizontalArrayTable
//           name="WQSScores"
//           columns={scoreConfigurations}
//           groups={scoreColumnGroupConfigurations}
//           defaultRow={{
//             factorCode: null,
//             weight: 0,
//             intensity: 0,
//             surveys: comparativeSurveys.map(survey => ({ marketId: survey.id, surveyScore: 0 })),
//             collateral: 0,
//           }}
//           ctx={{
//             factors: allFactors,
//             template: template,
//             surveys: comparativeSurveys,
//             comparativeFactors: WQScomparativeFactors,
//             property: property,
//           }}
//           // watch={{ comparativeFactors: 'comparativeFactors', scoreFactor: 'WQSScores' }} // TODO
//           hasHeader={true}
//           hasBody={true}
//           hasFooter={true}
//         />
//       </div>
//       <div className="min-w-0 min-h-0 flex flex-row justify-center px-3 py-4 text-sm items-center">
//         {`Scoring Criteria : 1-2 Very low, 3-4 Fair, 5-6 Average, 7-8 Good, 9-10 Very Good`}
//       </div>
//       <div className="flex-1 min-w-0 min-h-0 flex-col">
//         <RHFVerticalArrayTable
//           name="WQSCalculations"
//           rowDefs={calculationConfigurations}
//           // hasHeader={false}
//           defaultColumn={{}}
//           topHeader={comparativeSurveys?.map((survey, index) => (
//             <div key={survey.Id ?? index} className="">{`Survey ${index + 1}`}</div>
//           ))}
//           style={{
//             headerClassName: i => {
//               if (i === 0)
//                 return 'sticky left-0 z-30 border-r border-neutral-300 h-[50px] w-[500px] bg-gray-50';
//               return 'border-r border-neutral-300 h-[50px] w-[200px]';
//             },
//             bodyClassName: i => {
//               if (i === 0)
//                 return 'sticky left-0 z-30 bg-white w-[500px] border-r border-neutral-300 h-[56px] border-b border-gray-300';
//               return 'border-r border-neutral-300 h-[56px] w-[200px] border-b border-gray-300';
//             },
//           }}
//         />
//       </div>
//     </div>
//   );
// };

// const getWQSScoreConfigurations = (comparativeSurveys: Record<string, any>[]) => {
//   let scoreConfigurations: RHFHorizontalColumn<Record<string, any>, any>[] = [
//     {
//       id: 'factorCode',
//       header: <div className="flex items-center justify-center">Factor</div>,
//       field: 'factorCode',
//       style: {
//         headerClassName: 'border-r border-gray-300 left-0 bg-gray-50 z-40 sticky h-14 w-[200px]',
//         bodyClassName:
//           'border-r border-gray-300 sticky left-0 z-40 bg-white w-[200px] border-b border-gray-300',
//         footerClassName: 'sticky left-0 bg-white z-40 h-14 w-[200px]',
//       },
//       render: ({ fieldPath, ctx, rowIndex, value }) => {
//         const calculationFactors = ctx.template?.calculationFactors ?? []; // In case that no template, systen still allow to add factors
//         if (rowIndex > calculationFactors.length - 1) {
//           const comparativeFactors =
//             (ctx.comparativeFactors ?? [])
//               ?.filter(
//                 compFact =>
//                   !calculationFactors.some(calFact => calFact.factorId === compFact.factorCode),
//               )
//               .map(compFact => ({
//                 label: getDesciptions(compFact.factorCode),
//                 value: compFact.factorCode,
//               })) ?? [];
//           return (
//             <div className="flex flex-row min-w-0 min-h-0 items-center h-12 w-[170px] overflow-hidden">
//               <RHFInputCell fieldName={fieldPath} inputType="select" options={comparativeFactors} />
//             </div>
//           );
//         }
//         return (
//           <div
//             className="flex flex-row min-w-0 min-h-0 items-center justify-start truncate h-12 w-[170px]"
//             title={getDesciptions(value) ?? ''}
//           >
//             <span className="w-full truncate">{getDesciptions(value) ?? ''}</span>
//           </div>
//         );
//       },
//     },
//     {
//       id: 'weight',
//       header: <div className="flex items-center justify-center">Weight</div>,
//       field: 'weight',
//       style: {
//         headerClassName:
//           'border-r border-gray-300 w-[100px] h-14 sticky left-[200px] z-30 bg-gray-50',
//         bodyClassName:
//           'border-r border-gray-300 sticky left-[200px] bg-white z-30 border-b border-gray-300',
//         footerClassName: 'h-14 sticky left-[200px] bg-white z-30',
//       },
//       render: ({ fieldPath }) => {
//         return (
//           <div className="">
//             <RHFInputCell fieldName={fieldPath} inputType="number" />
//           </div>
//         );
//       },

//       footer: ({ rows }) => {
//         const totalWeight = rows.reduce((acc, curr) => {
//           return acc + curr.weight;
//         }, 0);
//         return (
//           <div
//             className={clsx(
//               'flex justify-end items-center text-right text-sm font-normal text-gray-400',
//             )}
//           >
//             {`${Number.isFinite(totalWeight) ? totalWeight : 0}`}
//           </div>
//         );
//       },
//     },
//     {
//       id: 'intensity',
//       header: <div className="">Intensity</div>,
//       field: 'intensity',
//       style: {
//         headerClassName:
//           'border-r border-gray-300 w-[100px] text-center h-14 sticky left-[300px] bg-gray-50 z-30',
//         bodyClassName:
//           'border-r border-gray-300 sticky left-[300px] bg-white z-30 border-b border-gray-300',
//         footerClassName: 'h-14 left-[300px] bg-white z-30',
//       },
//       align: 'right',
//       render: ({ fieldPath, row, ctx }) => {
//         return (
//           <div className="w-full h-full">
//             <RHFInputCell fieldName={fieldPath} inputType="number" />
//           </div>
//         );
//       },
//       footer: ({ rows, ctx, columnIndex }) => {
//         const totalIntensity = rows.reduce((acc, curr) => {
//           return acc + curr.intensity;
//         }, 0);
//         return (
//           <div
//             className={clsx(
//               'flex justify-end items-center text-right text-sm font-normal max-w-full',
//               totalIntensity > 100 ? 'text-danger' : 'text-gray-400',
//             )}
//           >
//             {Number.isFinite(totalIntensity) ? totalIntensity.toFixed(0) : 0}
//           </div>
//         );
//       },
//     },
//     {
//       id: 'score',
//       header: <div className="">Score</div>,
//       style: {
//         headerClassName:
//           'border-r border-gray-300 w-[100px] text-center h-14 sticky left-[400px] bg-gray-50',
//         bodyClassName:
//           'border-r border-gray-300 sticky left-[400px] bg-white z-30 border-b border-gray-300',
//         footerClassName: 'h-14 sticky left-[400px] bg-white z-30',
//       },
//       align: 'right',
//       render: ({ fieldPath, row, rowIndex, value, ctx }) => (
//         <div className="flex justify-end items-center w-full h-full p-2 text-right">
//           {row['weight'] * row['intensity']}
//         </div>
//       ),
//       footer: ({ rows }) => {
//         const totalScore = rows.reduce((acc, curr) => {
//           return acc + curr.weight * curr.intensity;
//         }, 0);
//         return (
//           <div
//             className={clsx(
//               'w-full h-full flex justify-end items-center text-right text-sm font-normal text-gray-400',
//             )}
//           >
//             {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
//           </div>
//         );
//       },
//     },
//   ];

//   if (comparativeSurveys) {
//     scoreConfigurations = [
//       ...scoreConfigurations,
//       ...comparativeSurveys.map((data, index) => {
//         return {
//           id: data.id,
//           field: `surveys.${index}.surveyScore`,
//           style: {
//             headerClassName: 'border-r border-gray-300 h-14 w-[200px]',
//             bodyClassName: 'border-r border-gray-300 border-b border-gray-300',
//             footerClassName: 'h-14',
//           },
//           header: (
//             <div className="">
//               <div className="flex justify-center items-center truncate">
//                 <span>Survey {index + 1}</span>
//               </div>
//               <div className="flex flex-row justify-between items-center gap-4 truncate ">
//                 <div className="text-left flex">Score</div>
//                 <div className="text-right flex">Weighted Score</div>
//               </div>
//             </div>
//           ),

//           render: ({ fieldPath, row, rowIndex }) => {
//             // const surveyScore = getValues(fieldPath) ?? 0;
//             const surveyScore = row.survey?.[index]?.surveyScore ?? 0;
//             const weight = row.weight ?? 0;
//             const score = weight * surveyScore;

//             return (
//               <div className="max-w-full h-full flex flex-row justify-between items-center">
//                 <div className="w-[80px]">
//                   <RHFInputCell fieldName={fieldPath} inputType="number" />
//                 </div>
//                 <div className="text-right">
//                   <span>{Number.isFinite(score) ? score.toFixed(0) : 0}</span>
//                 </div>
//               </div>
//             );
//           },

//           footer: ({ rows }) => {
//             const totalScore = rows.reduce((acc, curr) => {
//               if (!curr) return acc;

//               const score = curr['surveys']?.[index]?.surveyScore ?? 0;
//               const weight = curr['weight'] ?? 0;
//               return acc + score * weight;
//             }, 0);

//             return (
//               <div className="flex justify-end items-center text-right text-sm font-normal text-gray-400">
//                 {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
//               </div>
//             );
//           },
//         };
//       }),
//     ];
//   }

//   scoreConfigurations = [
//     ...scoreConfigurations,
//     {
//       id: 'collateral',
//       field: 'collateral',
//       style: {
//         headerClassName: 'border-r border-gray-300 h-14',
//         bodyClassName: 'border-r border-gray-300 border-b border-gray-300',
//         footerClassName: 'h-14',
//       },
//       header: (
//         <div className="w-full h-full flex flex-col justify-end items-end">
//           <div className="w-full h-full flex flex-row justify-center items-center ">
//             <span>collateral</span>
//           </div>
//           <div className="w-full h-full flex flex-row justify-between items-start gap-2 text-wrap">
//             <div className="p-2">Score</div>
//             <div className="p-2">Weighted Score</div>
//           </div>
//         </div>
//       ),
//       render: ({ fieldPath, row, rowIndex, value, ctx }) => {
//         // const score = getValues(fieldPath) ?? 0;
//         const score = row['collateral'] ?? 0;
//         const weightedScore = row.weight * score;
//         return (
//           <div className="min-w-full flex flex-row justify-between items-center">
//             <div className="w-18">
//               <RHFInputCell fieldName={fieldPath} inputType="number" />
//             </div>
//             <div>
//               {/* <span>{`${row['weight'] * value.score}`}</span> */}
//               <span>{Number.isFinite(weightedScore) ? weightedScore.toFixed(0) : 0}</span>
//             </div>
//           </div>
//         );
//       },

//       footer: ({ rows }) => {
//         const totalScore = rows.reduce((acc, curr) => {
//           const score = curr['collateral'] ?? 0;
//           const weight = curr['weight'] ?? 0;
//           return acc + score * weight;
//         }, 0);

//         return (
//           <div className="flex justify-end items-center text-right text-sm font-normal text-gray-400 px-2">
//             {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
//           </div>
//         );
//       },
//     },
//     {
//       id: 'action',
//       header: <div className="w-full"></div>,
//       style: {
//         headerClassName: 'w-20 bg-gray-50 h-14',
//         bodyClassName: 'z-30 bg-white border-b border-gray-300',
//         footerClassName: 'h-14',
//       },
//       render: ({ rowIndex, actions: { removeColumn }, ctx }) => {
//         /*
//         factor which was set from template not allow to change
//         */
//         const calculationFactors = ctx.template?.calculationFactors ?? []; // In case that no template, systen still allow to add factors
//         if (rowIndex >= calculationFactors.length)
//           return (
//             <div className="flex justify-center items-center bg-white w-full h-full">
//               <button
//                 type="button"
//                 onClick={() => removeColumn?.(rowIndex)}
//                 className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
//                 title="Delete"
//               >
//                 <Icon style="solid" name="trash" className="size-3.5" />
//               </button>
//             </div>
//           );
//         return <div className="min-w-full min-h-full bg-white"></div>;
//       },
//     },
//   ];

//   const scoreColumnGroupConfigurations: GridGroup[] = [
//     {
//       id: 'calculation',
//       label: <div className="">Calculation</div>,
//       columnIds: ['intensity', 'score'],
//       align: 'center',
//       className:
//         'border-b border-r border-neutral-300 sticky top-0 z-20 h-10 text-center sticky left-[300px] z-30 bg-gray-50',
//     },
//     {
//       id: 'surveys',
//       label: <div className="">Comparative Data</div>,
//       columnIds: comparativeSurveys.map((data, index) => data.id),
//       align: 'center',
//       className: `border-b border-r border-neutral-300 h-10 text-center`,
//     },
//   ];
//   return { scoreConfigurations, scoreColumnGroupConfigurations };
// };

// const getCalculationConfigurations = () => {
//   const calculationConfigurations: RHFVerticalRowDef<Record<string, any>, any>[] = [
//     {
//       id: 'offeringPrice',
//       header: <div className="flex justify-start items-center w-[200px]">Offering Price</div>,
//       field: 'offeringPrice',
//       render: ({ columnItem }) => {
//         return (
//           <div className=" h-full flex justify-end items-center">
//             {formatNumber(columnItem['offeringPrice'])}
//           </div>
//         );
//       },
//     },
//     {
//       id: 'offeringPriceAdjustmentPct',
//       header: (
//         <div className="flex flex-row justify-between items-center ">
//           <div>Adjustment of Offer Price</div>
//           <div>(%)</div>
//         </div>
//       ),
//       field: 'offeringPriceAdjustmentPct',
//       accessor: ({ columnItem, columnIndex, ctx }) => {
//         return columnItem['offeringPriceAdjustmentPct'] ?? null;
//       },
//       render: ({ fieldPath, columnItem, columns, columnIndex, value, ctx }) => {
//         return columnItem['offeringPrice'] ? (
//           <div className="flex justify-end items-center  h-full">
//             <RHFInputCell fieldName={fieldPath} inputType="number" />
//           </div>
//         ) : null;
//       },
//     },
//     {
//       id: 'offeringPriceAdjustmentAmt',
//       header: (
//         <div className="flex flex-row justify-between items-center ">
//           <div>Adjustment of Offer Price</div>
//           <div>(Amt)</div>
//         </div>
//       ),
//       field: 'offeringPriceAdjustmentAmt',
//       accessor: ({ columnItem }) => {
//         return columnItem['offeringPriceAdjustmentAmt'] ?? null;
//       },
//       render: ({ fieldPath, columnItem }) => {
//         return columnItem['offeringPrice'] ? (
//           <div className="flex justify-end items-center  h-full">
//             <RHFInputCell fieldName={fieldPath} inputType="number" />
//           </div>
//         ) : null;
//       },
//     },
//     {
//       id: 'sellingPrice',
//       header: <div className="">Selling Price</div>,
//       field: 'sellingPrice',
//       render: ({ columnItem }) => {
//         return (
//           <div className="flex justify-end items-center  h-full">
//             {formatNumber(columnItem['sellingPrice'])}
//           </div>
//         );
//       },
//     },
//     {
//       id: 'numberOfYears',
//       header: <div className="">Number of Years</div>,
//       field: 'numberOfYears',
//       render: ({ columnItem }) => {
//         return (
//           <div className="flex justify-end items-center  h-full">
//             {formatNumber(columnItem['numberOfYears'])}
//           </div>
//         );
//       },
//     },
//     {
//       id: 'sellingPriceAdjustmentYear',
//       header: <div className="">Adjust Period</div>,
//       field: 'sellingPriceAdjustmentYear',
//       accessor: ({ columnItem, columnIndex, ctx }) => {
//         return columnItem['sellingPriceAdjustmentYear'] ?? '';
//       },
//       render: ({ fieldPath, columnItem, columns, columnIndex, value, ctx }) => {
//         return columnItem['sellingPrice'] ? (
//           <div className="flex justify-end items-center  h-full">
//             <RHFInputCell fieldName={fieldPath} inputType="number" />
//           </div>
//         ) : null;
//       },
//     },
//     {
//       id: 'cumulativeAdjustedPeriod',
//       header: (
//         <div className="flex justify-between items-center ">
//           <span>Cumulative Adjusted Period</span>
//           <span>(%)</span>
//         </div>
//       ),
//       accessor: ({ columnItem, columnIndex, ctx }) => {
//         if (!columnItem['numberOfYears'] && !columnItem['sellingPriceAdjustmentYear']) return 0;
//         return columnItem['numberOfYears'] * columnItem['sellingPriceAdjustmentYear'];
//       },
//       render: ({ columnItem }) => {
//         if (!columnItem['sellingPrice']) return '';

//         const numberOfYears = columnItem['numberOfYears'] ?? 0;
//         const sellingPriceAdjustmentYear = columnItem['sellingPriceAdjustmentYear'] ?? 0;
//         const cumulativeAdjustedPeriod = numberOfYears * sellingPriceAdjustmentYear;
//         return (
//           <div className=" h-full">{`${Number.isFinite(cumulativeAdjustedPeriod) ? formatNumber(cumulativeAdjustedPeriod) : ''}`}</div>
//         );
//       },
//     },
//     {
//       id: 'adjustedValue',
//       header: <div className="">Adjusted Value</div>,
//       field: 'adjustedValue',
//       render: ({ value }) => {
//         return (
//           <div className="flex justify-end items-center  h-full p-2">
//             {Number.isFinite(value) ? Number(value).toLocaleString() : 0}
//           </div>
//         );
//       },
//     },
//   ];
//   return { calculationConfigurations };
// };
