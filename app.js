function closeModals() {
  document
    .querySelectorAll('.modal')
    .forEach(modal => {
      modal.classList.add('hidden');
    });
}

async function init() {
  try {
    const response = await fetch(
      'data.csv',
      {
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error('data.csv not found');
    }

    const text = await response.text();

    state.allRows = parseCSV(text);

    $('dataStatus').textContent =
      `${state.allRows.length.toLocaleString()} shows`;

    setupAllFilters();
    setupExport();
    applyFilters();
  } catch (error) {
    $('dataStatus').textContent =
      'Could not load show data';

    console.error(error);

    setupAllFilters();
    setupExport();
    applyFilters();
  }
}

$('searchInput').addEventListener(
  'input',
  applyFilters
);

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
    '[data-close-export],[data-close-details]'
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
