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
      <tr>
        ${state.operationalColumns
          .map(field => `<td class="${tableColumnClass(field)}">${operationalCell(field, row)}</td>`)
          .join('')}
        <td>
          <button class="details-button" data-row-index="${start + index}">
            View
          </button>
        </td>
      </tr>
    `)
    .join('');

  $('emptyState').classList.toggle(
    'hidden',
    pageRows.length > 0
  );

  document
    .querySelectorAll('[data-row-index]')
    .forEach(button => {
      button.addEventListener('click', () => {
        openDetails(
          rows[Number(button.dataset.rowIndex)]
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
      <th aria-label="Actions"></th>
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

  return escapeHTML(row[field] || '—');
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
    : '—';
}

function statusTag(value) {
  if (!value) return '—';

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
  if (!value) return '—';

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
      <div class="detail-value">
        ${escapeHTML(value)}
      </div>
    </div>
  `;
}

function openDetails(row) {
  $('detailsTitle').textContent =
    row['Show Title'] || 'Show details';

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
    <div class="details-identity">
      <div class="identity-main">
        <span class="detail-label">Show name</span>
        <strong>${escapeHTML(row['Show Title'] || 'Untitled')}</strong>
      </div>
      <div class="identity-id">
        <span class="detail-label">Show ID</span>
        <code>${escapeHTML(row['Show ID'] || '—')}</code>
      </div>
    </div>
    <div class="retention-action-card">
      <button id="showRetentionChart" class="button button-primary" type="button">
        Normalised retention
      </button>
    </div>
    <section id="retentionChartSection" class="retention-chart-section hidden">
      <div class="detail-section-heading">
        <span class="eyebrow">RETENTION PERFORMANCE</span>
        <strong>Normalised retention by hour</strong>
      </div>
      <div id="retentionControls" class="retention-controls"></div>
      <div class="retention-chart-wrap">
        <canvas id="retentionChart"></canvas>
      </div>
    </section>
    ${sections}
    ${remainingSection}
  `;

  $('detailsModal').classList.remove('hidden');

  $('showRetentionChart').addEventListener('click', () => {
    renderRetentionChart(row);
  });
}

function retentionFieldEntries(row) {
  return Object.keys(row)
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

function retentionControlMarkup() {
  return `
    <div class="retention-selector-grid">
      ${RETENTION_VIEW_SECTIONS.map(section => `
        <div class="retention-selector-section">
          <div class="retention-selector-title">${escapeHTML(section.label)}</div>
          <div class="retention-selector-table">
            <div class="retention-selector-row retention-selector-header">
              <span>Locale / Gender</span>
              <span>Overall</span>
              <span>Male</span>
              <span>Female</span>
            </div>
            ${section.rows.map(row => `
              <div class="retention-selector-row">
                <span class="retention-selector-locale">${escapeHTML(row.label)}</span>
                ${row.options.map(option => option.disabled
                  ? '<button class="retention-control-option" type="button" disabled>—</button>'
                  : `
                    <button
                      class="retention-control-option ${state.retentionView === option.sheet ? 'active' : ''}"
                      type="button"
                      data-retention-sheet="${escapeHTML(option.sheet)}"
                    >
                      ${escapeHTML(option.label)}
                    </button>
                  `
                ).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
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
        renderRetentionChart(showRow);
      });
    });
}

function renderRetentionChart(showRow) {
  const section = $('retentionChartSection');
  const canvas = $('retentionChart');

  if (!section || !canvas) return;

  const dataset = state.retentionDatasets[state.retentionView];
  const retentionRow = dataset?.rows.find(row =>
    row['Show ID'] === showRow['Show ID']
  );

  section.classList.remove('hidden');
  setupRetentionControls(showRow);

  if (!retentionRow) {
    if (state.retentionChart) {
      state.retentionChart.destroy();
      state.retentionChart = null;
    }
    section.classList.add('hidden');
    return;
  }

  const points = retentionFieldEntries(retentionRow);

  if (!points.length) {
    section.classList.add('hidden');
    return;
  }

  if (state.retentionChart) {
    state.retentionChart.destroy();
  }

  if (typeof Chart === 'undefined') {
    section.classList.add('hidden');
    return;
  }

  const genreKey = normalized(showRow['Genre']);
  const benchmarkRow = dataset.benchmarks[genreKey];
  const benchmarkPoints = benchmarkRow
    ? retentionFieldEntries(benchmarkRow)
    : [];
  const benchmarkByHour = new Map(
    benchmarkPoints.map(point => [point.hour, point.value])
  );

  const benchmarkLabel = showRow['Genre']
    ? `${showRow['Genre']} benchmark`
    : 'Genre benchmark';

  const datasets = [{
    label: 'Normalised retention',
    data: points.map(point => point.value),
    borderColor: '#ff5964',
    backgroundColor: 'rgba(255, 89, 100, .14)',
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

  state.retentionChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: points.map(point => `H${point.hour}`),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
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
    }
  });
}
