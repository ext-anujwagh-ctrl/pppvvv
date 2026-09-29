/* Table rendering and show-details modal */

function render() {
  const rows = state.filteredRows;

  renderOperationalTableHead();

  updateCharts();

  $('resultCount').textContent =
    `${rows.length.toLocaleString()} result${
      rows.length === 1 ? '' : 's'
    }`;

  const pages = Math.max(
    1,
    Math.ceil(rows.length / state.pageSize)
  );

  state.page = Math.min(state.page, pages);

  $('pageInfo').textContent =
    `Page ${state.page} of ${pages}`;

  $('previousPage').disabled = state.page <= 1;
  $('nextPage').disabled = state.page >= pages;

  const start =
    (state.page - 1) * state.pageSize;

  const pageRows = rows.slice(
    start,
    start + state.pageSize
  );

  $('showTableBody').innerHTML = pageRows
    .map((row, index) => `
      <tr class="show-row" data-row-index="${start + index}">
        ${state.operationalColumns
          .map(field => `<td class="${tableColumnClass(field)}">${operationalCell(field, row)}</td>`)
          .join('')}
      </tr>
    `)
    .join('');

  $('emptyState').classList.toggle(
    'hidden',
    pageRows.length > 0
  );

  document
    .querySelectorAll('#showTableBody tr[data-row-index]')
    .forEach(rowElement => {
      rowElement.addEventListener('click', () => {
        openDetails(
          rows[Number(rowElement.dataset.rowIndex)]
        );
      });
    });
}

function renderOperationalTableHead() {
  $('operationalTableHead').innerHTML = `
    <tr>
      ${state.operationalColumns
        .map(field => `<th class="${tableColumnClass(field)}" title="${escapeHTML(field)}">${escapeHTML(tableHeaderLabel(field))}</th>`)
        .join('')}
    </tr>
  `;
}

function tableHeaderLabel(field) {
  const labels = {
    'Show Title': 'Show',
    'PPV Tag': 'PPV tag',
    'Active/Inactive': 'Status',
    'Activity Days (L30D)': 'L30 Actv',
    'Show Length': 'Length'
  };

  return labels[field] || field;
}

function tableColumnClass(field) {
  return `column-${normalized(field).replace(/[^a-z0-9]+/g, '-')}`;
}

function operationalCell(field, row) {
  if (field === 'Show Title') {
    return `
      <div class="show-name" title="${escapeHTML(row[field])}">
        ${escapeHTML(row[field] || 'Untitled')}
      </div>
      <div class="show-id">${escapeHTML(row['Show ID'])}</div>
    `;
  }

  if (field === 'PPV Tag') return tag(row[field]);
  if (field === 'Active/Inactive') return statusTag(row[field]);
  if (field === 'Priority') return priorityTag(row[field]);

  return escapeHTML(row[field] || '-');
}

function setupOperationalColumns() {
  const container = $('operationalColumnSelector');
  if (!container) return;

  container.innerHTML = CSV_HEADERS.map(field => `
    <label class="column-option ${state.operationalColumns.includes(field) ? 'column-option-pinned' : ''}">
      <input type="checkbox" data-operational-column="${escapeHTML(field)}" ${state.operationalColumns.includes(field) ? 'checked' : ''} />
      <span>${escapeHTML(tableHeaderLabel(field))}</span>
    </label>
  `).join('');

  container.querySelectorAll('[data-operational-column]').forEach(input => {
    input.addEventListener('change', event => {
      const field = event.target.dataset.operationalColumn;
      const next = new Set(state.operationalColumns);

      if (event.target.checked) next.add(field);
      else next.delete(field);

      if (!next.size) {
        event.target.checked = true;
        return;
      }

      state.operationalColumns = CSV_HEADERS.filter(column => next.has(column));
      setupOperationalColumns();
      render();
    });
  });

  $('operationalColumnCount').textContent =
    `${state.operationalColumns.length} columns selected`;
}

function escapeHTML(value) {
  return String(value || '').replace(
    /[&<>'"]/g,
    char =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[char]
  );
}

function tag(value) {
  const displayLabels = {
    action_needed_p3_failed: 'P3 Failed',
    action_needed_p3_passed: 'P3 Passed'
  };

  const displayValue =
    displayLabels[normalized(value)] || value;

  return value
    ? `<span class="tag">${escapeHTML(displayValue)}</span>`
    : '-';
}

function statusTag(value) {
  if (!value) return '-';

  const className = isYes(value)
    ? 'tag-green'
    : 'tag-red';

  return `
    <span class="tag ${className}">
      ${escapeHTML(value)}
    </span>
  `;
}

function priorityTag(value) {
  if (!value) return '-';

  const normalizedValue = normalized(value);

  const priorityClasses = {
    p00: 'tag-priority-p00',
    p0: 'tag-priority-p0',
    p1: 'tag-priority-p1',
    p2: 'tag-priority-p2',
    p3: 'tag-priority-p3'
  };

  const className =
    priorityClasses[normalizedValue] || '';
  return `
    <span class="tag ${className}">
      ${escapeHTML(value)}
    </span>
  `;
}

const DETAIL_GROUPS = [
  {
    title: 'Editorial and priority',
    fields: [
      'Is Top Author Show?',
      'Completed',
      'Incentive Flag',
      'L3M Payouts',
      'Classification',
      'Throughput (L30D)',
      'Published Word Count',
      'What it means?',
      'Total Throughput (L30D)',
      'Contracted',
      'Editor',
      'CL',
      'SCL',
      'Overall Editorial conviction',
      'Subjective Conviction'
    ]
  },
  {
    title: 'Author information',
    fields: [
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
      'Number of other shows in P3/PPV'
    ]
  },
  {
    title: 'Writer and relationship',
    fields: [
      'Writer Relation / Last Touch Point',
      "Writer's Editing Activity",
      'Writing on other platforms',
      'Where are you connected to the writer?',
      'Editor Connect History',
      'Writer Cadence',
      'Date Connected',
      'Primary Medium',
      'Connected details',
      'Chapters / Hrs Planned?',
      'Writer / Editor Focus'
    ]
  },
  {
    title: 'Comments and notes',
    fields: [
      'Editorial Comments (Writer POV)',
      'Editorial Comments (Story POV)',
      'Other Comments (If Any)',
      'Editorial documents',
      'Synopsis',
      'Log of the conversation',
      'Changes this week',
      'Risk/Help Needed/CX Escalation Ongoing'
    ]
  }
];

function detailCard(header, value) {
  const full =
    value.length > 100 ||
    header.includes('Comments') ||
    header.includes('Synopsis') ||
    header.includes('conversation') ||
    header.includes('documents') ||
    header.includes('Changes') ||
    header.includes('Risk');

  return `
    <div class="detail-card ${full ? 'full' : ''}">
      <span class="detail-label">
        ${escapeHTML(header)}
      </span>
      <div class="detail-value">${escapeHTML(cleanDetailValue(value))}</div>
    </div>
  `;
}

function cleanDetailValue(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

function openDetails(row) {
  $('detailsTitle').textContent =
    row['Show Title'] || 'Show details';
  $('detailsShowId').textContent = row['Show ID'] || '-';

  const detailFields = new Set(
    DETAIL_HEADERS.filter(
      header =>
        header !== 'Show ID' &&
        header !== 'Show Title'
    )
  );

  const sections = DETAIL_GROUPS
    .map(section => {
      const fields = section.fields.filter(
        field =>
          detailFields.has(field) &&
          row[field]
      );

      fields.forEach(field => detailFields.delete(field));

      if (!fields.length) return '';

      return `
        <section class="detail-section">
          <div class="detail-section-heading">
            <span class="eyebrow">${escapeHTML(section.title)}</span>
          </div>
          <div class="detail-grid">
            ${fields
              .map(field =>
                detailCard(field, row[field])
              )
              .join('')}
          </div>
        </section>
      `;
    })
    .join('');

  const remainingFields = [
    ...detailFields
  ].filter(field => row[field]);

  const remainingSection = '';

  $('detailsContent').innerHTML = `
    <section class="retention-chart-grid">
      <article id="retentionChartSection" class="retention-chart-section hidden">
        <div class="detail-section-heading">
          <span class="eyebrow">RETENTION PERFORMANCE</span>
          <strong>Normalised retention</strong>
        </div>
        <div id="retentionControls" class="retention-controls"></div>
        <p id="retentionMeta" class="retention-meta"></p>
        <div class="retention-chart-wrap">
          <canvas id="retentionChart"></canvas>
        </div>
      </article>
      <article id="ppvRetentionChartSection" class="retention-chart-section hidden">
        <div class="detail-section-heading">
          <span class="eyebrow">RETENTION PERFORMANCE</span>
          <strong>PPV Benchmarks</strong>
        </div>
        <div id="ppvRetentionControls" class="retention-controls"></div>
        <p id="ppvRetentionMeta" class="retention-meta"></p>
        <div class="retention-chart-wrap">
          <canvas id="ppvRetentionChart"></canvas>
        </div>
      </article>
    </section>
    ${sections}
    ${remainingSection}
  `;

  $('detailsModal').classList.remove('hidden');
  state.retentionView = 'normalised overall';
  state.ppvMaxHour = null;
  setupRetentionControls(row);
  setupPPVControls(row);
  renderRetentionCharts(row);
}

function retentionFieldEntries(row) {
  return Object.keys(row || {})
    .map(field => {
      const match = field.match(/^H(\d+) Ret% Nth TD$/i);

      if (!match) return null;

      const value = Number.parseFloat(
        String(row[field] ?? '').replace('%', '').trim()
      );

      if (!Number.isFinite(value)) return null;

      return {
        hour: Number(match[1]),
        value: value > 1 ? value : value * 100
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.hour - b.hour);
}

const RETENTION_VALUE_LABELS_PLUGIN = {
  id: 'retentionValueLabels',

  afterDatasetsDraw(chart) {
    const targetHours = new Set([5, 10, 50, 100]);
    const labels = chart.data.labels || [];
    const labelOptions = chart.options.plugins.retentionValueLabels || {};
    const firstBelowBenchmark = labelOptions.firstBelowBenchmark;
    const firstBelowIndex = firstBelowBenchmark
      ? chart.data.datasets[0]?.data.findIndex((value, index) => {
          const benchmark = chart.data.datasets[1]?.data[index];
          return Number.isFinite(Number(value)) &&
            Number.isFinite(Number(benchmark)) &&
            Number(value) < Number(benchmark);
        })
      : -1;

    const context = chart.ctx;
    const chartArea = chart.chartArea;
    const boxHeight = 20;
    const boxGap = 6;
    const laneHeight = boxHeight + boxGap;
    const boxPadding = 7;

    if (!chartArea) return;

    context.save();

    chart.data.datasets.slice(0, 2).forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!dataset || !meta) return;

      let annotationIndex = 0;

      meta.data.forEach((point, index) => {
        const hourMatch = String(labels[index]).match(/^H(\d+)$/);
        const value = Number(dataset.data[index]);

        const shouldLabel = firstBelowBenchmark
          ? index === firstBelowIndex
          : hourMatch && targetHours.has(Number(hourMatch[1]));

        if (!shouldLabel || !Number.isFinite(value)) {
          return;
        }

        context.fillStyle = datasetIndex === 0
          ? '#b8f5c8'
          : '#f2f5f8';

        const valueLabel = datasetIndex === 0
          ? `Actual - ${value.toFixed(1)}%`
          : `BM - ${value.toFixed(1)}%`;

        context.font = '600 10px Inter, sans-serif';
        const boxWidth = context.measureText(valueLabel).width + boxPadding * 2;
        const boxX = Math.max(
          chartArea.left,
          Math.min(point.x - boxWidth / 2, chartArea.right - boxWidth)
        );
        const lane = datasetIndex * 2 + (annotationIndex % 2);
        const boxY = chartArea.top + lane * laneHeight + 4;
        annotationIndex += 1;
        const connectorX = Math.max(
          boxX + 8,
          Math.min(point.x, boxX + boxWidth - 8)
        );
        const borderColor = datasetIndex === 0
          ? '#8ee6a8'
          : '#f2f5f8';

        context.strokeStyle = borderColor;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(connectorX, boxY + boxHeight);
        context.stroke();

        context.fillStyle = 'rgba(18, 26, 38, .96)';
        context.strokeStyle = borderColor;
        context.beginPath();
        context.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        context.fill();
        context.stroke();

        context.fillStyle = datasetIndex === 0
          ? '#b8f5c8'
          : '#f2f5f8';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(valueLabel, boxX + boxWidth / 2, boxY + boxHeight / 2 + 1);
      });
    });

    context.restore();
  }
};

function retentionControlMarkup() {
  const normalisedSections = RETENTION_VIEW_SECTIONS.filter(section =>
    section.label !== 'PPV Benchmarks'
  );

  const renderNormalisedSection = section => `
    <div class="retention-pill-section">
      <div class="retention-selector-title">${escapeHTML(section.label)}</div>
      <div class="retention-pill-selectors">
        <div class="retention-pill-selector">
          <div class="retention-pill-group">
            ${[section.rows[0]?.options[0], section.rows[1]?.options[0]].map((option, index) => option && !option.disabled
              ? `
                <button
                  class="retention-control-option ${state.retentionView === option.sheet ? 'active' : ''}"
                  type="button"
                  data-retention-sheet="${escapeHTML(option.sheet)}"
                >
                  ${index === 0 ? 'Overall' : 'US'}
                </button>
              `
              : ''
            ).join('')}
          </div>
        </div>
        <div class="retention-pill-selector">
          <div class="retention-pill-group">
            ${section.rows[0]?.options.slice(1).map(option => option.disabled
              ? ''
              : `
                <button
                  class="retention-control-option ${state.retentionView === option.sheet ? 'active' : ''}"
                  type="button"
                  data-retention-sheet="${escapeHTML(option.sheet)}"
                >
                  ${escapeHTML(option.label)}
                </button>
              `
            ).join('') || ''}
          </div>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="retention-pill-layout retention-normalised-controls">
      ${normalisedSections.map(renderNormalisedSection).join('')}
    </div>
  `;
}

function setupRetentionControls(showRow) {
  const container = $('retentionControls');
  if (!container) return;

  container.innerHTML = retentionControlMarkup();

  container
    .querySelectorAll('[data-retention-sheet]')
    .forEach(button => {
      button.addEventListener('click', () => {
        state.retentionView = button.dataset.retentionSheet;
        setupRetentionControls(showRow);
        renderRetentionChart(
          showRow,
          state.retentionView,
          'retentionChart',
          'retentionChartSection'
        );
      });
    });
}

function setupPPVControls(showRow) {
  const container = $('ppvRetentionControls');
  const dataset = retentionDatasetForView('ppv benchmarks');

  if (!container || !dataset?.isPPVBenchmark) return;

  const fallbackRow = dataset.rows.find(row =>
    row['Show ID'] === showRow['Show ID']
  );
  const availableHours = dataset.cohortHours.filter(hour =>
    dataset.cohortRows?.[`${showRow['Show ID']}|${hour}`]
  );

  if (state.ppvMaxHour === null) {
    state.ppvMaxHour = fallbackRow?.['PPV Max Hour'] ?? availableHours.at(-1);
  }

  const cohortRow = dataset.cohortRows?.[
    `${showRow['Show ID']}|${state.ppvMaxHour}`
  ];
  const meta = $('ppvRetentionMeta');
  if (meta) {
    meta.textContent = cohortRow
      ? `H${state.ppvMaxHour} cohort · H10 LDAU: ${cohortRow['H10 LDAU'] || '-'}`
      : 'No PPV benchmark data for this show.';
  }

  container.innerHTML = `
    <div class="retention-pill-selector">
      <span>Max hour</span>
      <div class="retention-pill-group">
        ${dataset.cohortHours.map(hour => {
          const available = availableHours.includes(hour);
          return `
            <button
              class="retention-control-option ${state.ppvMaxHour === hour ? 'active' : ''}"
              type="button"
              data-ppv-max-hour="${hour}"
              ${available ? '' : 'disabled'}
            >
              H${hour}
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container
    .querySelectorAll('[data-ppv-max-hour]')
    .forEach(button => {
      button.addEventListener('click', () => {
        state.ppvMaxHour = Number(button.dataset.ppvMaxHour);
        setupPPVControls(showRow);
        renderRetentionChart(
          showRow,
          'ppv benchmarks',
          'ppvRetentionChart',
          'ppvRetentionChartSection'
        );
      });
    });
}

function renderRetentionCharts(showRow) {
  const normalisedView = state.retentionView === 'ppv benchmarks'
    ? 'normalised overall'
    : state.retentionView;

  renderRetentionChart(showRow, normalisedView, 'retentionChart', 'retentionChartSection');
  renderRetentionChart(showRow, 'ppv benchmarks', 'ppvRetentionChart', 'ppvRetentionChartSection');
}

function retentionDatasetForView(viewKey) {
  const retentionKey = value =>
    normalized(value).replace(/[^a-z0-9]+/g, ' ').trim();
  const requestedKey = retentionKey(viewKey);
  const datasetEntries = Object.entries(state.retentionDatasets);
  const exactMatch = datasetEntries.find(([key]) =>
    retentionKey(key) === requestedKey
  );

  if (exactMatch) return exactMatch[1];

  const requestedTokens = requestedKey.split(' ');
  const matchingEntry = datasetEntries.find(([key]) => {
    const candidateKey = retentionKey(key);
    return requestedTokens.every(token => candidateKey.includes(token));
  });

  return matchingEntry ? matchingEntry[1] : null;
}

function renderRetentionChart(showRow, viewKey, canvasId, sectionId) {
  const section = $(sectionId);
  const canvas = $(canvasId);

  if (!section || !canvas) return;

  const dataset = retentionDatasetForView(viewKey);
  const existingChart = typeof Chart !== 'undefined'
    ? Chart.getChart(canvas)
    : null;

  if (existingChart) existingChart.destroy();

  const retentionRow = dataset?.isPPVBenchmark
    ? dataset.cohortRows?.[
        `${showRow['Show ID']}|${state.ppvMaxHour}`
      ] || dataset.rows.find(row =>
        normalized(row['Show ID']) === normalized(showRow['Show ID'])
      )
    : dataset?.rows.find(row =>
        normalized(row['Show ID']) === normalized(showRow['Show ID'])
      );

  section.classList.remove('hidden');

  if (!retentionRow) {
    delete state.retentionCharts[viewKey];
    section.classList.add('hidden');
    return;
  }

  const points = retentionFieldEntries(retentionRow);

  if (!dataset.isPPVBenchmark) {
    const meta = $('retentionMeta');
    if (meta) {
      const ldau = Number(retentionRow.LDAU);
      meta.textContent = `LDAU: ${Number.isFinite(ldau) ? ldau.toLocaleString() : '-'}`;
    }
  }

  if (!points.length) {
    section.classList.add('hidden');
    return;
  }

  if (typeof Chart === 'undefined') {
    section.classList.add('hidden');
    return;
  }

  const genreKey = benchmarkGenreKey(showRow['Genre']);
  const benchmarkRow = dataset.isPPVBenchmark
    ? dataset.cohortBenchmarks[
        `${genreKey}|${retentionRow['PPV Max Hour']}`
      ]
    : dataset.benchmarks[genreKey];
  const benchmarkPoints = benchmarkRow
    ? retentionFieldEntries(benchmarkRow)
    : [];
  const benchmarkByHour = new Map(
    benchmarkPoints.map(point => [point.hour, point.value])
  );

  const benchmarkLabel = dataset.isPPVBenchmark
    ? `PPV benchmark (H${retentionRow['PPV Max Hour']})`
    : showRow['Genre']
      ? `${showRow['Genre']} benchmark`
    : 'Genre benchmark';

  const datasets = [{
    label: dataset.isPPVBenchmark
      ? 'PPV retention'
      : 'Normalised retention',
    data: points.map(point => point.value),
    borderColor: '#8ee6a8',
    backgroundColor: 'rgba(142, 230, 168, .14)',
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 5,
    fill: true,
    tension: .25,
    spanGaps: true
  }];

  if (benchmarkPoints.length) {
    datasets.push({
      label: benchmarkLabel,
      data: points.map(point => benchmarkByHour.get(point.hour)),
      borderColor: '#f2f5f8',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [6, 5],
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: false,
      tension: .15,
      spanGaps: true
    });
  }

  state.retentionCharts[viewKey] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: points.map(point => `H${point.hour}`),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 112
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        retentionValueLabels: {
          firstBelowBenchmark: dataset.isPPVBenchmark
        },
        legend: {
          display: datasets.length > 1,
          position: 'bottom',
          labels: {
            color: '#b7c0ce',
            font: {
              size: 10
            },
            boxWidth: 18,
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: context => ` ${context.parsed.y.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#8e98a9',
            maxTicksLimit: 20,
            maxRotation: 0
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          ticks: {
            color: '#8e98a9',
            callback: value => `${value}%`
          },
          grid: {
            color: '#293140'
          }
        }
      }
    },
    plugins: [RETENTION_VALUE_LABELS_PLUGIN]
  });
}

function allRetentionOptions() {
  return RETENTION_VIEW_SECTIONS.flatMap(section =>
    section.rows.flatMap(row =>
      row.options
        .filter(option => !option.disabled)
        .map(option => ({
          ...option,
          label: `${section.label.replace(/^1 Version: /, '')} · ${row.label} · ${option.label}`
        }))
    )
  ).filter((option, index, options) =>
    options.findIndex(item => item.sheet === option.sheet) === index
  );
}

function setupComparer() {
  const typeSelect = $('compareRetentionType');
  const datalist = $('compareShowIds');
  const reportDatalist = $('reportShowIds');

  if (!typeSelect || !datalist) return;

  typeSelect.innerHTML = allRetentionOptions()
    .map(option => `
      <option value="${escapeHTML(option.sheet)}">${escapeHTML(option.label)}</option>
    `)
    .join('');

  datalist.innerHTML = state.allRows
    .map(row => `<option value="${escapeHTML(row['Show ID'])}">${escapeHTML(row['Show Title'])}</option>`)
    .join('');

  if (reportDatalist) {
    const reportRows = state.reportRows.length ? state.reportRows : state.allRows;
    reportDatalist.innerHTML = reportRows
      .map(row => `<option value="${escapeHTML(row.show_id || row['Show ID'])}">${escapeHTML(row.show_title || row['Show Title'])}</option>`)
      .join('');
  }
}

function compareRowById(dataset, showId) {
  const normalizedId = normalized(showId);

  return dataset?.rows.find(row =>
    normalized(row['Show ID']) === normalizedId ||
    normalized(row['Show Title']) === normalizedId
  );
}

function operationalRowByInput(value) {
  const target = normalized(value);
  return state.allRows.find(row =>
    normalized(row['Show ID']) === target ||
    normalized(row['Show Title']) === target
  );
}

const COMPARER_METRICS = [
  ['Activity Days (L30D)', 'L30 activity'],
  ['Throughput (L30D)', 'Throughput'],
  ['Total Throughput (L30D)', 'Total throughput'],
  ['Overall Editorial conviction', 'Editorial conviction'],
  ['Subjective Conviction', 'Subjective conviction'],
  ['Show Length', 'Show length'],
  ['Category', 'Category'],
  ['Priority', 'Priority'],
  ['PPV Tag', 'PPV tag']
];

function displayMetricValue(value) {
  const cleaned = String(value ?? '').trim();
  return cleaned || '-';
}

function renderComparerMetrics(rowOne, rowTwo) {
  const container = $('comparerMetrics');
  if (!container) return;

  const titleOne = rowOne['Show Title'] || rowOne['Show ID'] || 'Show 1';
  const titleTwo = rowTwo['Show Title'] || rowTwo['Show ID'] || 'Show 2';

  container.innerHTML = `
    <div class="metrics-heading">
      <span>Show metric comparison</span>
      <small>${escapeHTML(titleOne)} · ${escapeHTML(titleTwo)}</small>
    </div>
    <div class="metrics-table-wrap">
      <table class="metrics-table">
        <thead>
          <tr><th>Metric</th><th>${escapeHTML(titleOne)}</th><th>${escapeHTML(titleTwo)}</th></tr>
        </thead>
        <tbody>
          ${COMPARER_METRICS.map(([field, label]) => `
            <tr>
              <th>${escapeHTML(label)}</th>
              <td>${escapeHTML(displayMetricValue(rowOne[field]))}</td>
              <td>${escapeHTML(displayMetricValue(rowTwo[field]))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function clearComparerMetrics() {
  const container = $('comparerMetrics');
  if (container) container.innerHTML = '';
}

function renderComparison() {
  const canvas = $('comparerChart');
  const status = $('comparerStatus');
  const analysis = $('comparerAnalysis');
  const typeSelect = $('compareRetentionType');

  if (!canvas || !status || !analysis || !typeSelect) return;

  const showIdOne = $('compareShowIdOne').value.trim();
  const showIdTwo = $('compareShowIdTwo').value.trim();
  const dataset = retentionDatasetForView(typeSelect.value);
  const rowOne = compareRowById(dataset, showIdOne);
  const rowTwo = compareRowById(dataset, showIdTwo);

  if (!showIdOne || !showIdTwo) {
    status.textContent = 'Enter two Show IDs to compare.';
    analysis.textContent = '';
    clearComparerMetrics();
    return;
  }

  if (!dataset || !rowOne || !rowTwo) {
    status.textContent = 'One or both Show IDs were not found for this retention type.';
    analysis.textContent = '';
    clearComparerMetrics();
    return;
  }

  const pointsOne = retentionFieldEntries(rowOne);
  const pointsTwo = retentionFieldEntries(rowTwo);
  const pointMapOne = new Map(pointsOne.map(point => [point.hour, point.value]));
  const pointMapTwo = new Map(pointsTwo.map(point => [point.hour, point.value]));

  if (state.comparerChart) {
    state.comparerChart.destroy();
    state.comparerChart = null;
  }

  status.textContent = `${rowOne['Show Title'] || showIdOne} vs ${rowTwo['Show Title'] || showIdTwo}`;
  renderComparerMetrics(
    operationalRowByInput(showIdOne) || rowOne,
    operationalRowByInput(showIdTwo) || rowTwo
  );

  const average = points => points.length
    ? points.reduce((sum, point) => sum + point.value, 0) / points.length
    : null;
  const averageOne = average(pointsOne);
  const averageTwo = average(pointsTwo);
  const averageDifference = averageOne !== null && averageTwo !== null
    ? averageOne - averageTwo
    : null;
  const differenceText = averageDifference === null
    ? 'not available'
    : `${Math.abs(averageDifference).toFixed(1)} percentage points ${averageDifference >= 0 ? 'higher' : 'lower'}`;

  const firstBelowBenchmark = (row, points) => {
    const benchmarkRow = dataset.isPPVBenchmark
      ? dataset.cohortBenchmarks?.[
          `${normalized(row['Genre'])}|${row['PPV Max Hour']}`
        ]
      : dataset.benchmarks?.[benchmarkGenreKey(row['Genre'])];
    if (!benchmarkRow) return null;

    const benchmarkByHour = new Map(
      retentionFieldEntries(benchmarkRow).map(point => [point.hour, point.value])
    );

    return points.find(point => {
      const benchmark = benchmarkByHour.get(point.hour);
      return Number.isFinite(benchmark) && point.value < benchmark;
    });
  };

  const belowBenchmarkText = (row, points) => {
    const firstPoint = firstBelowBenchmark(row, points);
    return firstPoint
      ? `H${firstPoint.hour} (${firstPoint.value.toFixed(1)}% vs benchmark)`
      : 'not reached in available hours';
  };

  analysis.textContent = [
    `${rowOne['Show Title'] || showIdOne} averages ${averageOne === null ? '-' : `${averageOne.toFixed(1)}%`} versus ${rowTwo['Show Title'] || showIdTwo} at ${averageTwo === null ? '-' : `${averageTwo.toFixed(1)}%`} (${differenceText}).`,
    `First below benchmark: ${rowOne['Show Title'] || showIdOne} at ${belowBenchmarkText(rowOne, pointsOne)}; ${rowTwo['Show Title'] || showIdTwo} at ${belowBenchmarkText(rowTwo, pointsTwo)}.`
  ].join('\n');

  const hours = [...new Set([
    ...pointsOne.map(point => point.hour),
    ...pointsTwo.map(point => point.hour)
  ])].sort((a, b) => a - b);

  state.comparerChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: hours.map(hour => `H${hour}`),
      datasets: [
        {
          label: rowOne['Show Title'] || showIdOne,
          data: hours.map(hour => pointMapOne.get(hour) ?? null),
          borderColor: '#ff5964',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          spanGaps: true,
          tension: .25
        },
        {
          label: rowTwo['Show Title'] || showIdTwo,
          data: hours.map(hour => pointMapTwo.get(hour) ?? null),
          borderColor: '#55c5d6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          spanGaps: true,
          tension: .25
        }
      ]
    },
    options: comparisonChartOptions()
  });
}

function reportRowByInput(value) {
  const target = normalized(value);
  const reportRows = state.reportRows.length ? state.reportRows : state.allRows;
  return reportRows.find(row =>
    normalized(row.show_id || row['Show ID']) === target ||
    normalized(row.show_title || row['Show Title']) === target
  );
}

function reportValue(row, field) {
  return displayMetricValue(row[field]);
}

function reportTitle(row) {
  return row.show_title || row['Show Title'] || row.book_title || row['Show Title'] || 'Show';
}

function reportId(row) {
  return row.show_id || row['Show ID'] || '-';
}

function reportRetentionFindings(row) {
  const stagePairs = [
    ['p1s1', 'P1 S1'], ['p1s2', 'P1 S2'],
    ['p2s1', 'P2 S1'], ['p2s2', 'P2 S2'],
    ['p3s1', 'P3 S1'], ['p3s2', 'P3 S2']
  ];
  const comparisons = stagePairs
    .map(([key, label]) => {
      const actual = Number.parseFloat(row[`${key}_retention_rate`]);
      const benchmark = Number.parseFloat(row[`${key}_benchmark_retention_rate`]);
      if (!Number.isFinite(actual)) return null;
      if (!Number.isFinite(benchmark)) return `${label}: retention ${actual}% with no benchmark.`;
      const gap = actual - benchmark;
      return `${label}: ${actual}% vs ${benchmark}% benchmark (${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pts).`;
    })
    .filter(Boolean);

  return comparisons.length
    ? comparisons
    : ['No stage retention findings are available.'];
}

function reportFindings(row) {
  const sourceFields = Object.keys(row);
  const has = field => sourceFields.includes(field);
  const findings = [];

  if (has('stage_label_numbered') || has('sub_stage_label_numbered') || has('current_testing_state')) {
    findings.push(
      `Current position: ${reportValue(row, 'stage_label_numbered')} / ${reportValue(row, 'sub_stage_label_numbered')} with testing state ${reportValue(row, 'current_testing_state')}.`
    );
  }

  const audienceFields = ['active_days_l30_distinct', 'published_word_count_l30', 'show_live_length'];
  if (audienceFields.some(has)) {
    findings.push(
      `Audience: ${reportValue(row, 'active_days_l30_distinct')} active days in L30, ${reportValue(row, 'published_word_count_l30')} words published in L30, and ${reportValue(row, 'show_live_length')} live length.`
    );
  }

  findings.push(...reportRetentionFindings(row));

  const funnelFields = ['P1 Entered', 'P1 Pass', 'P2 Entered', 'P2 Pass', 'P3 Entered', 'P3 Pass'].filter(has);
  if (funnelFields.length) {
    findings.push(`Funnel: ${funnelFields.map(field => `${field} ${reportValue(row, field)}`).join(', ')}.`);
  }

  const blankCount = sourceFields.filter(field => !String(row[field] ?? '').trim()).length;
  findings.push(`Data quality: ${blankCount} of ${sourceFields.length} source fields are blank.`);
  return findings;
}

function reportFieldGroups(row) {
  const fields = Object.keys(row);
  const assigned = new Set();
  const groups = [];
  const addGroup = (title, keys) => {
    const available = keys.filter(key => fields.includes(key));
    available.forEach(key => assigned.add(key));
    if (available.length) groups.push({
      title,
      fields: available.map(field => [
        field,
        field.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
      ])
    });
  };

  addGroup('Show and contract overview', [
    'show_id', 'show_title', 'book_id', 'book_title', 'show_cohort',
    'editor', 'senior_editor', 'channel_type', 'book_genre'
  ]);
  addGroup('Status and stage', [
    'stage_label_numbered', 'sub_stage_label_numbered', 'current_testing_state',
    'current_age_bucket', 'book_status', 'show_status', 'contract_status',
    'wbp_status', 'wbp_sub_status', 'incentive_flag', 'ppv_tag'
  ]);
  addGroup('Publishing and audience', [
    'published_word_count', 'published_word_count_l30', 'show_live_length',
    'l7d_active_days', 'active_days_l30_distinct', 'author_other_book_l30d_active_days',
    'date_10k', 'date_crossed_50k', 'date_crossed_100k', 'date_crossed_200k',
    'date_crossed_300k', 'date_crossed_400k', 'date_crossed_h1', 'date_crossed_h2',
    'date_crossed_h5', 'date_crossed_h10', 'date_crossed_h20', 'date_crossed_h30',
    'date_crossed_h40'
  ]);
  addGroup('Editorial and quality', [
    'moderation_status', 'moderation_evaluation_date', 'editor_score',
    'llm_result', 'llm_score', 'compact_llm_geo', 'recent_bad_time'
  ]);
  addGroup('Retention and testing stages', fields.filter(field =>
    /^(p1s1|p1s2|p2s1|p2s2|p3s1|p3s2)_/.test(field)
  ));
  addGroup('Funnel and milestones', [
    'Number of books', 'Book rank', 'Auth geography', 'Author book rank (>5k words)',
    'Stage Funnel Stage', 'Stage Funnel Bucket', 'Stage Funnel Sub-Bucket',
    'P1 Entered', 'P1 Pass', 'P2 Entered', 'P2 Pass', 'P3 Entered', 'P3 Pass',
    'H5 BM Met', 'H10 BM Met', 'H20 BM Met', 'H30 BM Met', 'H40 BM Met'
  ]);

  const remaining = fields.filter(field => !assigned.has(field));
  if (remaining.length) addGroup('Other source data', remaining);
  return groups;
}

function reportGroupMarkup(groups, row) {
  return groups.map(group => `
    <div class="report-subheading">${escapeHTML(group.title)}</div>
    <div class="report-grid report-overview-grid">
      ${group.fields.map(([field, label]) => `
        <div class="report-item">
          <span>${escapeHTML(label)}</span>
          <strong>${escapeHTML(reportValue(row, field))}</strong>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function retentionReportFinding(label, points, benchmarkRow) {
  if (!points.length) return `${label}: no retention data available.`;

  const average = points.reduce((sum, point) => sum + point.value, 0) / points.length;
  if (!benchmarkRow) {
    return `${label}: average retention is ${average.toFixed(1)}% across ${points.length} available points; no benchmark is available.`;
  }

  const benchmarkPoints = retentionFieldEntries(benchmarkRow);
  const benchmarkByHour = new Map(benchmarkPoints.map(point => [point.hour, point.value]));
  const comparable = points.filter(point => benchmarkByHour.has(point.hour));
  if (!comparable.length) {
    return `${label}: average retention is ${average.toFixed(1)}%; no matching benchmark points are available.`;
  }

  const benchmarkAverage = comparable.reduce(
    (sum, point) => sum + benchmarkByHour.get(point.hour),
    0
  ) / comparable.length;
  const gap = average - benchmarkAverage;
  const firstBelow = comparable.find(point => point.value < benchmarkByHour.get(point.hour));
  const position = gap >= 0 ? 'above' : 'below';

  return `${label}: average retention is ${average.toFixed(1)}%, ${Math.abs(gap).toFixed(1)} points ${position} benchmark. ${firstBelow ? `First below benchmark at H${firstBelow.hour}.` : 'No available point falls below benchmark.'}`;
}

function renderShowReport() {
  const input = $('reportShowId');
  const status = $('reportStatus');
  const output = $('reportOutput');
  if (!input || !status || !output) return;

  const row = reportRowByInput(input.value);
  if (!row) {
    status.textContent = 'Enter a valid Show ID or show title.';
    output.classList.add('hidden');
    return;
  }

  const fieldGroups = reportFieldGroups(row);
  const findings = reportFindings(row);

  output.innerHTML = `
    <div class="report-header">
      <div>
        <p class="eyebrow">SHOW REPORT</p>
        <h3>${escapeHTML(reportTitle(row))}</h3>
        <span>${escapeHTML(reportId(row))}</span>
      </div>
      <span class="report-status-tag">${escapeHTML(reportValue(row, 'show_status'))}</span>
    </div>
    ${reportGroupMarkup(fieldGroups, row)}
    <div class="report-analysis">
      <span>Findings and analysis</span>
      <ul>${findings.map(finding => `<li>${escapeHTML(finding)}</li>`).join('')}</ul>
    </div>
    <div class="report-notes">
      <span>Retention and benchmark findings</span>
      ${reportRetentionFindings(row).map(finding => `<p>${escapeHTML(finding)}</p>`).join('')}
    </div>
  `;
  output.classList.remove('hidden');
  status.textContent = `Report generated for ${reportTitle(row)}.`;
}

function downloadShowReport() {
  const input = $('reportShowId');
  const row = reportRowByInput(input?.value || '');
  const PDF = window.jspdf?.jsPDF;

  if (!row) {
    window.alert('Enter a valid Show ID or show title.');
    return;
  }

  if (!PDF) {
    window.alert('PDF download is unavailable. Please reload the dashboard.');
    return;
  }

  const doc = new PDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  let y = 48;

  const ensureSpace = height => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (text, options = {}) => {
    const size = options.size || 9;
    const color = options.color || [55, 65, 81];
    const weight = options.weight || 'normal';
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || '-'), options.width || pageWidth - margin * 2);
    ensureSpace(lines.length * (size + 3) + (options.gap || 0));
    doc.text(lines, options.x || margin, y);
    y += lines.length * (size + 3) + (options.gap || 0);
  };

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 78, 'F');
  write('P3 & PPV Shows Slate', { size: 10, color: [85, 197, 214], weight: 'bold', gap: 5 });
  write(reportTitle(row), { size: 20, color: [255, 255, 255], weight: 'bold', gap: 3 });
  write(`${reportId(row)} · ${reportValue(row, 'show_status')}`, { size: 9, color: [190, 200, 215], gap: 15 });

  reportFieldGroups(row).forEach(group => {
    ensureSpace(36);
    write(group.title, { size: 11, color: [15, 105, 130], weight: 'bold', gap: 5 });
    group.fields.forEach(([field, label]) => {
      const value = reportValue(row, field);
      const text = `${label}: ${value}`;
      write(text, { size: 8.5, color: [55, 65, 81], gap: 2 });
    });
    y += 5;
  });

  ensureSpace(50);
  write('Findings and analysis', { size: 11, color: [15, 105, 130], weight: 'bold', gap: 5 });
  const findings = reportFindings(row);
  findings.forEach(finding => write(`• ${finding}`, { size: 8.5, gap: 3 }));

  const filename = `${reportTitle(row).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'show'}-report.pdf`;
  doc.save(filename);
}

function comparisonChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#b7c0ce',
          font: { size: 10 },
          boxWidth: 18,
          padding: 10
        }
      },
      tooltip: {
        callbacks: {
          label: context => ` ${context.parsed.y.toFixed(1)}%`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#8e98a9',
          maxTicksLimit: 20,
          maxRotation: 0
        },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        suggestedMax: 100,
        ticks: {
          color: '#8e98a9',
          callback: value => `${value}%`
        },
        grid: { color: '#293140' }
      }
    }
  };
}
