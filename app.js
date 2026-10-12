function closeModals() {
  document
    .querySelectorAll('.modal')
    .forEach(modal => {
      modal.classList.add('hidden');
    });
}

async function init() {
  try {
    const response = await fetch('operational-view-updated.csv', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('operational-view-updated.csv not found');
    }

    const text = await response.text();

    state.allRows = parseCSV(text).map(row => {
      const aliases = {
        Genre: 'Show Genre',
        'PPV Tag': 'PPV Status',
        'Active/Inactive': 'Active / Inactive',
        Completed: 'Completion Status',
        'Incentive Flag': 'Incentive Flag Book',
        Contracted: 'Contract (WBP, FTC)',
        Category: 'Editorial Slate',
        Classification: 'Action',
        'Overall Editorial conviction': 'Overall Editorial Conviction',
        'Subjective Conviction': 'Story Subjective Conviction',
        'Writer Relation / Last Touch Point':
          'Editor - Writer Communication Status',
        "Writer's Editing Activity": 'Current Editing Status',
        'Primary Medium': 'Preferred Communication Medium',
        'ECR Sheet': 'Episodic Retention (ECR) Sheet',
        'Comment Analysis': 'Comment Analysis (CA) Sheet',
        'Registration on Pocket': 'Registration on Pocket (dd/mm/yy)'
      };

      const normalized = Object.entries(aliases).reduce((normalized, [legacy, current]) => {
        if (normalized[legacy] === undefined) normalized[legacy] = row[current] || '';
        return normalized;
      }, { ...row });

      const headerAliases = {
        'Most Recent Interaction Date\n(dd/mm/yy)': 'Most Recent Interaction Date(dd/mm/yy)',
        'Next Meeting Date\n(dd/mm/yyyy)': 'Next Meeting Date(dd/mm/yyyy)'
      };
      Object.entries(headerAliases).forEach(([source, canonical]) => {
        if (normalized[source] !== undefined) {
          normalized[canonical] = normalized[source];
          delete normalized[source];
        }
      });

      return normalized;
    });

    // Keep the modal detail schema in sync with the uploaded operational CSV.
    // The configured list contains legacy fields, so add any current headers
    // from the loaded data before the detail modal is opened.
    [...new Set(state.allRows.flatMap(row => Object.keys(row)))].forEach(header => {
      if (!DETAIL_HEADERS.includes(header)) DETAIL_HEADERS.push(header);
    });

    try {
      const labelsResponse = await fetch('show-labels.xlsx', { cache: 'no-store' });
      if (labelsResponse.ok) {
        if (typeof XLSX === 'undefined') throw new Error('SheetJS could not be loaded');
        const workbook = XLSX.read(
          await labelsResponse.arrayBuffer(),
          { type: 'array' }
        );
        state.showLabels = parseShowLabelsWorkbook(workbook);
      }
    } catch (labelsError) {
      console.warn('Could not load show-labels.xlsx', labelsError);
    }

    try {
      const reportResponse = await fetch(
        'report-data.csv',
        { cache: 'no-store' }
      );

      if (reportResponse.ok) {
        state.reportRows = parseCSV(await reportResponse.text());
      }
    } catch (reportError) {
      console.warn('Could not load contracted titles report data', reportError);
    }

    // Retention workbook is optional so the main dashboard can still load
    // if normalised-ret.xlsx has not been added yet.
    try {
      const retentionResponse = await fetch('normalised-ret.xlsx', {
        cache: 'no-store'
      });

      if (retentionResponse.ok) {
        if (typeof XLSX === 'undefined') {
          throw new Error('SheetJS could not be loaded');
        }

        const workbook = XLSX.read(
          await retentionResponse.arrayBuffer(),
          { type: 'array' }
        );

        state.retentionDatasets = parseRetentionWorkbook(workbook);
      }
    } catch (retentionError) {
      console.warn('Could not load normalised-ret.xlsx', retentionError);
    }

    try {
      const ppvResponse = await fetch('ppv-latest.csv', {
        cache: 'no-store'
      });

      if (ppvResponse.ok) {
        state.retentionDatasets['ppv benchmarks'] =
          parsePPVBenchmarkCSV(await ppvResponse.text());
      }
    } catch (ppvError) {
      console.warn('Could not load ppv-latest.csv', ppvError);
    }

    $('dataStatus').textContent =
      `${state.allRows.length.toLocaleString()} shows tracked`;

    setupAllFilters();
    setupExport();
    setupOperationalColumns();
    setupComparer();
    applyFilters();
  } catch (error) {
    $('dataStatus').textContent =
      'Could not load show data';

    console.error(error);

    setupAllFilters();
    setupExport();
    setupOperationalColumns();
    setupComparer();
    applyFilters();
  }
}

$('searchInput').addEventListener(
  'input',
  applyFilters
);

document.querySelectorAll('[data-operational-scope]').forEach(button => {
  button.addEventListener('click', () => {
    state.operationalScope = button.dataset.operationalScope;
    syncOperationalScopeFilters();
    document.querySelectorAll('[data-operational-scope]').forEach(option => {
      option.classList.toggle('active', option === button);
    });
    applyFilters();
  });
});

$('pageSize').addEventListener(
  'change',
  event => {
    state.pageSize = Number(event.target.value);
    state.page = 1;
    render();
  }
);

$('previousPage').addEventListener(
  'click',
  () => {
    if (state.page > 1) {
      state.page--;
      render();
    }
  }
);

$('nextPage').addEventListener(
  'click',
  () => {
    if (
      state.page <
      Math.ceil(
        state.filteredRows.length /
        state.pageSize
      )
    ) {
      state.page++;
      render();
    }
  }
);

['compareShowIdOne', 'compareShowIdTwo'].forEach(id => {
  $(id).addEventListener('input', renderComparison);
});

function isPPVBenchmarksComparerView() {
  return $('compareRetentionType')?.value === 'ppv benchmarks';
}

function resetComparerChartRanges() {
  state.comparerChartXMin = isPPVBenchmarksComparerView() ? 20 : 1;
  state.comparerChartXMax = isPPVBenchmarksComparerView() ? 100 : 200;
  state.comparerChartYMin = 0;
  state.comparerChartYMax = 100;
}

function applyComparerChartXRange(chart) {
  const cohortHours = state.comparerChartHours;
  if (Array.isArray(cohortHours)) {
    const minIndex = Math.max(0, cohortHours.findIndex(hour => hour >= state.comparerChartXMin));
    const maxIndex = cohortHours.reduce((lastIndex, hour, index) => (
      hour <= state.comparerChartXMax ? index : lastIndex
    ), 0);
    chart.options.scales.x.type = 'category';
    chart.options.scales.x.min = minIndex;
    chart.options.scales.x.max = maxIndex;
    return;
  }

  chart.options.scales.x.type = 'linear';
  chart.options.scales.x.min = state.comparerChartXMin;
  chart.options.scales.x.max = state.comparerChartXMax;
}

document.querySelectorAll('[data-comparer-mode]').forEach(button => {
  button.addEventListener('click', () => {
    state.comparerMode = button.dataset.comparerMode;
    resetComparerChartRanges();
    setupComparer();
    refreshComparerModeUI();
    renderComparison();
  });
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-comparer-chart-action]');
  if (!button) return;
  const chart = state.comparerChart;
  if (!chart) return;
  if (button.dataset.comparerChartAction === 'reset-range') {
    resetComparerChartRanges();
    applyComparerChartXRange(chart);
    chart.options.scales.y.min = 0;
    chart.options.scales.y.max = 100;
    chart.update('none');
    refreshComparerChartControls();
    return;
  }
  if (button.dataset.comparerChartAction !== 'range') return;
  state.comparerChartXMin = Number(button.dataset.rangeMin) || 1;
  state.comparerChartXMax = Number(button.dataset.rangeMax) || 200;
  document.querySelectorAll('#comparerChartControls [data-comparer-chart-action="range"]').forEach(rangeButton => {
    rangeButton.classList.toggle(
      'active',
      Number(rangeButton.dataset.rangeMin) === state.comparerChartXMin
        && Number(rangeButton.dataset.rangeMax) === state.comparerChartXMax
    );
  });
  applyComparerChartXRange(chart);
  chart.update('none');
});

const COMPARER_AXIS_VALUES = {
  y: Array.from({ length: 11 }, (_, index) => index * 10)
};

function comparerAxisValues(axis) {
  if (axis === 'y') return COMPARER_AXIS_VALUES.y;
  return isPPVBenchmarksComparerView()
    ? Array.from({ length: 9 }, (_, index) => (index + 2) * 10)
    : [1, 5, 10, ...Array.from({ length: 19 }, (_, index) => (index + 2) * 10)];
}

function closestComparerAxisValue(axis, value) {
  return comparerAxisValues(axis).reduce((closest, candidate) => (
    Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest
  ));
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-comparer-axis-step]');
  if (!button || state.comparerMode !== 'ppv-tags') return;

  const [axis, edge] = button.dataset.comparerAxisStep.split('-');
  const input = document.querySelector(`[data-comparer-axis="${axis}-${edge}"]`);
  if (!input) return;

  const current = Number(input.value);
  const values = comparerAxisValues(axis);
  const next = button.dataset.direction === 'up'
    ? values.find(value => value > current)
    : [...values].reverse().find(value => value < current);

  if (next === undefined) return;
  input.value = next;
  input.dispatchEvent(new Event('change', { bubbles: true }));
});

document.addEventListener('change', event => {
  const select = event.target.closest('[data-comparer-axis]');
  if (!select || state.comparerMode !== 'ppv-tags' || !state.comparerChart) return;

  const [axis, edge] = select.dataset.comparerAxis.split('-');
  const rawValue = Number(select.value);
  if (!Number.isFinite(rawValue)) return;
  const value = closestComparerAxisValue(axis, rawValue);
  select.value = value;
  if (axis === 'x' && edge === 'min') state.comparerChartXMin = value;
  if (axis === 'x' && edge === 'max') state.comparerChartXMax = value;
  if (axis === 'y' && edge === 'min') state.comparerChartYMin = value;
  if (axis === 'y' && edge === 'max') state.comparerChartYMax = value;

  const validX = state.comparerChartXMin < state.comparerChartXMax;
  const validY = state.comparerChartYMin < state.comparerChartYMax;
  if (validX) {
    state.comparerChart.options.scales.x.min = state.comparerChartXMin;
    state.comparerChart.options.scales.x.max = state.comparerChartXMax;
  }
  if (validY) {
    state.comparerChart.options.scales.y.min = state.comparerChartYMin;
    state.comparerChart.options.scales.y.max = state.comparerChartYMax;
  }
  state.comparerChart.update('none');
  refreshComparerChartControls();
});


document.addEventListener('click', event => {
  const toggle = event.target.closest('[data-comparer-picker-toggle]');
  if (toggle) {
    event.stopPropagation();
    const menu = toggle.nextElementSibling;
    document.querySelectorAll('[data-comparer-picker] .multi-filter-menu').forEach(other => {
      if (other !== menu) other.classList.add('hidden');
    });
    menu?.classList.toggle('hidden');
    return;
  }
  const action = event.target.closest('[data-ppv-picker-action]');
  if (!action) return;
  const kind = action.dataset.ppvPickerKind;
  const values = ppvFilterValues(kind).map(value => typeof value === 'string' ? value : value.value);
  state.comparerPPVFiltersInitializedFromUser = true;
  setPPVFilterSelection(kind, action.dataset.ppvPickerAction === 'select-all' ? values : []);
  if (kind !== 'shows') setupPPVTagControls();
  else refreshPPVTagShowPicker();
  renderComparison();
});

document.addEventListener('change', event => {
  const checkbox = event.target.closest('input[data-ppv-filter-kind]');
  if (!checkbox) return;
  const kind = checkbox.dataset.ppvFilterKind;
  const selected = new Set(ppvFilterSelection(kind));
  if (checkbox.checked) selected.add(checkbox.value);
  else selected.delete(checkbox.value);
  state.comparerPPVFiltersInitializedFromUser = true;
  setPPVFilterSelection(kind, [...selected]);
  if (kind !== 'shows') setupPPVTagControls();
  else refreshPPVTagShowPicker();
  renderComparison();
});

document.addEventListener('input', event => {
  const search = event.target.closest('[data-ppv-picker-search]');
  if (!search) return;
  filterPPVPickerOptions(search.dataset.ppvPickerSearch, search.value);
});

$('compareRetentionType').addEventListener(
  'change',
  () => {
    resetComparerChartRanges();
    refreshComparerChartControls();
    renderComparison();
  }
);

$('downloadReport').addEventListener(
  'click',
  downloadShowReport
);

$('clearFilters').addEventListener(
  'click',
  () => {
    state.filters = {};
    $('searchInput').value = '';
    setupAllFilters();
    applyFilters();
  }
);

$('openExport').addEventListener(
  'click',
  () => openExportModal('all')
);

$('exportOperational').addEventListener(
  'click',
  () => openExportModal('operational')
);

$('openOperationalColumns').addEventListener(
  'click',
  () => {
    setupOperationalColumns();
    $('columnsModal').classList.remove('hidden');
  }
);

$('resetOperationalColumns').addEventListener(
  'click',
  () => {
    state.operationalColumns = [...OPERATIONAL_VIEW_HEADERS];
    setupOperationalColumns();
    render();
  }
);

$('selectOperationalColumns').addEventListener(
  'click',
  () => {
    state.operationalColumns = [...OPERATIONAL_COLUMN_OPTIONS];
    setupOperationalColumns();
    render();
  }
);

function openExportModal(mode) {
  state.exportMode = mode;
  state.selectedColumns = mode === 'operational'
    ? [...OPERATIONAL_VIEW_HEADERS]
    : [...CSV_HEADERS];

  setupExport();
  $('exportModal').classList.remove('hidden');
  updateExportMeta();
}

$('downloadCsv').addEventListener(
  'click',
  downloadCSV
);

$('selectAllColumns').addEventListener(
  'click',
  () => {
    state.selectedColumns = state.exportMode === 'operational'
      ? [
          ...OPERATIONAL_VIEW_HEADERS,
          ...CSV_HEADERS.filter(
            header => !OPERATIONAL_VIEW_HEADERS.includes(header)
          )
        ]
      : [...CSV_HEADERS];
    setupExport();
  }
);

$('clearAllColumns').addEventListener(
  'click',
  () => {
    state.selectedColumns = state.exportMode === 'operational'
      ? [...OPERATIONAL_VIEW_HEADERS]
      : [];
    setupExport();
  }
);

document
  .querySelectorAll(
    '[data-close-export],[data-close-details],[data-close-columns]'
  )
  .forEach(element => {
    element.addEventListener('click', closeModals);
  });

document.addEventListener(
  'click',
  event => {
    if (!event.target.closest('.multi-filter')) {
      document
        .querySelectorAll('.multi-filter-menu')
        .forEach(menu => {
          menu.classList.add('hidden');
        });
    }

    if (
      !event.target.closest('.advanced-filter-area')
    ) {
      $('advancedFiltersPanel')
        .classList.add('hidden');
    }
  }
);

document.addEventListener(
  'keydown',
  event => {
    if (event.key === 'Escape') {
      closeModals();
    }
  }
);

init();
