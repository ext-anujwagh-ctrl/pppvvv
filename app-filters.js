/* Filter controls and filtered-row calculations */

function filterMarkup(field, index) {
  const values = (
    field === 'Show Length'
      ? SHOW_LENGTH_BUCKETS
      : unique(field)
  ).filter(value => String(value).trim() !== '');

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
        <span>${escapeHTML(field)}</span>
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

        <div class="filter-options">
          ${values.map(value => `
            <label class="filter-option">
              <input
                type="checkbox"
                data-filter-value="${escapeHTML(filterKey(value))}"
              />
              <span>${escapeHTML(filterLabel(value))}</span>
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

function updateFilterButton(card, selected) {
  const button = card.querySelector(
    '.multi-filter-toggle b'
  );

  button.textContent = selected.size
    ? `${selected.size} selected`
    : '⌄';
}

function applyFilters() {
  const query = normalized(
    $('searchInput').value
  );

  state.filteredRows = state.allRows.filter(row => {
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

