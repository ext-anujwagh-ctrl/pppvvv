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
  'Chapters / Hrs Planned?',
  'Writer / Editor Focus',
  'Changes this week',
  'Risk/Help Needed/CX Escalation Ongoing',
  'Show Documents',
  'Author Folders',
  'Meeting Notes Document',
  'Editorial Report Document',
  'Story Snapshot Document',
  'Plag Report Link (Include date of check, epsiodes and findings)',
  'ECR Sheet',
  'Comment Analysis'
];

const LINK_FIELDS = new Set([
  'Show Documents',
  'Author Folders',
  'Meeting Notes Document',
  'Editorial Report Document',
  'Story Snapshot Document',
  'Plag Report Link',
  'Plag Report Link (Include date of check, epsiodes and findings)',
  'Episodic Retention (ECR) Sheet',
  'ECR Sheet',
  'Comment Analysis (CA) Sheet',
  'Comment Analysis',
  'Discord Channel Link (Show Level)',
  'Editorial documents',
  'Log of the conversation'
]);

const SCHEMA_MAPPED_HEADER_ORDER = [
  'Show ID',
  'Show Title',
  'Genre',
  'Show Length',
  'PPV Tag',
  'Is Top Author Show?',
  'Contracted',
  'Incentive Flag',
  'Completed',
  'Active/Inactive',
  'Activity Days (L30D)',
  'Throughput (L30D)',
  'Published Word Count',
  'Editor',
  'CL',
  'SCL',
  'Overall Editorial conviction',
  'Subjective Conviction',
  'Show Documents',
  'Author Folders',
  'Meeting Notes Document',
  'Story Snapshot Document',
  'Plag Report Link (Include date of check, epsiodes and findings)',
  'ECR Sheet',
  'Comment Analysis',
  'Editorial Report Document',
  'Author ID',
  'Author Name',
  'Author Locale',
  'Author Contact',
  'Registration on Pocket',
  'Listener Tag',
  'No. of shows on Pocket (>10K WC)',
  'No. of contracted shows on Pocket',
  'Number of other shows in P3/PPV',
  'Total Throughput (L30D)'
];

const OPERATIONAL_COLUMN_OPTIONS = [
  ...SCHEMA_MAPPED_HEADER_ORDER.filter(header => CSV_HEADERS.includes(header)),
  ...CSV_HEADERS.filter(header => !SCHEMA_MAPPED_HEADER_ORDER.includes(header))
].filter(header =>
  header !== 'Show ID' &&
  ![
    'Author Name',
    'Author Contact',
    'Author Occupation',
    'Author Age?',
    "Writer's Editing Activity",
    'Editorial Comments (Writer POV)',
    'Editorial Comments (Story POV)',
    'Synopsis',
    'Writing on other platforms',
    'Where are you connected to the writer?',
    'Editor Connect History',
    'Chapters / Hrs Planned?',
    'Writer / Editor Focus',
    'Changes this week',
    'Risk/Help Needed/CX Escalation Ongoing'
  ].includes(header) &&
  !LINK_FIELDS.has(header)
);

const subjectiveColumnIndex = OPERATIONAL_COLUMN_OPTIONS.indexOf('Subjective Conviction');
OPERATIONAL_COLUMN_OPTIONS.splice(subjectiveColumnIndex + 1, 0, 'Label');

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
  'Synopsis',
  'Author Name',
  'Author ID',
  'Author Contact',
  'Author Occupation',
  'Author Age?',
  'Writing on other platforms',
  'Where are you connected to the writer?',
  'Editor Connect History',
  'Writer Cadence',
  'Date Connected',
  'Primary Medium',
  'Connected details',
  'Chapters / Hrs Planned?',
  'Writer / Editor Focus',
  'Changes this week',
  'Risk/Help Needed/CX Escalation Ongoing',
  ...LINK_FIELDS
]);

const FILTER_HEADERS_UNORDERED = [...CSV_HEADERS, 'Elastic', 'Label', 'Dumper vs Original'].filter(
  (header, index, headers) =>
    !REMOVED_FILTERS.has(header) && headers.indexOf(header) === index
);

const FILTER_HEADERS = [
  ...SCHEMA_MAPPED_HEADER_ORDER.filter(header => FILTER_HEADERS_UNORDERED.includes(header)),
  ...FILTER_HEADERS_UNORDERED.filter(header => !SCHEMA_MAPPED_HEADER_ORDER.includes(header))
];

const PRIMARY_FILTER_HEADERS = [
  'Genre',
  'Show Length',
  'PPV Tag',
  'Label',
  'Active/Inactive',
  'Dumper vs Original',
  'Editor',
  'CL',
  'SCL',
  'Author Locale',
  'Category',
  'Classification',
].filter(header => FILTER_HEADERS.includes(header));

const ADVANCED_FILTER_HEADERS = FILTER_HEADERS.filter(
  header => !PRIMARY_FILTER_HEADERS.includes(header)
);

const OPERATIONAL_VIEW_HEADERS = [
  'Show Title',
  'Label',
  'Genre',
  'PPV Tag',
  'Active/Inactive',
  'Activity Days (L30D)',
  'Show Length',
  'Category',
  'Classification'
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

const RETENTION_VIEW_SECTIONS = [
  {
    label: 'Normalised Live Retention',
    rows: [
      {
        label: 'Overall',
        options: [
          { label: 'Overall', sheet: 'normalised overall' },
          { label: 'Male', sheet: 'normalised male' },
          { label: 'Female', sheet: 'normalised female' }
        ]
      },
      {
        label: 'US',
        options: [
          { label: 'Overall', sheet: 'normalised US' },
          { label: 'Male', sheet: 'normalised US male' },
          { label: 'Female', sheet: 'normalised US female' }
        ]
      }
    ]
  },
  {
    label: 'Whale+ Live Retention',
    rows: [
      {
        label: 'Overall',
        options: [
          { label: 'Overall', sheet: 'Whale+ Overall' },
          { label: 'Male', sheet: 'Whale+ Male' },
          { label: 'Female', sheet: 'Whale+ Female' }
        ]
      },
      {
        label: 'US',
        options: [
          { label: 'Overall', sheet: 'Whale+ US' },
          { label: 'Male', sheet: 'whale+ us male' },
          { label: 'Female', sheet: 'whale+ us female' }
        ]
      }
    ]
  },
  {
    label: 'PPV Benchmarks - Base H10',
    rows: [
      {
        label: 'View',
        options: [
          { label: 'PPV Benchmarks - Base H10', sheet: 'ppv benchmarks' }
        ]
      }
    ]
  }
];

const state = {
  allRows: [],
  showLabels: {},
  reportRows: [],
  retentionDatasets: {},
  retentionView: 'normalised overall',
  retentionChartXMin: 1,
  retentionChartXMax: 200,
  retentionCardView: 'combined',
  filteredRows: [],
  page: 1,
  pageSize: 10,
  operationalColumns: [...OPERATIONAL_VIEW_HEADERS],
  selectedColumns: [...CSV_HEADERS],
  exportMode: 'all',
  filters: {},
  ppvMaxHour: null,
  ppvThresholds: { darkGreen: 1, green: 0.7, yellow: 0.5, red: 0.5 },
  ppvView: 'graph',
  charts: {},
  retentionChart: null,
  retentionCharts: {},
  comparerChart: null,
  comparerChartXMin: 1,
  comparerChartXMax: 200,
  comparerChartYMin: 0,
  comparerChartYMax: 100,
  comparerMode: 'shows',
  comparerPPVTags: [],
  comparerPPVTag: '',
  comparerPPVGenre: '',
  comparerPPVShows: [],
  comparerPPVGenres: [],
  operationalScope: 'all'
};

const $ = id => document.getElementById(id);
