/**
 * Structure of the search guide (patterns, columns, examples). The syntax and example
 * queries are language-neutral, so they live here as data; the surrounding labels and
 * descriptions are translated via i18n keys built from each row/section/recipe id
 * (see `logAdmin.json` under `guide.sections.*` / `guide.rows.*` / `guide.recipes.*`).
 */
export interface GuideRow {
  id: string;
  pattern: string;
  columns: string;
  speed: 'fast' | 'scan';
  worksOnOldRows: boolean;
  examples: string[];
}

export interface GuideSection {
  id: string;
  rows: GuideRow[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'text',
    rows: [
      {
        id: 'word',
        pattern: 'word',
        columns: 'Message + Exception',
        speed: 'scan',
        worksOnOldRows: true,
        examples: ['timeout', 'timeout GetGroupReferences'],
      },
      {
        id: 'phrase',
        pattern: '"phrase"',
        columns: 'Message + Exception',
        speed: 'scan',
        worksOnOldRows: true,
        examples: ['"Execution Timeout Expired"', '"[HANDLED]" failed'],
      },
      {
        id: 'negate',
        pattern: '-word / -"phrase"',
        columns: 'Message + Exception',
        speed: 'scan',
        worksOnOldRows: true,
        examples: ['timeout -Puppeteer', 'user:los -"StatusCode: 2"'],
      },
    ],
  },
  {
    id: 'ids',
    rows: [
      {
        id: 'guid',
        pattern: 'a bare GUID',
        columns: 'every ID column',
        speed: 'fast',
        worksOnOldRows: true,
        examples: [],
      },
      {
        id: 'appraisal',
        pattern: 'appraisal:',
        columns: 'AppraisalId',
        speed: 'fast',
        worksOnOldRows: true,
        examples: ['appraisal:AP-2569-00431'],
      },
      {
        id: 'request',
        pattern: 'request:',
        columns: 'RequestId',
        speed: 'fast',
        worksOnOldRows: false,
        examples: [],
      },
      {
        id: 'corr',
        pattern: 'corr:',
        columns: 'CorrelationId',
        speed: 'fast',
        worksOnOldRows: true,
        examples: [],
      },
    ],
  },
  {
    id: 'who',
    rows: [
      {
        id: 'user',
        pattern: 'user:',
        columns: 'UserName',
        speed: 'fast',
        worksOnOldRows: false,
        examples: ['user:los', 'user:somchai.k'],
      },
      {
        id: 'path',
        pattern: 'path:',
        columns: 'RequestPath',
        speed: 'scan',
        worksOnOldRows: true,
        examples: ['path:/api/v1', 'path:/pricing-analysis'],
      },
      {
        id: 'source',
        pattern: 'source:',
        columns: 'SourceContext',
        speed: 'scan',
        worksOnOldRows: true,
        examples: ['source:IntegrationEventDelivery', 'source:LoggingBehavior'],
      },
      {
        id: 'level',
        pattern: 'level:',
        columns: 'Level',
        speed: 'fast',
        worksOnOldRows: true,
        examples: ['level:Error'],
      },
    ],
  },
];

export interface GuideRecipe {
  id: string;
  query: string;
}

export const GUIDE_RECIPES: GuideRecipe[] = [
  { id: 'losFailed', query: 'user:los -"StatusCode: 2"' },
  { id: 'http400', query: 'path:/api/v1 "StatusCode: 400"' },
  { id: 'commandFailed', query: '"[HANDLED]" failed' },
  { id: 'slowRequests', query: 'level:Warning "[HANDLED]"' },
  { id: 'dbTimeout', query: '"Execution Timeout Expired"' },
  { id: 'losDeliveryFailed', query: 'source:IntegrationEventDelivery' },
  { id: 'wholeAppraisal', query: 'appraisal:AP-2569-00431' },
];
