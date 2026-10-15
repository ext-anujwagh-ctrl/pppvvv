/* Filter controls and filtered-row calculations */

function authorFilterBucket(field, value) {
  const numeric = Number.parseFloat(String(value ?? '').replace(/,/g, ''));

  if (field === 'Registration on Pocket') {
    const raw = String(value ?? '').trim();
    let date = null;
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (match) {
      const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
      date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    } else if (Number.isFinite(numeric)) {
      date = new Date(Date.UTC(1899, 11, 30) + numeric * 86400000);
    }
    if (!date || Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    if (date >= sixMonthsAgo) return 'In last 6mo';
    if (date >= oneYearAgo) return 'In last 1 yr';
    return 'Greater than 1 year';
  }

  if (!Number.isFinite(numeric)) return '';
  if (field === 'No. of shows on Pocket (>10K WC)') {
    if (numeric < 5) return '<5';
    if (numeric < 10) return '5-10';
    if (numeric < 20) return '10-20';
    return '20+';
  }
  if (field === 'No. of contracted shows on Pocket') {
    if (numeric < 5) return '<5';
    if (numeric < 10) return '5-10';
    if (numeric < 20) return '10 -20';
    return '20+';
  }
  if (field === 'Number of other shows in P3/PPV') {
    if (numeric < 5) return '<5';
    if (numeric < 10) return '5-10';
    return '10+';
  }
  if (field === 'Total Throughput (L30D)') {
    if (numeric < 50000) return '<50k';
    if (numeric < 100000) return '50-100k';
    if (numeric < 200000) return '100-200k';
    if (numeric < 300000) return '200-300k';
    if (numeric < 400000) return '300-400k';
    if (numeric < 500000) return '400-500k';
    return '500k+';
  }
  return String(value ?? '').trim();
}

function authorFilterBucketOrder(field) {
  return {
    'Registration on Pocket': ['In last 6mo', 'In last 1 yr', 'Greater than 1 year'],
    'No. of shows on Pocket (>10K WC)': ['<5', '5-10', '10-20', '20+'],
    'No. of contracted shows on Pocket': ['<5', '5-10', '10 -20', '20+'],
    'Number of other shows in P3/PPV': ['<5', '5-10', '10+'],
    'Total Throughput (L30D)': ['<50k', '50-100k', '100-200k', '200-300k', '300-400k', '400-500k', '500k+']
  }[field] || [];
}

const AUTHOR_BUCKET_FIELDS = new Set([
  'Registration on Pocket',
  'No. of shows on Pocket (>10K WC)',
  'No. of contracted shows on Pocket',
  'Number of other shows in P3/PPV',
  'Total Throughput (L30D)'
]);

function filterMarkup(field, index) {
  const title = field === 'Listener Tag'
    ? 'Author Listener Tag'
    : field === 'Completed'
    ? 'Completed (Yes/No)'
    : field === 'Subjective Conviction'
    ? 'Story Subjective Conviction'
    : field;
  const values = (
    field === 'Label'
      ? unique(field).sort((a, b) => {
          const order = ['blue', 'green', 'yellow', 'red'];
          const aIndex = order.indexOf(normalized(a));
          const bIndex = order.indexOf(normalized(b));
          return (aIndex < 0 ? order.length : aIndex) - (bIndex < 0 ? order.length : bIndex);
        })
      : AUTHOR_BUCKET_FIELDS.has(field)
      ? [...new Set(state.allRows.map(row => authorFilterBucket(field, row[field])).filter(Boolean))]
          .sort((a, b) => authorFilterBucketOrder(field).indexOf(a) - authorFilterBucketOrder(field).indexOf(b))
      :
    field === 'Show Length'
      ? SHOW_LENGTH_BUCKETS
      : unique(field)
  ).filter(value =>
    String(value).trim() !== '' &&
    !['not found', 'no change', 'no_change', 'null'].includes(normalized(value)) &&
    !(field === 'Genre' && normalized(value) === 'column 1')
  );

  const optionLabel = value => {
    if (field === 'Label') {
      const descriptions = {
        blue: 'Great Ret.',
        green: 'Good Ret.',
        yellow: 'Moderate Ret.',
        red: 'Bad Ret.'
      };
      const description = descriptions[normalized(value)];
      return description ? `${value} (${description})` : filterLabel(value);
    }
    if (field === 'Incentive Flag' && String(value).trim() === '0') return 'No (0)';
    if (field === 'Incentive Flag' && String(value).trim() === '1') return 'Yes (1)';
    return filterLabel(value);
  };

  state.filters[field] = state.filters[field] || new Set();

  return `
    <div
      class="multi-filter"
      data-filter-field="${escapeHTML(field)}"
      data-filter-index="${index}"
    >
      <button
        class="multi-filter-toggle"
        type="button"
      >
        <span>${escapeHTML(title)}</span>
        <b class="filter-chevron">⌄</b>
      </button>

      <div class="multi-filter-menu hidden">
        <input
          class="filter-option-search"
          type="search"
          placeholder="Search values…"
        />

        <div class="filter-menu-actions">
          <button type="button" class="filter-select-all">
            Select all
          </button>

          <button type="button" class="filter-clear-all">
            Clear
          </button>
        </div>

        <div class="filter-options${values.length > 5 ? ' has-scroll' : ''}">
          ${values.map(value => `
            <label class="filter-option">
              <input
                type="checkbox"
                data-filter-value="${escapeHTML(filterKey(value))}"
              />
              <span class="filter-option-label">
                ${field === 'Label' ? `<span class="show-label-dot show-label-${normalized(value)}"></span>` : ''}
                ${escapeHTML(optionLabel(value))}
              </span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function setupAllFilters() {
  const primaryContainer = $('primaryFilters');
  const advancedContainer = $('advancedFilters');

  primaryContainer.innerHTML = PRIMARY_FILTER_HEADERS
    .map(filterMarkup)
    .join('');

  advancedContainer.innerHTML = ADVANCED_FILTER_HEADERS
    .map(filterMarkup)
    .join('');

  syncOperationalScopeFilters();

  const filterContainers = [
    primaryContainer,
    advancedContainer
  ];

  const allFilterCards = filterContainers.flatMap(
    container => [
      ...container.querySelectorAll('.multi-filter')
    ]
  );

  allFilterCards.forEach(card => {
    const field = card.dataset.filterField;
    const selected = state.filters[field] || new Set();

    card
      .querySelectorAll('.filter-option input')
      .forEach(input => {
        input.checked = selected.has(
          input.dataset.filterValue
        );
      });

    updateFilterButton(card, selected);
  });

  filterContainers
    .flatMap(container => [
      ...container.querySelectorAll('.multi-filter-toggle')
    ])
    .forEach(button => {
      button.onclick = event => {
        event.stopPropagation();

        const menu = button.nextElementSibling;

        filterContainers
          .flatMap(container => [
            ...container.querySelectorAll('.multi-filter-menu')
          ])
          .forEach(other => {
            if (other !== menu) {
              other.classList.add('hidden');
            }
          });

        menu.classList.toggle('hidden');
      };
    });

  filterContainers
    .flatMap(container => [
      ...container.querySelectorAll('.filter-option input')
    ])
    .forEach(input => {
      input.onchange = () => {
        const card = input.closest('.multi-filter');
        const field = card.dataset.filterField;

        const selected = new Set(
          [
            ...card.querySelectorAll(
              '.filter-option input:checked'
            )
          ].map(item => item.dataset.filterValue)
        );

        state.filters[field] = selected;

        updateFilterButton(card, selected);
        applyFilters();
      };
    });

  filterContainers
    .flatMap(container => [
      ...container.querySelectorAll('.filter-select-all')
    ])
    .forEach(button => {
      button.onclick = () => {
        const card = button.closest('.multi-filter');
        const field = card.dataset.filterField;
        const inputs = [
          ...card.querySelectorAll('.filter-option input')
        ];

        inputs.forEach(input => {
          input.checked = true;
        });

        const selected = new Set(
          inputs.map(input => input.dataset.filterValue)
        );

        state.filters[field] = selected;

        updateFilterButton(card, selected);
        applyFilters();
      };
    });

  filterContainers
    .flatMap(container => [
      ...container.querySelectorAll('.filter-clear-all')
    ])
    .forEach(button => {
      button.onclick = () => {
        const card = button.closest('.multi-filter');
        const field = card.dataset.filterField;
        const inputs = [
          ...card.querySelectorAll('.filter-option input')
        ];

        inputs.forEach(input => {
          input.checked = false;
        });

        state.filters[field] = new Set();

        updateFilterButton(
          card,
          state.filters[field]
        );

        applyFilters();
      };
    });

  filterContainers
    .flatMap(container => [
      ...container.querySelectorAll('.filter-option-search')
    ])
    .forEach(input => {
      input.oninput = () => {
        const search = normalized(input.value);
        const menu = input.closest('.multi-filter-menu');

        menu
          .querySelectorAll('.filter-option')
          .forEach(option => {
            option.classList.toggle(
              'hidden',
              Boolean(
                search &&
                !normalized(option.textContent)
                  .includes(search)
              )
            );
          });
      };
    });

  const advancedToggle = $('advancedFiltersToggle');
  const advancedPanel = $('advancedFiltersPanel');

  advancedToggle.onclick = event => {
    event.stopPropagation();
    advancedPanel.classList.toggle('hidden');
  };
}

function syncOperationalScopeFilters() {
  const card = document.querySelector('[data-filter-field="PPV Tag"]');
  if (!card) return;

  const disabled = (state.operationalScope || 'all') !== 'all';
  const toggle = card.querySelector('.multi-filter-toggle');
  if (toggle) {
    toggle.disabled = disabled;
    toggle.setAttribute('aria-disabled', String(disabled));
  }
  card.classList.toggle('filter-disabled', disabled);
  if (disabled) {
    card.querySelector('.multi-filter-menu')?.classList.add('hidden');
    state.filters['PPV Tag'] = new Set();
    updateFilterButton(card, state.filters['PPV Tag']);
  }
}

function updateFilterButton(card, selected) {
  card.classList.toggle(
    'filter-has-selection',
    selected.size > 0
  );

  const button = card.querySelector(
    '.multi-filter-toggle b'
  );

  button.classList.toggle(
    'filter-selection-count',
    selected.size > 0
  );

  button.textContent = selected.size
    ? `${selected.size} selected`
    : '⌄';
}

function applyFilters() {
  const query = normalized(
    $('searchInput').value
  );
  const operationalScope = state.operationalScope || 'all';

  state.filteredRows = state.allRows.filter(row => {
    const ppvTag = normalized(row['PPV Tag'] || '');
    const ppvTagKey = ppvTag.replace(/[_-]+/g, ' ');
    const isP3 = ppvTagKey === 'testing p3' ||
      (ppvTagKey.includes('p3') && (ppvTagKey.includes('passed') || ppvTagKey.includes('failed')));
    const isPPV = ppvTagKey === 'ppv';

    if (
      (operationalScope === 'p3' && !isP3) ||
      (operationalScope === 'ppv' && !isPPV) ||
      (operationalScope === 'all-others' && (isP3 || isPPV))
    ) {
      return false;
    }

    if (
      query &&
      !Object.values(row).some(value =>
        normalized(value).includes(query)
      )
    ) {
      return false;
    }

    return FILTER_HEADERS.every(field => {
      const selected = state.filters[field];

      if (!selected || !selected.size) {
        return true;
      }

      const rowValue =
        field === 'Show Length'
          ? showLengthBucket(row[field])
          : AUTHOR_BUCKET_FIELDS.has(field)
            ? filterKey(authorFilterBucket(field, row[field]))
          : field === 'Label'
            ? filterKey(state.showLabels[showLabelKey(row['Show Title'])] || '')
          : filterKey(row[field] ?? '');

      return selected.has(rowValue);
    });
  });

  state.page = 1;

  render();
  updateExportMeta();
  updateActiveFilterCount();
}

function updateActiveFilterCount() {
  const count = Object.values(
    state.filters
  ).filter(values => values && values.size).length;

  $('activeFilterCount').textContent =
    `${count} filter${count === 1 ? '' : 's'} active`;
}
