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

const OPERATIONAL_VIEW_HEADERS = [
  'Show Title',
  'Genre',
  'PPV Tag',
  'Active/Inactive',
  'Activity Days (L30D)',
  'Category',
  'Show Length',
  'Priority'
];

const DETAIL_HEADERS = [
  'Show ID',
  'Show Title',
  ...CSV_HEADERS.filter(
    header =>
      !OPERATIONAL_VIEW_HEADERS.includes(header) &&
      header !== 'Show ID' &&
      header !== 'Show Title'
  )
];

const SHOW_LENGTH_BUCKETS = [
  '0-50',
  '50-100',
  '100+'
];

const RETENTION_BENCHMARK_HOURS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  15, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  120, 140, 160, 180, 200
];

const NORMALISED_RETENTION_BENCHMARKS = {
  fantasy: [
    0.870, 0.439, 0.377, 0.349, 0.320,
    0.309, 0.279, 0.257, 0.247, 0.239,
    0.213, 0.189, 0.165, 0.148, 0.139,
    0.134, 0.129, 0.124, 0.120, 0.116,
    0.111, 0.105, 0.097, 0.090, 0.083
  ],
  romantasy: [
    0.849, 0.695, 0.617, 0.550, 0.444,
    0.380, 0.340, 0.316, 0.297, 0.285,
    0.241, 0.218, 0.192, 0.175, 0.148,
    0.132, 0.116, 0.102, 0.091, 0.079,
    0.060, 0.041, 0.000, 0.000, 0.000
  ],
  romance: [
    0.910, 0.564, 0.501, 0.416, 0.371,
    0.309, 0.283, 0.265, 0.254, 0.246,
    0.213, 0.193, 0.174, 0.153, 0.140,
    0.127, 0.120, 0.113, 0.101, 0.090,
    0.069, 0.049, 0.027, 0.000, 0.000
  ]
};

const state = {
  allRows: [],
  retentionRows: [],
  filteredRows: [],
  page: 1,
  pageSize: 10,
  operationalColumns: [...OPERATIONAL_VIEW_HEADERS],
  selectedColumns: [...CSV_HEADERS],
  exportMode: 'all',
  filters: {},
  charts: {},
  retentionChart: null
};

const $ = id => document.getElementById(id);
