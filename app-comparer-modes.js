/* Comparer mode-specific UI and charts */

const PPV_BENCHMARK_SHOWS = [
  {
    id: 'cd532605283eb73524e7a93c4f887f670a980c19',
    title: "The Duke's Masked Bride",
    genres: ['Romance', 'Drama']
  },
  {
    id: 'a2fa57d4cb8267b2645f2b588c39951fbf65093a',
    title: 'My Vampire System',
    excludedGenres: ['Romance', 'Drama', 'Romantasy']
  },
  {
    id: 'cbc35fa13bbe154873ec97f78f2b4cf4b66c7d31',
    title: "The Alpha's Bride",
    genres: ['Romantasy']
  }
];

function benchmarkShowAppliesToGenre(show, genre) {
  if (show.genres) return show.genres.includes(genre);
  return !show.excludedGenres.includes(genre);
}

function ppvFilterValues(kind) {
  if (kind === 'tag') return [...new Set(
    state.allRows
      .map(row => String(row['PPV Tag'] || '').trim())
      .filter(value => value && !['not found', 'no change', 'no_change', 'null'].includes(value.toLowerCase()))
  )].sort((a, b) => a.localeCompare(b));
  if (kind === 'genre') return [...new Set(
    state.allRows
      .map(row => String(row['Genre'] || '').trim())
      .filter(value => value && !['null', 'not found', 'no change'].includes(value.toLowerCase()))
  )].sort((a, b) => a.localeCompare(b));
  const benchmarkRows = state.comparerPPVGenres.flatMap(genre =>
    PPV_BENCHMARK_SHOWS
      .filter(show => benchmarkShowAppliesToGenre(show, genre))
      .map(show => ({
        'Show ID': show.id,
        'Show Title': show.title,
        Genre: genre,
        'PPV Tag': 'Benchmark'
      }))
  );
  const uniqueRows = [...new Map(
    [...ppvTagScopedRows(), ...benchmarkRows]
      .map(row => [String(row['Show ID'] || ''), row])
  ).values()];
  return uniqueRows.map(row => ({
    value: String(row['Show ID'] || ''),
    label: `${String(row['Show Title'] || row['Show ID'] || '')} · ${String(row['Show ID'] || '')}`
  }));
}

function ppvFilterSelection(kind) {
  if (kind === 'tag') return state.comparerPPVTags;
  if (kind === 'genre') return state.comparerPPVGenres;
  return state.comparerPPVShows;
}

function setPPVFilterSelection(kind, values) {
  if (kind === 'tag') state.comparerPPVTags = values;
  else if (kind === 'genre') state.comparerPPVGenres = values;
  else state.comparerPPVShows = values;
}

function ppvTagScopedRows() {
  return state.allRows.filter(row => {
    const tag = String(row['PPV Tag'] || '').trim();
    const genre = String(row['Genre'] || '').trim();
    return state.comparerPPVTags.includes(tag) && state.comparerPPVGenres.includes(genre);
  });
}

function ppvFilterPickerLabel(kind, selected, total) {
  if (!selected.length) return kind === 'tag' ? 'No PPV tags' : kind === 'genre' ? 'No genres' : 'No shows selected';
  if (selected.length === total) return kind === 'tag' ? 'All PPV tags' : kind === 'genre' ? 'All genres' : 'All shows';
  return `${selected.length} selected`;
}

function renderPPVFilterPicker(kind) {
  const list = $(kind === 'tag' ? 'comparePPVTagList' : kind === 'genre' ? 'comparePPVGenreList' : 'comparePPVShowsList');
  if (!list) return;
  const rawValues = ppvFilterValues(kind);
  const values = rawValues.map(value => typeof value === 'string' ? { value, label: value } : value);
  const selected = ppvFilterSelection(kind);
  const card = list.closest('.multi-filter');
  const indicator = card?.querySelector('.filter-chevron');
  card?.classList.toggle('filter-has-selection', selected.length > 0);
  indicator?.classList.toggle('filter-selection-count', selected.length > 0);
  if (indicator) indicator.textContent = selected.length ? `${selected.length} selected` : '⌄';
  list.classList.toggle('has-scroll', values.length > 5);
  list.innerHTML = values.map(item => `<label class="filter-option" data-filter-label="${escapeHTML(item.label.toLowerCase())}">
    <input type="checkbox" data-ppv-filter-kind="${kind}" value="${escapeHTML(item.value)}" ${selected.includes(item.value) ? 'checked' : ''}>
    <span>${escapeHTML(item.label)}</span>
  </label>`).join('') || '<span class="comparer-filter-picker-empty">No values match these filters.</span>';
}

function refreshPPVTagShowPicker() {
  renderPPVFilterPicker('tag');
  renderPPVFilterPicker('genre');
  renderPPVFilterPicker('shows');
}

function setupPPVTagControls() {
  const tags = ppvFilterValues('tag');
  const genres = ppvFilterValues('genre');
  if (!state.comparerPPVFiltersInitialized) {
    state.comparerPPVTags = [];
    state.comparerPPVGenres = [];
    state.comparerPPVShows = [];
    state.comparerPPVFiltersInitialized = true;
  } else {
    state.comparerPPVTags = state.comparerPPVTags.filter(value => tags.includes(value));
    state.comparerPPVGenres = state.comparerPPVGenres.filter(value => genres.includes(value));
  }
  const scopedIds = ppvTagScopedRows().map(row => String(row['Show ID'] || ''));
  state.comparerPPVShows = state.comparerPPVShows.filter(showId => scopedIds.includes(showId));
  refreshPPVTagShowPicker();
}

function filterPPVPickerOptions(kind, query) {
  const list = $(kind === 'tag' ? 'comparePPVTagList' : kind === 'genre' ? 'comparePPVGenreList' : 'comparePPVShowsList');
  if (!list) return;
  const normalizedQuery = query.trim().toLowerCase();
    list.querySelectorAll('.filter-option').forEach(option => {
    option.classList.toggle('hidden', normalizedQuery && !option.dataset.filterLabel.includes(normalizedQuery));
  });
}

function refreshComparerModeUI() {
  const card = $('comparerCard');
  const tagControl = document.querySelector('.comparer-tag-control');
  const genreControl = document.querySelector('.comparer-genre-control');
  const showPickerControl = document.querySelector('.comparer-show-picker-control');
  const chartControls = $('comparerChartControls');
  const showControls = document.querySelectorAll('.comparer-show-control');
  const isTagMode = state.comparerMode === 'ppv-tags';
  card?.classList.toggle('comparer-tag-mode', isTagMode);
  tagControl?.classList.toggle('hidden', !isTagMode);
  genreControl?.classList.toggle('hidden', !isTagMode);
  showPickerControl?.classList.toggle('hidden', !isTagMode);
  showControls.forEach(control => control.classList.toggle('hidden', isTagMode));
  document.querySelectorAll('[data-comparer-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.comparerMode === state.comparerMode);
  });
  refreshComparerChartControls();
}

function refreshComparerChartControls() {
  const container = $('comparerChartControls');
  const typeSelect = $('compareRetentionType');
  if (!container || !typeSelect) return;

  const isTabular = typeSelect.value === 'comparer tabular';
  const isPPVTagsMode = state.comparerMode === 'ppv-tags';
  if (isPPVTagsMode) {
    const isPPVBenchmarks = typeSelect.value === 'ppv benchmarks';
    const hourMin = isPPVBenchmarks ? 20 : 1;
    const hourMax = isPPVBenchmarks ? 100 : 200;
    const input = (axis, edge, min, max, current) => `
      <span class="comparer-axis-input">
        <input type="number" min="${min}" max="${max}" step="any" value="${current}" data-comparer-axis="${axis}-${edge}" aria-label="${axis === 'x' ? 'Hour' : 'Retention percentage'} ${edge}" />
        <span class="comparer-axis-spinner" aria-hidden="true">
          <button type="button" tabindex="-1" data-comparer-axis-step="${axis}-${edge}" data-direction="up">▲</button>
          <button type="button" tabindex="-1" data-comparer-axis-step="${axis}-${edge}" data-direction="down">▼</button>
        </span>
      </span>
    `;
    container.innerHTML = `
      <button type="button" class="${state.comparerChartXMin === hourMin && state.comparerChartXMax === hourMax && state.comparerChartYMin === 0 && state.comparerChartYMax === 100 ? 'active' : ''}" data-comparer-chart-action="reset-range">Overall</button>
      <div class="comparer-axis-range"><strong>Hour</strong>${input('x', 'min', hourMin, hourMax, state.comparerChartXMin)}<span>To</span>${input('x', 'max', hourMin, hourMax, state.comparerChartXMax)}</div>
      <div class="comparer-axis-range"><strong>Retention</strong>${input('y', 'min', 0, 100, state.comparerChartYMin)}<span>To</span>${input('y', 'max', 0, 100, state.comparerChartYMax)}<em>%</em></div>
    `;
    container.classList.remove('hidden');
    return;
  }
  const isPPVBenchmarks = typeSelect.value === 'ppv benchmarks';
  const ranges = isPPVBenchmarks
    ? [
        ['Overall', 20, 100],
        ['H20-H50', 20, 50],
        ['H50-H100', 50, 100]
      ]
    : [
        ['Overall', 1, 200],
        ['H1-H10', 1, 10],
        ['H10-H50', 10, 50],
        ['H50-H100', 50, 100],
        ['H100-H200', 100, 200]
      ];

  container.innerHTML = ranges.map(([label, min, max]) => `
    <button type="button" class="${state.comparerChartXMin === min && state.comparerChartXMax === max ? 'active' : ''}" data-comparer-chart-action="range" data-range-min="${min}" data-range-max="${max}">${label}</button>
  `).join('');
  container.classList.toggle('hidden', isTabular);
}

const PPV_COMPARER_COLORS = [
  '#ff5f73', '#66d9e8', '#a675ff', '#51d3a2', '#f5be42',
  '#72aaf5', '#ff9f68', '#c6e377', '#d78cff', '#8dd3c7'
];

function showInitials(title) {
  const words = String(title || '').match(/[A-Za-z0-9]+/g) || [];
  const initials = words.map(word => word[0]).join('').toUpperCase();
  return initials || 'SHOW';
}

function comparerSeriesColor(index) {
  return PPV_COMPARER_COLORS[index % PPV_COMPARER_COLORS.length];
}

function renderPPVTagComparison(viewKey) {
  const canvas = $('comparerChart');
  const status = $('comparerStatus');
  const analysis = $('comparerAnalysis');
  const dataset = retentionDatasetForView(viewKey);
  if (!canvas || !dataset || typeof Chart === 'undefined') return;

  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  const selectedShows = new Set(state.comparerPPVShows);
  const matchingRows = ppvTagScopedRows().filter(row => selectedShows.has(String(row['Show ID'] || '')));
  const rows = matchingRows.map(row => {
    const showId = String(row['Show ID'] || '');
    const availableCohorts = dataset.isPPVBenchmark
      ? (dataset.cohortHours || []).filter(hour => dataset.cohortRows?.[`${showId}|${hour}`])
      : [];
    const requestedCohort = Number(row['PPV Max Hour']) || state.ppvMaxHour;
    const maxHour = dataset.isPPVBenchmark
      ? (availableCohorts.includes(requestedCohort) ? requestedCohort : availableCohorts.at(-1))
      : requestedCohort || dataset.cohortHours?.at(-1);
    const datasetRow = dataset.isPPVBenchmark
      ? dataset.cohortRows?.[`${showId}|${maxHour}`]
      : dataset.rows.find(item => normalized(item['Show ID']) === normalized(row['Show ID']));
    return { row, datasetRow };
  }).filter(item => item.datasetRow)
    .sort((a, b) => String(a.row['Genre'] || '').localeCompare(String(b.row['Genre'] || '')) ||
      String(a.row['Show Title'] || '').localeCompare(String(b.row['Show Title'] || '')));
  const datasets = rows.map(({ row, datasetRow }, index) => {
    const points = retentionFieldEntries(datasetRow).filter(point => point.hour >= 1);
    const fullLabel = row['Show Title'] || row['Show ID'];
    return {
      label: showInitials(fullLabel),
      shortLabel: showInitials(fullLabel),
      fullLabel,
      data: points.map(point => ({ x: point.hour, y: point.value })),
      borderColor: comparerSeriesColor(index),
      backgroundColor: comparerSeriesColor(index),
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.2,
      fill: false
    };
  });

  const selectedTagLabel = state.comparerPPVTags.length ? state.comparerPPVTags.join(', ') : 'no PPV tags';
  const selectedGenreLabel = state.comparerPPVGenres.length ? state.comparerPPVGenres.join(', ') : 'no genres';
  if (status) status.textContent = `${rows.length} shows · ${selectedTagLabel} · ${selectedGenreLabel}`;
  if (analysis) analysis.textContent = rows.length
    ? `Showing retention curves for ${selectedTagLabel} in ${selectedGenreLabel}.`
    : 'No shows match the selected PPV tag and genre filters.';

  const chart = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'nearest' },
      plugins: {
        legend: {
          display: rows.length <= 10,
          position: 'bottom',
          labels: {
            color: '#b7c0ce',
            font: { size: 9 },
            boxWidth: 14,
            padding: 8,
            generateLabels: currentChart => Chart.defaults.plugins.legend.labels.generateLabels(currentChart).map(item => ({
              ...item,
              text: currentChart.data.datasets[item.datasetIndex]?.shortLabel || item.text
            }))
          },
          onHover: (event, legendItem) => {
            const dataset = chart.data.datasets[legendItem.datasetIndex];
            const tooltip = $('comparerLegendTooltip');
            const nativeEvent = event.native || event;
            if (tooltip && dataset?.fullLabel) {
              tooltip.textContent = dataset.fullLabel;
              tooltip.style.left = `${nativeEvent.clientX + 10}px`;
              tooltip.style.top = `${nativeEvent.clientY + 10}px`;
              tooltip.classList.add('visible');
            }
          },
          onLeave: () => $('comparerLegendTooltip')?.classList.remove('visible')
        },
        tooltip: {
          callbacks: {
            title: items => items.length ? `H${items[0].parsed.x}` : '',
            label: item => `${item.dataset.fullLabel || item.dataset.label}: ${item.formattedValue}%`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: state.comparerChartXMin || 1,
          max: state.comparerChartXMax || 200,
          afterBuildTicks: axis => {
            axis.ticks = [1, 5, 10, 20, 30, 50, 100, 120, 150, 200]
              .filter(value => value >= axis.min && value <= axis.max)
              .map(value => ({ value }));
          },
          ticks: { color: '#8e98a9', callback: value => `H${value}` },
          grid: { color: '#293140' }
        },
        y: {
          min: state.comparerChartYMin ?? 0,
          max: state.comparerChartYMax ?? 100,
          beginAtZero: false,
          ticks: { color: '#8e98a9', callback: value => `${value}%` },
          grid: { color: '#293140' }
        }
      }
    }
  });
  state.comparerChart = chart;
}
