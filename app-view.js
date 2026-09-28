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

  return escapeHTML(row[field] || 'â€”');
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
    : 'â€”';
}

function statusTag(value) {
  if (!value) return 'â€”';

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
  if (!value) return 'â€”';

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

const RETENTION_VALUE_LABELS_PLUGIN = {
  id: 'retentionValueLabels',

  afterDatasetsDraw(chart) {
    const targetHours = new Set([5, 10, 30, 50, 100, 120, 150]);
    const labels = chart.data.labels || [];

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

        if (!hourMatch || !targetHours.has(Number(hourMatch[1])) || !Number.isFinite(value)) {
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
  return `
    <div class="retention-pill-layout">
      ${RETENTION_VIEW_SECTIONS.map(section => `
        <div class="retention-pill-section">
          <div class="retention-selector-title">${escapeHTML(section.label)}</div>
          <div class="retention-pill-selectors">
            <div class="retention-pill-selector">
              <span>Locale</span>
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
              <span>Gender overall</span>
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

  state.retentionChart = new Chart(canvas, {
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
        retentionValueLabels: {},
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
          label: `${section.label.replace(/^1 Version: /, '')} Â· ${row.label} Â· ${option.label}`
        }))
    )
  ).filter((option, index, options) =>
    options.findIndex(item => item.sheet === option.sheet) === index
  );
}

function setupComparer() {
  const typeSelect = $('compareRetentionType');
  const datalist = $('compareShowIds');

  if (!typeSelect || !datalist) return;

  typeSelect.innerHTML = allRetentionOptions()
    .map(option => `
      <option value="${escapeHTML(option.sheet)}">${escapeHTML(option.label)}</option>
    `)
    .join('');

  datalist.innerHTML = state.allRows
    .map(row => `<option value="${escapeHTML(row['Show ID'])}">${escapeHTML(row['Show Title'])}</option>`)
    .join('');
}

function compareRowById(dataset, showId) {
  const normalizedId = normalized(showId);

  return dataset?.rows.find(row =>
    normalized(row['Show ID']) === normalizedId
  );
}

function renderComparison() {
  const canvas = $('comparerChart');
  const status = $('comparerStatus');
  const typeSelect = $('compareRetentionType');

  if (!canvas || !status || !typeSelect) return;

  const showIdOne = $('compareShowIdOne').value.trim();
  const showIdTwo = $('compareShowIdTwo').value.trim();
  const dataset = state.retentionDatasets[typeSelect.value];
  const rowOne = compareRowById(dataset, showIdOne);
  const rowTwo = compareRowById(dataset, showIdTwo);

  if (!showIdOne || !showIdTwo) {
    status.textContent = 'Enter two Show IDs to compare.';
    return;
  }

  if (!dataset || !rowOne || !rowTwo) {
    status.textContent = 'One or both Show IDs were not found for this retention type.';
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
