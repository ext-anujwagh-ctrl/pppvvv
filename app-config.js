/* Dashboard configuration and shared state */

const CSV_HEADERS = [
  'Show ID',
  'Show Title',
  'Genre',
  'Show Length',
  'PPV Tag',
  'Is Top Author Show?',
  'Active/Inactive',
  'Activity Days (L30D)',
  'Throughput (L30D)',
  'Published Word Count',
  'Completed',
  'Incentive Flag',
  'L3M Payouts',
  'Classification',
  'Category',
  'What it means?',
  'Priority',
  'Contracted',
  'Editor',
  'CL',
  'SCL',
  'Overall Editorial conviction',
  'Subjective Conviction',
  'Writer Relation / Last Touch Point',
  "Writer's Editing Activity",
  'Editorial Comments (Writer POV)',
  'Editorial Comments (Story POV)',
  'Other Comments (If Any)',
  'Editorial documents',
  'Synopsis',
  'Author ID',
  'Author Name',
  'Author Locale',
  'Author Contact',
  'Author Occupation',
  'Author Age?',
  'Registration on Pocket',
  'Listener Tag',
  'No. of shows on Pocket (>10K WC)',
  'No. of contracted shows on Pocket',
  'Number of other shows in P3/PPV',
  'Total Throughput (L30D)',
  'Writing on other platforms',
  'Where are you connected to the writer?',
  'Editor Connect History',
  'Writer Cadence',
  'Date Connected',
  'Primary Medium',
  'Connected details',
  'Log of the conversation',
  'Chapters / Hrs Planned?',
  'Writer / Editor Focus',
  'Changes this week',
  'Risk/Help Needed/CX Escalation Ongoing'
];

const REMOVED_FILTERS = new Set([
  'Show ID',
  'Show Title',
  'Activity Days (L30D)',
  'Throughput (L30D)',
  'Published Word Count',
  'L3M Payouts',
  'What it means?',
  'Writer Relation / Last Touch Point',
  "Writer's Editing Activity",
  'Editorial Comments (Writer POV)',
  'Editorial Comments (Story POV)',
  'Other Comments (If Any)',
  'Editorial documents',
  'Synopsis',
  'Author Name',
  'Author ID',
  'Author Contact',
  'Author Occupation',
  'Author Age?',
  'Registration on Pocket',
  'No. of shows on Pocket (>10K WC)',
  'No. of contracted shows on Pocket',
  'Number of other shows in P3/PPV',
  'Total Throughput (L30D)',
  'Writing on other platforms',
  'Where are you connected to the writer?',
  'Editor Connect History',
  'Writer Cadence',
  'Date Connected',
  'Primary Medium',
  'Connected details',
  'Log of the conversation',
  'Chapters / Hrs Planned?',
  'Writer / Editor Focus',
  'Changes this week',
  'Risk/Help Needed/CX Escalation Ongoing'
]);

const FILTER_HEADERS = CSV_HEADERS.filter(
  header => !REMOVED_FILTERS.has(header)
);

const PRIMARY_FILTER_HEADERS = [
  'Genre',
  'Show Length',
  'PPV Tag',
  'Active/Inactive',
  'Completed',
  'Incentive Flag',
  'Classification',
  'Category',
  'Priority',
  'Editor',
  'CL',
  'SCL'
].filter(header => FILTER_HEADERS.includes(header));

const ADVANCED_FILTER_HEADERS = FILTER_HEADERS.filter(
  header => !PRIMARY_FILTER_HEADERS.includes(header)
);

const SHOW_LENGTH_BUCKETS = [
  '0-50',
  '50-100',
  '100+'
];

const state = {
  allRows: [],
  filteredRows: [],
  page: 1,
  pageSize: 25,
  selectedColumns: [...CSV_HEADERS],
  filters: {},
  charts: {}
};

const $ = id => document.getElementById(id);

