/* Table rendering and show-details modal */

function render() {
  const rows = state.filteredRows;

  syncShowsView();

  if (state.showsView === 'retention') {
    renderTitleRetentionTable(rows);
    return;
  }

  $('operationalTableWrap')?.classList.toggle(
    'has-extra-columns',
    state.operationalColumns.some(column => !OPERATIONAL_VIEW_HEADERS.includes(column))
  );

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

function retentionTableOptions() {
  return allRetentionOptions().filter(option => option.sheet !== 'ppv benchmarks');
}

const RETENTION_HOUR_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50,
  60, 70, 80, 90, 100, 120, 140, 160, 180, 200
];

function setupTitleRetentionControls() {
  const select = $('titleRetentionType');
  if (!select) return;

  const options = retentionTableOptions();
  select.innerHTML = `<option value="" disabled>Select Retn. User Cohort</option>${options.map(option =>
    `<option value="${escapeHTML(option.sheet)}">${escapeHTML(option.label)}</option>`
  ).join('')}`;
  select.value = options.some(option => option.sheet === state.titleRetentionType)
    ? state.titleRetentionType
    : '';
  state.titleRetentionType = select.value;
  select.addEventListener('change', event => {
    state.titleRetentionType = event.target.value;
    state.page = 1;
    render();
  });
}

function syncShowsView() {
  document.querySelectorAll('[data-shows-view]').forEach(button => {
    const active = button.dataset.showsView === state.showsView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelector('.shows-data-tools')?.classList.toggle('hidden', state.showsView !== 'data');
  document.querySelector('.shows-retention-tools')?.classList.toggle('hidden', state.showsView !== 'retention');
  if ($('retentionPageSize')) $('retentionPageSize').value = String(state.pageSize);
  $('operationalTableWrap')?.classList.toggle('title-retention-view', state.showsView === 'retention');
}

function renderTitleRetentionTable(rows) {
  const dataset = retentionDatasetForView(state.titleRetentionType);
  const retentionRows = new Map((dataset?.rows || []).map(row => [normalized(row['Show ID']), row]));
  const availableRows = rows.map(row => ({ show: row, retention: retentionRows.get(normalized(row['Show ID'])) }));
  const pages = Math.max(1, Math.ceil(availableRows.length / state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.pageSize;
  const pageRows = availableRows.slice(start, start + state.pageSize);
  const hours = retentionFieldEntries(dataset?.rows?.find(row => retentionRows.has(normalized(row['Show ID'])))).map(point => point.hour);
  const selectedFields = hours.map(hour => `H${hour} Ret% Nth TD`);
  const retentionRatioClass = (show, retention, field) => {
    const actual = Number.parseFloat(String(retention?.[field] ?? '').replace('%', '').trim());
    const benchmark = dataset?.benchmarks?.[benchmarkGenreKey(show['Genre'])];
    const benchmarkValue = Number.parseFloat(String(benchmark?.[field] ?? '').replace('%', '').trim());
    if (!Number.isFinite(actual) || !Number.isFinite(benchmarkValue) || benchmarkValue === 0) return '';
    const ratio = actual / benchmarkValue;
    if (ratio >= 0.7) return 'tag-green';
    if (ratio >= 0.5) return 'tag-yellow';
    return 'tag-red';
  };

  $('operationalTableHead').innerHTML = `<tr><th class="column-show-title">Show</th>${selectedFields.map(field => `<th title="${escapeHTML(field)}">H${field.match(/^H(\d+)/i)?.[1]}</th>`).join('')}</tr>`;
  $('showTableBody').innerHTML = pageRows.map(({ show, retention }) => `
    <tr class="show-row" data-row-index="${rows.indexOf(show)}">
      <td class="column-show-title"><div class="show-name">${escapeHTML(show['Show Title'] || 'Untitled')}</div><div class="show-id">${escapeHTML(show['Show ID'])}</div></td>
      ${selectedFields.map(field => `<td><span class="tag ${retentionRatioClass(show, retention, field)}">${formatRetentionTableValue(retention?.[field])}</span></td>`).join('')}
    </tr>
  `).join('');

  $('resultCount').textContent = `${rows.length.toLocaleString()} result${rows.length === 1 ? '' : 's'}`;
  $('retentionResultCount').textContent = `${rows.length.toLocaleString()} result${rows.length === 1 ? '' : 's'}`;
  $('pageInfo').textContent = `Page ${state.page} of ${pages}`;
  $('previousPage').disabled = state.page <= 1;
  $('nextPage').disabled = state.page >= pages;
  $('emptyState').classList.toggle('hidden', pageRows.length > 0);
  document.querySelectorAll('#showTableBody tr[data-row-index]').forEach(rowElement => {
    rowElement.addEventListener('click', () => openDetails(rows[Number(rowElement.dataset.rowIndex)]));
  });
}

function formatRetentionTableValue(value) {
  const numeric = Number.parseFloat(String(value ?? '').replace('%', '').trim());
  return Number.isFinite(numeric) ? `${(numeric <= 1 ? numeric * 100 : numeric).toFixed(1)}%` : '-';
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
    Label: 'Label',
    'PPV Tag': 'PPV tag',
    'Active/Inactive': 'Status',
    'Activity Days (L30D)': 'L30 Actv',
    'Show Length': 'Length',
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

  if (field === 'Label') {
    const label = state.showLabels[showLabelKey(row['Show Title'])];
    return label
      ? `<span class="show-label-dot show-label-${normalized(label)}" title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}"></span>`
      : '-';
  }

  if (LINK_FIELDS.has(field)) {
    return renderLinkValue(row[field], 'Open link', field);
  }

  if (field === 'PPV Tag') return tag(row[field]);
  if (field === 'Active/Inactive') return statusTag(row[field]);
  return escapeHTML(row[field] || '-');
}

function setupOperationalColumns() {
  const container = $('operationalColumnSelector');
  if (!container) return;

  container.innerHTML = OPERATIONAL_COLUMN_OPTIONS.map(field => `
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

const DETAIL_GROUPS = [
  {
    title: 'Show Level Information',
    fields: [
      'Show Genre',
      'Show Length',
      'PPV Status',
      'WBP Sub Status',
      'Is Top Author Show?',
      'Contract (WBP, FTC)',
      'Incentive Flag Book',
      'Completion Status',
      'Active / Inactive',
      'Activity Days (L30D)',
      'Throughput (L30D)',
      'Published Word Count'
    ]
  },
  {
    title: 'Editorial Tagging & Information',
    fields: [
      'Editor',
      'CL',
      'SCL',
      'Dumper vs Original',
      'Editorial Slate',
      'Action',
      'Remarks',
      'Ep Range Reference',
      'Plagiarism Status'
    ]
  },
  {
    title: 'Editorial Corner | Actionables',
    fields: [
      'Overall Editorial Conviction',
      'Story Subjective Conviction',
      'Author Level Conviction',
      'Editor - Writer Communication Status',
      'Edits Required?',
      'Episodes Currently Being Edited (23-45)',
      'Episode Edit Hour Range (HX0)',
      'Episode Range Currently Being Edited (Start)',
      'Episode Range Currently Being Edited (End)',
      'Current Editing Status',
      "Author's Editorial Stance",
      'Edits Receivable ETA (dd/mm/yy)',
      'Most Recent Interaction Date(dd/mm/yy)',
      'Meeting Remarks',
      'Next Meeting Date(dd/mm/yyyy)',
      'Other Comments (If Any)'
    ]
  },
  {
    title: 'Editorial Documents',
    fields: [
      'Show Documents',
      'Author Folders',
      'Meeting Notes Document',
      'Story Snapshot Document',
      'Plag Report Link',
      'Episodic Retention (ECR) Sheet',
      'Comment Analysis (CA) Sheet',
      'Editorial Report Document',
      'Rewrites Received Folder'
    ]
  },
  {
    title: 'Author Information',
    fields: [
      'Author ID',
      'Author Name',
      'Author Locale',
      'Author Contact',
      'Author Email',
      'Preferred Communication Medium',
      'Discord Channel Link (Show Level)',
      'Registration on Pocket (dd/mm/yy)',
      'Listener Tag',
      'No. of shows on Pocket (>10K WC)',
      'No. of contracted shows on Pocket',
      'Number of other shows in P3/PPV',
      'Total Throughput (L30D)',
      'Date Updated'
    ]
  }
];

const DETAIL_FIELD_LABELS = {
  'Subjective Conviction': 'Story Subjective Conviction'
};

function detailCard(header, value) {
  const safeValue = String(value ?? '');
  const label = DETAIL_FIELD_LABELS[header] || header;
  const full =
    safeValue.length > 100 ||
    header.includes('Comments') ||
    header.includes('Synopsis') ||
    header.includes('conversation') ||
    header.includes('documents') ||
    header.includes('Changes') ||
    header.includes('Risk');

  return `
    <div class="detail-card ${full ? 'full' : ''}">
      <span class="detail-label">
        ${escapeHTML(label)}
      </span>
        <div class="detail-value">${renderLinkValue(safeValue, 'Open link', header)}</div>
    </div>
  `;
}

function renderLinkValue(value, linkLabel = 'Open link', header = '') {
  const cleaned = cleanDetailValue(value);
  if (!cleaned) return '—';

  const linkField = LINK_FIELDS.has(header);

  if (!linkField) return escapeHTML(cleaned);

  return cleaned
    .split(/(https?:\/\/[^\s]+)/g)
    .map(part => {
      if (!/^https?:\/\//i.test(part)) return escapeHTML(part);
      return `<a class="detail-link" href="${escapeHTML(part)}" target="_blank" rel="noopener noreferrer">${escapeHTML(linkLabel)}</a>`;
    })
    .join('')
    .replace(/\n/g, '<br>');
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
  const showId = String(row['Show ID'] || '').trim();
  const rawGenre = String(row['Genre'] || '').trim();
  const genreLabel = rawGenre
    ? `${rawGenre.charAt(0).toUpperCase()}${rawGenre.slice(1).toLowerCase()}`
    : '';
  const lockPoint = state.lockPointRows.find(item => String(item.show_id || '').trim() === showId);
  $('detailsShowId').textContent = showId || '-';
  const genreElement = $('detailsGenre');
  if (genreElement) genreElement.textContent = genreLabel || '-';
  const lockPointText = lockPoint
    ? `Ep: ${lockPoint.lock_point_episode} | Hr: ${lockPoint.lock_point_start_hour}`
    : 'Ep: No Data Found | Hr: No Data Found';
  const lockPointElement = $('detailsLockPoint');
  if (lockPointElement) {
    lockPointElement.innerHTML = `<span class="details-lock-point-label">Lock Point</span><span class="details-lock-point-value">${escapeHTML(lockPointText)}</span>`;
  }

  const detailFields = new Set(
    DETAIL_HEADERS.filter(
      header =>
        header !== 'Show ID' &&
        header !== 'Show Title'
    )
  );

  DETAIL_GROUPS.flatMap(section => section.fields)
    .filter(field => DETAIL_HEADERS.includes(field))
    .forEach(field => {
      detailFields.add(field);
    });

  const sections = DETAIL_GROUPS
    .map(section => {
      const isLinksSection = section.title === 'Editorial Documents';
      const fields = section.fields.filter(field => detailFields.has(field));

      fields.forEach(field => detailFields.delete(field));

      if (!fields.length) return '';

      return `
        <section class="detail-section ${[
          'Show Level Information',
          'Editorial Tagging & Information',
          'Editorial Corner | Actionables',
          'Editorial Documents',
          'Author Information'
        ].includes(section.title) ? 'detail-four-column' : ''}">
          <div class="detail-section-heading">
            <span class="eyebrow">${escapeHTML(section.title)}</span>
          </div>
          <div class="detail-grid ${isLinksSection ? 'detail-links-grid' : ''}">
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

  const remainingFields = [...detailFields].filter(field =>
    Object.prototype.hasOwnProperty.call(row, field)
  );

  const remainingSection = '';

  $('detailsContent').innerHTML = `
    <section id="retentionChartGrid" class="retention-chart-grid">
      <article id="retentionChartSection" class="retention-chart-section hidden">
        <div class="detail-section-heading">
          <strong>Normalised Live Ret. - H1 Base <span id="normalisedBenchmarkSuffix" class="benchmark-heading-suffix"></span></strong>
          <span class="retention-chart-note">Retn. Refreshed 12/10/26</span>
        </div>
        <div id="retentionControls" class="retention-controls"></div>
        <div class="retention-meta-row">
          <p id="retentionMeta" class="retention-meta"></p>
          <div id="retentionRangeControls" class="retention-range-controls"></div>
        </div>
        <div class="retention-chart-wrap">
          <canvas id="retentionChart"></canvas>
        </div>
      </article>
      <article id="ppvRetentionChartSection" class="retention-chart-section hidden">
        <div class="detail-section-heading">
          <strong>PPV Benchmarks - H10 Base <span id="ppvBenchmarkSuffix" class="benchmark-heading-suffix"></span></strong>
          <span class="retention-chart-note">Retn. Refreshed 12/10/26</span>
        </div>
        <div id="ppvRetentionControls" class="retention-controls"></div>
        <p id="ppvRetentionMeta" class="retention-meta"></p>
        <div class="retention-chart-wrap">
          <canvas id="ppvRetentionChart"></canvas>
        </div>
        <div id="ppvRetentionTable" class="hidden"></div>
      </article>
      <article id="derivativeSection" class="retention-chart-section hidden">
        <div class="detail-section-heading">
          <strong>Whale+ Overall Derivative</strong>
          <span class="retention-chart-note">Retn. Refreshed 12/10/26</span>
        </div>
        <div id="derivativeTable"></div>
      </article>
      <article id="elasticitySection" class="retention-chart-section hidden">
        <div class="detail-section-heading">
          <div class="elasticity-heading-main">
            <strong>Elasticity</strong>
            <div class="elasticity-legend" aria-label="Elasticity color legend">
              <span><i class="comparer-legend-dot comparer-legend-green"></i>Within 10 pts</span>
              <span><i class="comparer-legend-dot comparer-legend-yellow"></i>10–20 pts</span>
              <span><i class="comparer-legend-dot comparer-legend-red"></i>&gt;20 pts</span>
            </div>
          </div>
          <div class="elasticity-threshold-tools">
            <span class="retention-chart-note">Retn. Refreshed 12/10/26</span>
            <div class="elasticity-threshold-controls" aria-label="Configure elasticity colors">
              <label>Green ≤ <input type="number" min="0" max="100" step="5" data-elasticity-threshold="green" value="${state.elasticityThresholds.green}" /></label>
              <label>Yellow ≤ <input type="number" min="0" max="100" step="5" data-elasticity-threshold="yellow" value="${state.elasticityThresholds.yellow}" /></label>
              <label>Red &gt; <output>${state.elasticityThresholds.yellow}</output></label>
            </div>
          </div>
        </div>
        <div id="elasticityTable"></div>
      </article>
    </section>
    ${sections}
    ${remainingSection}
  `;

  $('detailsModal').classList.remove('hidden');
  state.retentionView = 'Whale+ US';
  state.retentionCardView = 'combined';
  state.ppvMaxHour = null;
  state.ppvView = 'xyz';
  setupRetentionControls(row);
  setupPPVControls(row);
  renderRetentionCharts(row);
  setupRetentionCardViewControls(row);
}

function setupRetentionCardViewControls(showRow) {
  const container = $('retentionCardViewControls');
  if (!container) return;

  const options = [
    ['combined', 'Overview'],
    ['normalised', 'H1 Base'],
    ['ppv', 'H10 Base'],
    ['derivative', 'Derivative'],
    ['elasticity', 'Elasticity']
  ];
  container.innerHTML = `
    <div class="retention-card-view-selector">
      <span>View</span>
      <div class="retention-pill-group">
        ${options.map(([value, label]) => `
          <button class="retention-control-option ${state.retentionCardView === value ? 'active' : ''}" type="button" data-retention-card-view="${value}">${label}</button>
        `).join('')}
      </div>
    </div>
  `;

  const applyView = view => {
    $('retentionChartGrid')?.classList.toggle('single-retention-view', view !== 'combined');
    $('retentionChartGrid')?.classList.toggle('ppv-retention-view', view === 'ppv');
    $('retentionChartGrid')?.classList.toggle('overview-retention-view', view === 'combined');
    $('retentionChartSection')?.classList.toggle('hidden', view === 'ppv' || view === 'derivative' || view === 'elasticity');
    $('ppvRetentionChartSection')?.classList.toggle('hidden', view === 'normalised' || view === 'derivative' || view === 'elasticity');
    $('derivativeSection')?.classList.toggle('hidden', view !== 'derivative');
    $('elasticitySection')?.classList.toggle('hidden', view !== 'elasticity');
    document.querySelector('.normalised-data-updated')?.classList.toggle('hidden', view !== 'normalised');

    const ppvTable = $('ppvRetentionTable');
    const ppvChartWrap = $('ppvRetentionChart')?.parentElement;
    if (view === 'ppv') {
      ppvTable?.classList.toggle('hidden', state.ppvView !== 'xyz');
      ppvChartWrap?.classList.toggle('hidden', state.ppvView === 'xyz');
    }
  };

  applyView(state.retentionCardView);
  container.querySelectorAll('[data-retention-card-view]').forEach(button => {
    button.addEventListener('click', () => {
      state.retentionCardView = button.dataset.retentionCardView;
      if (showRow) renderPPVView(showRow);
      if (showRow && state.retentionCardView === 'derivative') renderDerivativeView(showRow);
      if (showRow && state.retentionCardView === 'elasticity') setupElasticityView(showRow);
      setupRetentionCardViewControls(showRow);
    });
  });
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
    const labels = chart.data.labels || [];
    const labelOptions = chart.options.plugins.retentionValueLabels || {};
    if (labelOptions.disabled) return;
    const targetHours = new Set(labelOptions.targetHours || [5, 10, 50, 100]);
    const isPPVBenchmark = Boolean(labelOptions.isPPVBenchmark);
    const firstBelowBenchmark = labelOptions.firstBelowBenchmark;
    const firstBelowIndex = firstBelowBenchmark
      ? chart.data.datasets[0]?.data.findIndex((value, index) => {
          const benchmark = chart.data.datasets[1]?.data[index];
          const actualValue = Number(value?.y ?? value);
          const benchmarkValue = Number(benchmark?.y ?? benchmark);
          return Number.isFinite(actualValue) &&
            Number.isFinite(benchmarkValue) &&
            actualValue < benchmarkValue;
        })
      : -1;

    const context = chart.ctx;
    const chartArea = chart.chartArea;
    const boxHeight = 15;
    const boxGap = 2;
    const laneHeight = boxHeight + boxGap;
    const boxPadding = 4;

    if (!chartArea) return;

    context.save();
    const placedBoxes = [];

    chart.data.datasets.slice(0, 2).forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!dataset || !meta) return;

      meta.data.forEach((point, index) => {
        const hourMatch = String(labels[index]).match(/^H(\d+)$/);
        const value = Number(dataset.data[index]?.y ?? dataset.data[index]);

        const shouldLabel = firstBelowBenchmark
          ? index === firstBelowIndex
          : hourMatch && targetHours.has(Number(hourMatch[1]));

        const pointInView = point.x >= chartArea.left && point.x <= chartArea.right;
        if (!shouldLabel || !pointInView || !Number.isFinite(value) || Math.abs(value) < 0.05) {
          return;
        }

        context.fillStyle = datasetIndex === 0
          ? '#b8f5c8'
          : '#f2f5f8';

        const valueLabel = datasetIndex === 0
          ? `Actual - ${value.toFixed(1)}%`
          : `BM - ${value.toFixed(1)}%`;

        context.font = '600 8px Inter, sans-serif';
        const boxWidth = context.measureText(valueLabel).width + boxPadding * 2;
        const boxX = Math.max(
          chartArea.left,
          Math.min(point.x - boxWidth / 2, chartArea.right - boxWidth)
        );
        const clampY = value => Math.max(
          chartArea.top + 2,
          Math.min(value, chartArea.bottom - boxHeight - 2)
        );
        // Keep actual callouts above benchmark callouts at every shared hour.
        // The collision fallback still moves boxes when the chart edge or a
        // neighbouring label leaves no room in the preferred lane.
        const preferredAbove = datasetIndex === 0;
        const candidateYs = preferredAbove
          ? [point.y - boxHeight - 7, point.y + 7]
          : [point.y + 7, point.y - boxHeight - 7];
        let boxY = clampY(candidateYs[0]);
        let candidateIndex = 0;
        while (candidateIndex < 12 && placedBoxes.some(box =>
          boxX < box.right + 5 && boxX + boxWidth > box.left - 5 &&
          boxY < box.bottom + 3 && boxY + boxHeight > box.top - 3
        )) {
          candidateIndex += 1;
          const direction = candidateIndex % 2 ? 1 : -1;
          const step = Math.ceil(candidateIndex / 2) * (boxHeight + 2);
          boxY = clampY(candidateYs[0] + direction * step);
        }
        if (datasetIndex === 1) {
          const actualBoxesAtHour = placedBoxes.filter(box =>
            box.datasetIndex === 0 &&
            boxX < box.right + 5 && boxX + boxWidth > box.left - 5
          );
          if (actualBoxesAtHour.length) {
            boxY = Math.max(boxY, ...actualBoxesAtHour.map(box => box.bottom + 3));
          }
        }
        placedBoxes.push({
          datasetIndex,
          left: boxX,
          right: boxX + boxWidth,
          top: boxY,
          bottom: boxY + boxHeight
        });
        const connectorX = Math.max(boxX + 8, Math.min(point.x, boxX + boxWidth - 8));
        const connectorY = boxY > point.y ? boxY : boxY + boxHeight;
        const borderColor = datasetIndex === 0
          ? '#8ee6a8'
          : '#f2f5f8';

        context.strokeStyle = borderColor;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(connectorX, connectorY);
        context.stroke();

        // Extend each callout down to the x-axis so its hour remains easy to
        // associate with the label, especially in the dense Overall view.
        context.save();
        context.globalAlpha = 0.24;
        context.setLineDash([2, 3]);
        context.beginPath();
        const guideX = isPPVBenchmark ? connectorX : point.x;
        context.moveTo(guideX, boxY > point.y ? boxY : boxY + boxHeight);
        context.lineTo(guideX, chartArea.bottom);
        context.stroke();
        context.restore();

        context.fillStyle = 'rgba(18, 26, 38, .96)';
        context.strokeStyle = borderColor;
        context.beginPath();
        context.roundRect(boxX, boxY, boxWidth, boxHeight, 3);
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
  const options = [
    {
      key: 'normalised',
      label: 'Normalised',
      overall: 'normalised overall',
      us: 'normalised US',
      usMale: 'normalised US male',
      usFemale: 'normalised US female',
      male: 'normalised male',
      female: 'normalised female'
    },
    {
      key: 'whale',
      label: 'Whale+',
      overall: 'Whale+ Overall',
      us: 'Whale+ US',
      usMale: 'Whale+ US male',
      usFemale: 'Whale+ US female',
      male: 'Whale+ Male',
      female: 'Whale+ Female'
    }
  ];
  const current = String(state.retentionView || '').toLowerCase();
  const source = options.find(option => current.startsWith(option.key)) || options[0];
  const geography = current.includes(' us') ? 'us' : 'overall';
  const gender = current.endsWith(' male') ? 'male' : current.endsWith(' female') ? 'female' : '';
  const button = (label, value, attribute, active, disabled = false) => `
    <button
      class="retention-control-option ${active ? 'active' : ''}"
      type="button"
      data-${attribute}="${escapeHTML(value)}"
      ${disabled ? 'disabled' : ''}
    >${escapeHTML(label)}</button>
  `;

  return `
    <div class="retention-pill-layout retention-normalised-controls">
      <div class="retention-pill-selector">
        <span>USER COHORT</span>
        <div class="retention-pill-group">
          ${options.map(option => button(option.label, option.key, 'retention-source', option.key === source.key)).join('')}
        </div>
      </div>
      <div class="retention-pill-selector">
        <span>Locale</span>
        <div class="retention-pill-group">
          ${button('Overall', 'overall', 'retention-geography', geography === 'overall')}
          ${button('US', 'us', 'retention-geography', geography === 'us')}
        </div>
      </div>
      <div class="retention-pill-selector">
        <span>Gender</span>
        <div class="retention-pill-group">
          ${button('Male', 'male', 'retention-gender', gender === 'male')}
          ${button('Female', 'female', 'retention-gender', gender === 'female')}
        </div>
      </div>
      <button class="retention-clear-button" type="button" data-retention-clear>Clear all</button>
    </div>
  `;
}

function setupRetentionControls(showRow) {
  const container = $('retentionControls');
  if (!container) return;

  container.innerHTML = retentionControlMarkup();
  const rangeContainer = $('retentionRangeControls');
  const retentionDataset = retentionDatasetForView(state.retentionView);
  const retentionRow = retentionDataset?.rows?.find(row =>
    normalized(row['Show ID']) === normalized(showRow['Show ID'])
  );
  const availableHours = retentionFieldEntries(retentionRow)
    .map(point => point.hour)
    .sort((a, b) => a - b);
  const hourOptions = RETENTION_HOUR_OPTIONS.filter(hour => availableHours.includes(hour));
  if (hourOptions.length < 2) hourOptions.push(...RETENTION_HOUR_OPTIONS.filter(hour => !hourOptions.includes(hour)).slice(0, 2 - hourOptions.length));
  const closestAvailableHour = value => hourOptions.reduce((closest, hour) =>
    Math.abs(hour - value) < Math.abs(closest - value) ? hour : closest
  );
  state.retentionChartXMin = closestAvailableHour(state.retentionChartXMin);
  state.retentionChartXMax = closestAvailableHour(state.retentionChartXMax);
  if (state.retentionChartXMin >= state.retentionChartXMax && hourOptions.length > 1) {
    state.retentionChartXMin = hourOptions[0];
    state.retentionChartXMax = hourOptions.at(-1);
  }
  if (rangeContainer) {
    const input = (axis, edge, min, max, value) => `
      <span class="comparer-axis-input">
        <input type="number" min="${min}" max="${max}" step="${axis === 'x' ? '1' : 'any'}" value="${value}" data-retention-axis="${axis}-${edge}" data-retention-options="${hourOptions.join(',')}" aria-label="${axis === 'x' ? 'Hour' : 'Retention percentage'} ${edge}" />
        <span class="comparer-axis-spinner" aria-hidden="true">
          <button type="button" tabindex="-1" data-retention-axis-step="${axis}-${edge}" data-direction="up" onclick="window.stepNormalizedHour('${axis}', '${edge}', 'up')">▲</button>
          <button type="button" tabindex="-1" data-retention-axis-step="${axis}-${edge}" data-direction="down" onpointerdown="window.stepNormalizedHour('${axis}', '${edge}', 'down'); event.preventDefault()" onclick="event.preventDefault()">▼</button>
        </span>
      </span>
    `;
    rangeContainer.innerHTML = `
      <div class="comparer-axis-range"><strong>Hour</strong>${input('x', 'min', hourOptions[0], hourOptions.at(-1), state.retentionChartXMin)}<span>To</span>${input('x', 'max', hourOptions[0], hourOptions.at(-1), state.retentionChartXMax)}</div>
    `;
  }

  const rerender = sheet => {
    state.retentionView = sheet;
    setupRetentionControls(showRow);
    renderRetentionChart(showRow, state.retentionView, 'retentionChart', 'retentionChartSection');
  };
  const current = String(state.retentionView || '').toLowerCase();
  const sourceFor = key => key === 'whale'
    ? { overall: 'Whale+ Overall', us: 'Whale+ US', usMale: 'Whale+ US male', usFemale: 'Whale+ US female', male: 'Whale+ Male', female: 'Whale+ Female' }
    : { overall: 'normalised overall', us: 'normalised US', usMale: 'normalised US male', usFemale: 'normalised US female', male: 'normalised male', female: 'normalised female' };
  const currentSource = current.startsWith('whale') ? 'whale' : 'normalised';
  const currentGeography = current.includes(' us') ? 'us' : 'overall';
  const currentGender = current.endsWith(' male') ? 'male' : current.endsWith(' female') ? 'female' : 'overall';
  const sourceKeyFor = (geography, gender, source = currentSource) => geography === 'us'
    ? gender === 'male' ? 'usMale' : gender === 'female' ? 'usFemale' : 'us'
    : gender;

  container.querySelectorAll('[data-retention-source]').forEach(button => {
    button.addEventListener('click', () => {
      const nextSource = button.dataset.retentionSource;
      const sheets = sourceFor(nextSource);
      rerender(sheets[sourceKeyFor(currentGeography, currentGender, nextSource)]);
    });
  });
  container.querySelectorAll('[data-retention-geography]').forEach(button => {
    button.addEventListener('click', () => {
      const nextGeography = button.dataset.retentionGeography;
      const sheets = sourceFor(currentSource);
      rerender(sheets[sourceKeyFor(nextGeography, currentGender)]);
    });
  });
  container.querySelectorAll('[data-retention-gender]').forEach(button => {
    button.addEventListener('click', () => {
      const sheets = sourceFor(currentSource);
      rerender(sheets[sourceKeyFor(currentGeography, button.dataset.retentionGender)]);
    });
  });
  const axisValues = () => hourOptions;
  const snapAxisValue = value => closestAvailableHour(value);
  rangeContainer?.querySelectorAll('[data-retention-axis]').forEach(input => {
    input.addEventListener('change', () => {
      const [axis, edge] = input.dataset.retentionAxis.split('-');
      const rawValue = Number(input.value);
      const value = snapAxisValue(rawValue);
      if (!Number.isFinite(value)) return;
      input.value = value;
      if (axis === 'x' && edge === 'min') state.retentionChartXMin = value;
      if (axis === 'x' && edge === 'max') state.retentionChartXMax = value;
      if (axis === 'x' && state.retentionChartXMin >= state.retentionChartXMax) {
        if (edge === 'min') {
          const next = hourOptions.find(hour => hour > value) || hourOptions.at(-1);
          state.retentionChartXMin = hourOptions.find(hour => hour < next) || hourOptions[0];
          state.retentionChartXMax = next;
        } else {
          const previous = [...hourOptions].reverse().find(hour => hour < value) || hourOptions[0];
          state.retentionChartXMin = previous;
          state.retentionChartXMax = hourOptions.find(hour => hour > previous) || hourOptions.at(-1);
        }
      }
      renderRetentionChart(showRow, state.retentionView, 'retentionChart', 'retentionChartSection');
      setupRetentionControls(showRow);
    });
  });
  container.querySelector('[data-retention-clear]')?.addEventListener('click', () => {
    state.retentionView = 'Whale+ US';
    state.retentionChartXMin = 1;
    state.retentionChartXMax = 50;
    setupRetentionControls(showRow);
    renderRetentionChart(showRow, state.retentionView, 'retentionChart', 'retentionChartSection');
  });
}

function setupPPVControls(showRow) {
  const container = $('ppvRetentionControls');
  const dataset = retentionDatasetForView('ppv benchmarks');
  const isPPVTabular = state.ppvView === 'xyz';

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
    const ldau = Number(cohortRow?.['H10 LDAU']);
    meta.innerHTML = cohortRow
      ? `H10 LDAU: ${Number.isFinite(ldau) ? ldau.toLocaleString() : '-'}<span class="retention-meta-updated">H1-H40 US+ROW1, H50-H100 US Only</span>`
      : 'No PPV benchmark data for this show.';
  }

  container.innerHTML = `
    <div class="retention-pill-layout ppv-controls-layout">
      <div class="retention-pill-selector">
        <span>View</span>
        <div class="retention-pill-group">
          ${['xyz', 'graph'].map(view => `
            <button
              class="retention-control-option ${state.ppvView === view ? 'active' : ''}"
              type="button"
              data-ppv-view="${view}"
            >
              ${view === 'graph' ? 'Graph' : 'Tab'}
            </button>
          `).join('')}
        </div>
      </div>
      ${!isPPVTabular ? `
        <div class="retention-pill-selector">
          <span>Max Hour Cohort</span>
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
      ` : ''}
    </div>
  `;

  container
    .querySelectorAll('[data-ppv-max-hour]')
    .forEach(button => {
      button.addEventListener('click', () => {
        state.ppvMaxHour = Number(button.dataset.ppvMaxHour);
        setupPPVControls(showRow);
        renderPPVView(showRow);
      });
    });

  container
    .querySelectorAll('[data-ppv-view]')
    .forEach(button => {
      button.addEventListener('click', () => {
        state.ppvView = button.dataset.ppvView;
        setupPPVControls(showRow);
        renderPPVView(showRow);
      });
    });
}

function renderRetentionCharts(showRow) {
  const normalisedView = state.retentionView === 'ppv benchmarks'
    ? 'normalised overall'
    : state.retentionView;

  renderRetentionChart(showRow, normalisedView, 'retentionChart', 'retentionChartSection');
  renderPPVView(showRow);
  renderDerivativeView(showRow);
  setupElasticityView(showRow);
}

function setupElasticityView(showRow) {
  const table = $('elasticityTable');
  if (!table) return;

  const showId = String(showRow?.['Show ID'] || '').trim();
  const rows = state.elasticityRows.filter(row => String(row['Show ID'] || '').trim() === showId);
  if (!rows.length) {
    table.innerHTML = '<p class="retention-meta">No elasticity data for this show.</p>';
    return;
  }
  const fields = Object.keys(rows[0]).filter(field => /^H\d+ Ret% Nth TD$/.test(field));
  const bucketOrder = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  const orderedRows = [...rows].sort((a, b) => {
    const rankA = bucketOrder[String(a['LDAU Rank Bucket'] || '').trim().charAt(0)] ?? 99;
    const rankB = bucketOrder[String(b['LDAU Rank Bucket'] || '').trim().charAt(0)] ?? 99;
    return rankA - rankB;
  });
  const columnStats = Object.fromEntries(fields.map(field => {
    const values = orderedRows
      .map(row => Number.parseFloat(String(row[field] || '').replace('%', '')))
      .filter(Number.isFinite);
    const zeroCount = values.filter(value => value === 0).length;
    return [field, {
      maximum: values.length ? Math.max(...values) : null,
      skipColor: orderedRows.length > 1 && zeroCount >= orderedRows.length - 1
    }];
  }));
  const elasticityClass = (field, value) => {
    const numeric = Number.parseFloat(String(value || '').replace('%', ''));
    const stats = columnStats[field];
    if (!Number.isFinite(numeric) || !stats || stats.skipColor || !Number.isFinite(stats.maximum)) return '';
    const delta = stats.maximum - numeric;
    if (delta <= state.elasticityThresholds.green) return 'elasticity-cell-green';
    if (delta <= state.elasticityThresholds.yellow) return 'elasticity-cell-yellow';
    return 'elasticity-cell-red';
  };
  const elasticByField = Object.fromEntries(fields.map(field => {
    const classes = orderedRows.map(row => elasticityClass(field, row[field]));
    const greenCount = classes.filter(className => className === 'elasticity-cell-green').length;
    const yellowCount = classes.filter(className => className === 'elasticity-cell-yellow').length;
    const onlyGreenAndYellow = classes.length > 0 && classes.every(className =>
      className === 'elasticity-cell-green' || className === 'elasticity-cell-yellow'
    );
    return [field, onlyGreenAndYellow
      ? greenCount > yellowCount ? 'Elastic' : 'Plastic'
      : 'Inelastic'];
  }));
  table.innerHTML = `
    <div class="elasticity-table-wrap">
      <table class="ppv-xyz-table elasticity-table">
        <thead><tr><th>LDAU Rank Bucket</th><th>LDAU</th>${fields.map(field => `<th>${escapeHTML(field.replace(' Ret% Nth TD', ''))}</th>`).join('')}</tr></thead>
        <tbody>
          ${orderedRows.map(row => `<tr><th>${escapeHTML(row['LDAU Rank Bucket'] || '–')}</th><td>${escapeHTML(row.LDAU || '–')}</td>${fields.map(field => `<td class="${elasticityClass(field, row[field])}">${escapeHTML(row[field] || '–')}</td>`).join('')}</tr>`).join('')}
          <tr class="elasticity-summary-row"><th colspan="2">Elasticity Summary</th>${fields.map(field => `<td>${elasticByField[field]}</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
  `;
  table.closest('#elasticitySection')?.querySelectorAll('[data-elasticity-threshold]').forEach(input => {
    input.addEventListener('change', event => {
      const key = event.target.dataset.elasticityThreshold;
      const value = Math.max(0, Math.min(100, Number.parseFloat(event.target.value)));
      if (!Number.isFinite(value)) return;
      state.elasticityThresholds[key] = value;
      if (state.elasticityThresholds.green > state.elasticityThresholds.yellow) {
        state.elasticityThresholds.green = state.elasticityThresholds.yellow;
      }
      setupElasticityView(showRow);
    });
  });
}

function renderDerivativeView(showRow) {
  const table = $('derivativeTable');
  if (!table) return;
  const heading = document.querySelector('#derivativeSection .detail-section-heading');
  if (heading) {
    heading.innerHTML = `
      <div class="derivative-heading-main">
        <strong>Whale+ Overall Derivative</strong>
        <div class="derivative-legend" aria-label="Derivative retention legend">
          <span><i class="comparer-legend-dot comparer-legend-green"></i>&gt; ${state.derivativeThresholds.green}%</span>
          <span><i class="comparer-legend-dot comparer-legend-yellow"></i>${state.derivativeThresholds.yellow}–${state.derivativeThresholds.green}%</span>
          <span><i class="comparer-legend-dot comparer-legend-red"></i>&lt; ${state.derivativeThresholds.yellow}%</span>
        </div>
      </div>
      <div class="derivative-threshold-tools">
        <span class="retention-chart-note">Retn. Refreshed 12/10/26</span>
        <div class="derivative-threshold-controls" aria-label="Configure derivative retention colors">
          <label>Green &gt; <input type="number" min="0" max="100" step="5" data-derivative-threshold="green" value="${state.derivativeThresholds.green}" /></label>
          <label>Yellow ≥ <input type="number" min="0" max="100" step="5" data-derivative-threshold="yellow" value="${state.derivativeThresholds.yellow}" /></label>
          <label>Red &lt; <output class="derivative-threshold-readonly">${state.derivativeThresholds.yellow}</output></label>
        </div>
      </div>
    `;
  }
  const row = state.derivativeRows.find(item =>
    String(item.show_id || '').trim() === String(showRow?.['Show ID'] || '').trim()
  );
  if (!row) {
    table.innerHTML = '<p class="retention-meta">No derivative data for this show.</p>';
    return;
  }
  const fields = Object.keys(row).filter(field => /^H\d+\/H\d+$/.test(field));
  const tableGroups = [fields.slice(0, 9), fields.slice(9)];
  const derivativeClass = value => {
    const numeric = Number.parseFloat(String(value ?? '').replace('%', ''));
    if (!Number.isFinite(numeric)) return '';
    if (numeric > state.derivativeThresholds.green) return 'derivative-ratio-green';
    if (numeric >= state.derivativeThresholds.yellow) return 'derivative-ratio-yellow';
    return 'derivative-ratio-red';
  };
  table.innerHTML = `
    ${tableGroups.map(group => `
      <div class="ppv-xyz-table-wrap derivative-table-wrap">
        <table class="ppv-xyz-table derivative-table">
          <thead><tr>${group.map(field => `<th>${escapeHTML(field)}</th>`).join('')}</tr></thead>
          <tbody><tr>${group.map(field => `<td class="${derivativeClass(row[field])}">${escapeHTML(row[field] || '–')}</td>`).join('')}</tr></tbody>
        </table>
      </div>
    `).join('')}
  `;
  heading?.querySelectorAll('[data-derivative-threshold]').forEach(input => {
    input.addEventListener('change', event => {
      const key = event.target.dataset.derivativeThreshold;
      const value = Math.max(0, Math.min(100, Number.parseFloat(event.target.value)));
      if (!Number.isFinite(value)) return;
      state.derivativeThresholds[key] = value;
      if (state.derivativeThresholds.green <= state.derivativeThresholds.yellow) {
        state.derivativeThresholds.green = Math.min(100, state.derivativeThresholds.yellow + 1);
      }
      renderDerivativeView(showRow);
    });
  });
}

function renderPPVView(showRow) {
  const section = $('ppvRetentionChartSection');
  const chartWrap = $('ppvRetentionChart')?.parentElement;
  const table = $('ppvRetentionTable');

  section?.classList.remove('hidden');
  updatePPVBenchmarkHeading(showRow);

  if (state.ppvView === 'xyz') {
    chartWrap?.classList.add('hidden');
    if (table) {
      table.classList.remove('hidden');
      table.innerHTML = renderPPVXYZTable(showRow);
      setupPPVTableTooltips(table);
      bindPPVThresholdControls(table, () => renderPPVView(showRow));
    }
    return;
  }

  chartWrap?.classList.remove('hidden');
  if (table) table.classList.add('hidden');
  renderRetentionChart(showRow, 'ppv benchmarks', 'ppvRetentionChart', 'ppvRetentionChartSection');
}

function updatePPVBenchmarkHeading(showRow) {
  const suffix = $('ppvBenchmarkSuffix');
  if (!suffix) return;

  const dataset = retentionDatasetForView('ppv benchmarks');
  const benchmarkRow = dataset?.cohortBenchmarks?.[
    `${benchmarkGenreKey(showRow['Genre'])}|${state.ppvMaxHour}`
  ];
  const benchmarkGenre = benchmarkRow?.Genre || showRow['Genre'] || 'Genre';
  const genreKey = benchmarkGenreKey(showRow['Genre']);
  const benchmarkCode = genreKey === 'romantasy'
    ? 'TAB'
    : genreKey === 'romance'
      ? 'DMB'
      : 'MVS';

  suffix.textContent = `(${benchmarkGenre} BM - ${benchmarkCode})`;
}

function ppvThresholdControlsMarkup(legendClass = 'comparer-table-legend') {
  return `
    <div class="ppv-legend-controls">
      <div class="${legendClass}" aria-label="Benchmark ratio legend">
        <span><i class="comparer-legend-dot comparer-legend-dark-green"></i>&gt; ${state.ppvThresholds.darkGreen.toFixed(1)}x</span>
        <span><i class="comparer-legend-dot comparer-legend-green"></i>${state.ppvThresholds.green.toFixed(1)}–${state.ppvThresholds.darkGreen.toFixed(1)}x</span>
        <span><i class="comparer-legend-dot comparer-legend-yellow"></i>${state.ppvThresholds.yellow.toFixed(1)}–${state.ppvThresholds.green.toFixed(1)}x</span>
        <span><i class="comparer-legend-dot comparer-legend-red"></i>&lt; ${state.ppvThresholds.red.toFixed(1)}x</span>
      </div>
      <div class="ppv-threshold-controls" aria-label="Configure benchmark ratio colors">
        <label>Dark green &gt; <input type="number" min="0" max="10" step="0.1" data-ppv-threshold="darkGreen" value="${state.ppvThresholds.darkGreen.toFixed(1)}" /></label>
        <label>Green ≥ <input type="number" min="0" max="10" step="0.1" data-ppv-threshold="green" value="${state.ppvThresholds.green.toFixed(1)}" /></label>
        <label>Yellow ≥ <input type="number" min="0" max="10" step="0.1" data-ppv-threshold="yellow" value="${state.ppvThresholds.yellow.toFixed(1)}" /></label>
        <label>Red &lt; <input type="number" min="0" max="10" step="0.1" data-ppv-threshold="red" value="${state.ppvThresholds.red.toFixed(1)}" /></label>
      </div>
    </div>
  `;
}

function bindPPVThresholdControls(container, rerender) {
  container.querySelectorAll('[data-ppv-threshold]').forEach(input => {
    input.addEventListener('change', event => {
      const key = event.target.dataset.ppvThreshold;
      const value = Number.parseFloat(event.target.value);
      if (!Number.isFinite(value)) return;
      const boundedValue = Math.max(0, Math.min(10, value));
      if (key === 'red' || key === 'yellow') {
        state.ppvThresholds.red = boundedValue;
        state.ppvThresholds.yellow = boundedValue;
      } else {
        state.ppvThresholds[key] = boundedValue;
      }
      if (state.ppvThresholds.green <= state.ppvThresholds.yellow) {
        state.ppvThresholds.green = Math.min(10, state.ppvThresholds.yellow + 0.1);
      }
      if (state.ppvThresholds.darkGreen <= state.ppvThresholds.green) {
        state.ppvThresholds.darkGreen = Math.min(10, state.ppvThresholds.green + 0.1);
      }
      rerender();
    });
  });
}

function renderPPVXYZTable(showRow) {
  const dataset = retentionDatasetForView('ppv benchmarks');
  const availableHours = dataset?.cohortHours?.filter(hour =>
    dataset.cohortRows?.[`${showRow['Show ID']}|${hour}`]
  ) || [];
  const retentionHours = dataset?.cohortHours || [];
  const retentionPercent = value => {
    const numeric = Number.parseFloat(String(value ?? '').replace('%', ''));
    if (!Number.isFinite(numeric)) return null;
    return numeric <= 1 ? numeric * 100 : numeric;
  };

  const comparisonClass = (actual, benchmark) => {
    if (!Number.isFinite(actual) || !Number.isFinite(benchmark) || benchmark === 0) {
      return '';
    }

    const ratio = actual / benchmark;
    if (ratio > state.ppvThresholds.darkGreen) return 'ppv-ratio-dark-green';
    if (ratio >= state.ppvThresholds.green) return 'ppv-ratio-green';
    if (ratio >= state.ppvThresholds.yellow) return 'ppv-ratio-yellow';
    return 'ppv-ratio-red';
  };

  const headerCells = retentionHours.map(hour =>
    `<th>H${hour} Ret</th>`
  ).join('');
  const rows = availableHours.map(hour => {
    const row = dataset.cohortRows[`${showRow['Show ID']}|${hour}`];
    const benchmarkRow = dataset?.cohortBenchmarks?.[
      `${benchmarkGenreKey(showRow['Genre'])}|${hour}`
    ];
    const values = retentionHours.map(retentionHour => {
      const value = row[`H${retentionHour} Ret% Nth TD`];
      const actual = retentionPercent(value);
      const benchmark = retentionPercent(
        benchmarkRow?.[`H${retentionHour} Ret% Nth TD`]
      );
      const ratio = Number.isFinite(actual) && Number.isFinite(benchmark) && benchmark !== 0
        ? actual / benchmark
        : null;
      const className = comparisonClass(actual, benchmark);
      const visibleDetails = state.retentionCardView === 'ppv';

      return Number.isFinite(actual)
        ? visibleDetails
          ? `<td class="${className} ppv-cell-visible-details">
              <span class="ppv-cell-actual">${actual.toFixed(2)}%</span>
              <span class="ppv-cell-meta">BM ${Number.isFinite(benchmark) ? `${benchmark.toFixed(2)}%` : '-'} · ${Number.isFinite(ratio) ? `${ratio.toFixed(2)}x` : 'n/a'}</span>
            </td>`
          : `<td class="${className} ppv-cell-tooltip" data-tooltip="${escapeHTML(
              `${actual.toFixed(1)}%\nBM ${Number.isFinite(benchmark) ? `${benchmark.toFixed(1)}%` : '-'}\n${Number.isFinite(ratio) ? `${ratio.toFixed(2)}x` : 'n/a'}`
            ).replace(/\n/g, '&#10;')}">${actual.toFixed(2)}%</td>`
        : '<td>-</td>';
    });

    return `
      <tr>
        <th>${hour}</th>
        <td>${escapeHTML(row['H10 LDAU'] || '-')}</td>
        ${values.join('')}
      </tr>
    `;
  }).join('');

  return `
    ${ppvThresholdControlsMarkup('comparer-table-legend ppv-table-legend')}
    <div class="ppv-xyz-table-wrap">
      <table class="ppv-xyz-table">
        <colgroup>
          <col class="ppv-xyz-hour-column" />
          <col class="ppv-xyz-ldau-column" />
          ${retentionHours.map(() => '<col class="ppv-xyz-retention-column" />').join('')}
        </colgroup>
        <thead>
          <tr>
            <th>Hour / Ret</th>
            <th>H10 LDAUs</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function setupPPVTableTooltips(table) {
  let tooltip = document.getElementById('ppvFloatingTooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'ppvFloatingTooltip';
    tooltip.className = 'ppv-floating-tooltip';
    document.body.appendChild(tooltip);
  }

  const hide = () => tooltip.classList.remove('visible');
  const show = cell => {
    tooltip.textContent = cell.dataset.tooltip || '';
    tooltip.classList.add('visible');

    const cellRect = cell.getBoundingClientRect();
    tooltip.style.left = `${cellRect.left + cellRect.width / 2}px`;
    tooltip.style.top = `${cellRect.top - 8}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';

    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.top < 8) {
      tooltip.style.top = `${cellRect.bottom + 8}px`;
      tooltip.style.transform = 'translate(-50%, 0)';
    }

    const updatedRect = tooltip.getBoundingClientRect();
    if (updatedRect.left < 8) {
      tooltip.style.left = `${8 + updatedRect.width / 2}px`;
    } else if (updatedRect.right > window.innerWidth - 8) {
      tooltip.style.left = `${window.innerWidth - 8 - updatedRect.width / 2}px`;
    }
  };

  table.querySelectorAll('.ppv-cell-tooltip, .comparison-cell-tooltip').forEach(cell => {
    cell.addEventListener('mouseenter', () => show(cell));
    cell.addEventListener('mouseleave', hide);
    cell.addEventListener('focus', () => show(cell));
    cell.addEventListener('blur', hide);
  });
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

  const chartWrap = canvas.parentElement;
  const status = $(canvasId === 'ppvRetentionChart' ? 'ppvRetentionMeta' : 'retentionMeta');
  const setChartState = (message) => {
    section.classList.remove('hidden');
    chartWrap?.classList.toggle('hidden', Boolean(message));
    if (status && message) status.textContent = message;
  };

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
    setChartState('No retention data is available for this show in the selected dataset.');
    return;
  }

  const points = retentionFieldEntries(retentionRow);

  if (!dataset.isPPVBenchmark) {
    const meta = $('retentionMeta');
    if (meta) {
      const ldau = Number(retentionRow.LDAU);
      const ldauLabel = `LDAU: ${Number.isFinite(ldau) ? ldau.toLocaleString() : '-'}`;
      meta.innerHTML = `${ldauLabel}<span class="retention-meta-updated">Unlock Hour Bucket H14 Onwards</span>`;
    }
  }

  if (!points.length) {
    setChartState('Retention data is available, but no hourly values were found.');
    return;
  }

  if (typeof Chart === 'undefined') {
    setChartState('Chart library is still loading. Refresh once to render this chart.');
    return;
  }

  setChartState('');

  const ppvCalloutHours = dataset.isPPVBenchmark
    ? points
        .map(point => point.hour)
        .filter(hour => hour > 20 && hour < Number(retentionRow['PPV Max Hour']))
    : undefined;

  const genreKey = benchmarkGenreKey(showRow['Genre']);
  const benchmarkRow = dataset.isPPVBenchmark
    ? dataset.cohortBenchmarks[
        `${genreKey}|${retentionRow['PPV Max Hour']}`
      ]
    : dataset.benchmarks[genreKey];
  const benchmarkPoints = benchmarkRow
    ? retentionFieldEntries(benchmarkRow)
    : [];
  const availableHours = new Set(points.map(point => point.hour));
  const visibleAvailableHours = [...availableHours]
    .filter(hour => hour >= state.retentionChartXMin && hour <= state.retentionChartXMax)
    .sort((a, b) => a - b);
  const isRetentionSeries = !dataset.isPPVBenchmark;
  const isCombinedNormalisedOverall = isRetentionSeries && state.retentionCardView === 'combined' && state.retentionChartXMin === 1 && state.retentionChartXMax === 200;
  const isH1BaseNormalisedOverall = isRetentionSeries && state.retentionCardView === 'normalised' && state.retentionChartXMin === 1 && state.retentionChartXMax === 200;
  const isH1BaseNormalisedH1H20 = isRetentionSeries && state.retentionCardView === 'normalised' && state.retentionChartXMin === 1 && state.retentionChartXMax === 20;
  const isH1BaseNormalisedH20H50 = isRetentionSeries && state.retentionCardView === 'normalised' && state.retentionChartXMin === 20 && state.retentionChartXMax === 50;
  const isH1BaseNormalisedH50H100 = isRetentionSeries && state.retentionCardView === 'normalised' && state.retentionChartXMin === 50 && state.retentionChartXMax === 100;
  const isH1BaseNormalisedH100H200 = isRetentionSeries && state.retentionCardView === 'normalised' && state.retentionChartXMin === 100 && state.retentionChartXMax === 200;
  const isCombinedNormalisedH1H20 = isRetentionSeries && state.retentionCardView === 'combined' && state.retentionChartXMin === 1 && state.retentionChartXMax === 20;
  const isCombinedNormalisedH20H50 = isRetentionSeries && state.retentionCardView === 'combined' && state.retentionChartXMin === 20 && state.retentionChartXMax === 50;
  const isCombinedNormalisedH50H100 = isRetentionSeries && state.retentionCardView === 'combined' && state.retentionChartXMin === 50 && state.retentionChartXMax === 100;
  const isCombinedNormalisedH100H200 = isRetentionSeries && state.retentionCardView === 'combined' && state.retentionChartXMin === 100 && state.retentionChartXMax === 200;
  const displayHours = dataset.isPPVBenchmark
    ? visibleAvailableHours
    : isH1BaseNormalisedOverall
    ? [1, 5, 10, 20, 50, 100, 120, 150, 200]
    : isCombinedNormalisedOverall
    ? [1, 10, 20, 50, 100, 120, 150, 200]
    : state.retentionChartXMin === 1 && state.retentionChartXMax === 200
    ? [1, ...Array.from({ length: 20 }, (_, index) => (index + 1) * 10)]
    : state.retentionChartXMin === 1 && state.retentionChartXMax === 20
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20]
      : state.retentionChartXMin === 20 && state.retentionChartXMax === 50
        ? [20, 30, 40, 50]
        : state.retentionChartXMin === 50 && state.retentionChartXMax === 100
          ? [50, 60, 70, 80, 90, 100]
          : state.retentionChartXMin === 100 && state.retentionChartXMax === 200
            ? [100, 120, 140, 160, 180, 200]
            : visibleAvailableHours;
  const benchmarkByHour = new Map(
    benchmarkPoints.map(point => [point.hour, point.value])
  );

  const benchmarkCode = benchmarkGenreKey(showRow['Genre']) === 'romantasy'
    ? 'TAB'
    : benchmarkGenreKey(showRow['Genre']) === 'romance'
      ? 'DMB'
      : 'MVS';
  const benchmarkLabel = dataset.isPPVBenchmark
    ? `Benchmark (H${retentionRow['PPV Max Hour']})`
    : 'Benchmark';

  if (!dataset.isPPVBenchmark) {
    const suffix = $('normalisedBenchmarkSuffix');
    if (suffix) {
      const benchmarkGenre = benchmarkRow?.Genre || showRow['Genre'] || 'Genre';
      suffix.textContent = `(${benchmarkGenre} BM - ${benchmarkCode})`;
    }
  }

  const datasets = [{
    label: dataset.isPPVBenchmark
      ? 'PPV retention'
      : viewKey.toLowerCase().startsWith('whale')
        ? 'Whale+ Live Retention'
        : 'Normalised Live Retention',
    data: points.map(point => ({ x: point.hour, y: point.value })),
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
      data: points.map(point => ({ x: point.hour, y: benchmarkByHour.get(point.hour) })),
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
          top: 24
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        retentionValueLabels: {
          targetHours: dataset.isPPVBenchmark
            ? ppvCalloutHours
            : isH1BaseNormalisedH1H20 ? [1, 5, 10, 15, 20]
            : isH1BaseNormalisedH20H50 ? [20, 30, 40, 50]
            : isH1BaseNormalisedH50H100 ? [50, 60, 70, 80, 90, 100]
            : isH1BaseNormalisedH100H200 ? [100, 120, 140, 160, 180, 200]
            : isH1BaseNormalisedOverall ? [1, 5, 10, 20, 50, 100, 120, 150, 200]
            : isCombinedNormalisedOverall ? [1, 10, 50, 100]
              : isCombinedNormalisedH1H20 ? [1, 5, 10, 15, 20]
              : isCombinedNormalisedH20H50 ? [20, 30, 40, 50]
              : isCombinedNormalisedH50H100 ? [50, 60, 70, 80, 90, 100]
              : isCombinedNormalisedH100H200 ? [100, 120, 140, 160, 180, 200]
              : [10, 50, 100],
          isPPVBenchmark: dataset.isPPVBenchmark,
          disabled: false,
          firstBelowBenchmark: false
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
            title: items => {
              const hour = items[0]?.parsed?.x;
              return Number.isFinite(hour) ? `H${hour}` : '';
            },
            label: context => ` ${context.parsed.y.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: dataset.isPPVBenchmark ? points[0]?.hour : state.retentionChartXMin,
          max: dataset.isPPVBenchmark ? points.at(-1)?.hour : state.retentionChartXMax,
          ticks: {
            color: '#8e98a9',
            maxTicksLimit: 20,
            maxRotation: 0,
            callback: value => displayHours.includes(Number(value)) ? `H${value}` : ''
          },
          afterBuildTicks: scale => {
            scale.ticks = displayHours.map(value => ({ value }));
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
  const options = RETENTION_VIEW_SECTIONS.flatMap(section =>
    section.rows.flatMap(row =>
      row.options
        .filter(option => !option.disabled)
        .map(option => ({
          ...option,
          label: option.sheet === 'ppv benchmarks'
            ? 'PPV Benchmarks - Base H10'
            : `${section.label.replace(/^1 Version: /, '')} · ${row.label} · ${option.label}`
        }))
    )
  ).filter((option, index, options) =>
        options.findIndex(item => item.sheet === option.sheet) === index
  );

  const desiredOrder = [
    'normalised overall',
    'normalised male',
    'normalised female',
    'normalised us',
    'normalised us male',
    'normalised us female',
    'whale+ overall',
    'whale+ male',
    'whale+ female',
    'whale+ us',
    'whale+ us male',
    'whale+ us female'
  ];

  return options.sort((a, b) => {
    const aIndex = desiredOrder.indexOf(String(a.sheet).toLowerCase());
    const bIndex = desiredOrder.indexOf(String(b.sheet).toLowerCase());
    const fallbackIndex = desiredOrder.length;

    return (aIndex < 0 ? fallbackIndex : aIndex) -
      (bIndex < 0 ? fallbackIndex : bIndex);
  });
}

function setupComparer() {
  const typeSelect = $('compareRetentionType');
  const datalist = $('compareShowIds');
  const reportDatalist = $('reportShowIds');

  if (!typeSelect || !datalist) return;

  const retentionOptions = [
    ...allRetentionOptions(),
    ...(state.comparerMode === 'shows' ? [{
      sheet: 'comparer tabular',
      label: 'Tabular · PPV cohorts H20-H100'
    }] : [])
  ];
  typeSelect.innerHTML = retentionOptions
    .map(option => `
      <option value="${escapeHTML(option.sheet)}">${escapeHTML(option.label)}</option>
    `)
    .join('');

  setupPPVTagControls();

  datalist.innerHTML = state.allRows
    .map(row => `<option value="${escapeHTML(row['Show ID'])}">${escapeHTML(row['Show Title'])}</option>`)
    .join('');

  if (reportDatalist) {
    const reportRows = state.reportRows.length ? state.reportRows : state.allRows;
    reportDatalist.innerHTML = reportRows
      .map(row => `<option value="${escapeHTML(row.show_id || row['Show ID'])}">${escapeHTML(row.show_title || row['Show Title'])}</option>`)
      .join('');
  }
  refreshComparerModeUI();
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
  ['Overall Editorial conviction', 'Editorial Conv.'],
  ['Subjective Conviction', 'Subjective Conv.'],
  ['Show Length', 'Show length'],
  ['Category', 'Category'],
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
  const metricValue = (row, field) => displayMetricValue(row[field]);

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
              <td>${escapeHTML(metricValue(rowOne, field))}</td>
              <td>${escapeHTML(metricValue(rowTwo, field))}</td>
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

function renderComparerPPVTable(showIdOne, showIdTwo, dataset) {
  const container = $('comparerTable');
  if (!container) return;

  const rowOne = dataset.rows.find(row => normalized(row['Show ID']) === normalized(showIdOne));
  const rowTwo = dataset.rows.find(row => normalized(row['Show ID']) === normalized(showIdTwo));
  const titleOne = rowOne?.['Show Title'] || showIdOne;
  const titleTwo = rowTwo?.['Show Title'] || showIdTwo;
  const cohortHours = dataset.cohortHours
    .filter(hour => hour <= 100)
    .filter(hour =>
      dataset.cohortRows?.[`${showIdOne}|${hour}`] ||
      dataset.cohortRows?.[`${showIdTwo}|${hour}`]
    );
  const retentionHours = [...new Set(
    cohortHours.flatMap(cohortHour => [showIdOne, showIdTwo].flatMap(showId => {
      const row = dataset.cohortRows?.[`${showId}|${cohortHour}`];
      return Object.keys(row || {})
        .map(field => field.match(/^H(\d+) Ret% Nth TD$/i))
        .filter(Boolean)
        .map(match => Number(match[1]));
    }))
  )].filter(hour => hour <= 100).sort((a, b) => a - b);
  const percent = value => {
    const numeric = Number.parseFloat(String(value ?? '').replace('%', ''));
    if (!Number.isFinite(numeric)) return null;
    return numeric <= 1 ? numeric * 100 : numeric;
  };
  const count = value => {
    const numeric = Number.parseFloat(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  };
  const abbreviateTitle = title => {
    const words = String(title || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'Show';
    if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
    return words.map(word => word[0]).join('').slice(0, 4).toUpperCase();
  };
  const shortTitleOne = abbreviateTitle(titleOne);
  const shortTitleTwo = abbreviateTitle(titleTwo);
  const comparisonClass = (actual, benchmark) => {
    if (actual === null || benchmark === null || benchmark === 0) return '';
    const ratio = actual / benchmark;
    if (ratio > state.ppvThresholds.darkGreen) return 'comparer-ratio-dark-green';
    if (ratio >= state.ppvThresholds.green) return 'comparer-ratio-green';
    if (ratio >= state.ppvThresholds.yellow) return 'comparer-ratio-yellow';
    return 'comparer-ratio-red';
  };
  const pair = (first, second) => {
    const a = percent(first);
    const b = percent(second);
    const ratio = a !== null && b !== null && b !== 0 ? a / b : null;
    return {
      display: ratio === null ? '-' : `${(ratio * 100).toFixed(1)}%`,
      actual: a,
      benchmark: b,
      ratio,
      hover: `${a === null ? '-' : a.toFixed(1)} / ${b === null ? '-' : b.toFixed(1)}`,
      className: comparisonClass(a, b)
    };
  };
  const ldauPair = (first, second) => {
    const actual = count(first);
    const benchmark = count(second);
    if (actual === null && benchmark === null) {
      return { display: '-', hover: '- / -' };
    }
    const format = value => value === null ? '-' : value.toLocaleString('en-IN');
    return {
      display: `${shortTitleOne} ${format(actual)} / ${shortTitleTwo} ${format(benchmark)}`,
      hover: `${titleOne}: ${format(actual)} / ${titleTwo}: ${format(benchmark)}`,
      className: comparisonClass(actual, benchmark)
    };
  };
  const headers = retentionHours.map(hour => `<th>H${hour}</th>`).join('');
  const rows = cohortHours.map(cohortHour => {
    const first = dataset.cohortRows?.[`${showIdOne}|${cohortHour}`];
    const second = dataset.cohortRows?.[`${showIdTwo}|${cohortHour}`];
    return `
      <tr>
        <th>H${cohortHour}</th>
        ${(() => {
          const comparison = ldauPair(first?.['H10 LDAU'], second?.['H10 LDAU']);
          return `<td class="${comparison.className}" title="${escapeHTML(comparison.hover)}">${escapeHTML(comparison.display)}</td>`;
        })()}
        ${retentionHours.map(hour =>
          (() => {
            const comparison = pair(first?.[`H${hour} Ret% Nth TD`], second?.[`H${hour} Ret% Nth TD`]);
            return comparison.actual === null
              ? '<td>-</td>'
              : `<td class="${comparison.className} comparer-cell-visible-details">
                  <span class="comparer-cell-actual">${comparison.actual.toFixed(2)}%</span>
                  <span class="comparer-cell-meta">BM ${comparison.benchmark === null ? '-' : `${comparison.benchmark.toFixed(2)}%`} · ${comparison.ratio === null ? 'n/a' : `${comparison.ratio.toFixed(2)}x`}</span>
                </td>`;
          })()
        ).join('')}
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="comparer-table-heading">
      <strong>PPV cohort comparison through H100</strong>
      <span>Actual / benchmark: ${escapeHTML(titleOne)} / ${escapeHTML(titleTwo)}</span>
    </div>
    ${ppvThresholdControlsMarkup('comparer-table-legend')}
    <div class="comparer-table-wrap">
      <table class="comparer-retention-table">
        <thead><tr><th>Cohort</th><th>H10 LDAU</th>${headers}</tr></thead>
        <tbody>${rows || '<tr><td colspan="3">No PPV cohort data available.</td></tr>'}</tbody>
      </table>
    </div>
  `;
  bindPPVThresholdControls(container, () => renderComparerPPVTable(showIdOne, showIdTwo, dataset));
}

function renderComparerTable(rowOne, rowTwo) {
  const container = $('comparerTable');
  if (!container) return;

  const titleOne = rowOne['Show Title'] || rowOne['Show ID'] || 'Show 1';
  const titleTwo = rowTwo['Show Title'] || rowTwo['Show ID'] || 'Show 2';
  const pointsOne = retentionFieldEntries(rowOne);
  const pointsTwo = retentionFieldEntries(rowTwo);
  const pointMapOne = new Map(pointsOne.map(point => [point.hour, point.value]));
  const pointMapTwo = new Map(pointsTwo.map(point => [point.hour, point.value]));
  const hours = [...new Set([...pointMapOne.keys(), ...pointMapTwo.keys()])]
    .sort((a, b) => a - b);

  const rows = hours.map(hour => {
    const actual = pointMapOne.get(hour);
    const benchmark = pointMapTwo.get(hour);
    const gap = Number.isFinite(actual) && Number.isFinite(benchmark)
      ? actual - benchmark
      : null;
    const gapClass = gap === null
      ? ''
      : gap >= 0 ? 'comparer-gap-positive' : 'comparer-gap-negative';

    return `
      <tr>
        <th>H${hour}</th>
        <td>${Number.isFinite(actual) ? `${actual.toFixed(2)}%` : '-'}</td>
        <td>${Number.isFinite(benchmark) ? `${benchmark.toFixed(2)}%` : '-'}</td>
        <td class="${gapClass}">${gap === null ? '-' : `${gap >= 0 ? '+' : ''}${gap.toFixed(2)} pts`}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="comparer-table-heading">
      <strong>Tabular retention comparison</strong>
      <span>First show is actual; second show is benchmark.</span>
    </div>
    <div class="comparer-table-wrap">
      <table class="comparer-retention-table">
        <thead>
          <tr>
            <th>Hour</th>
            <th>${escapeHTML(titleOne)}</th>
            <th>${escapeHTML(titleTwo)} (benchmark)</th>
            <th>Gap</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4">No retention points available.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function renderComparison() {
  const canvas = $('comparerChart');
  const status = $('comparerStatus');
  const analysis = $('comparerAnalysis');
  const typeSelect = $('compareRetentionType');
  const resultGrid = $('comparerResultGrid');
  const comparerTable = $('comparerTable');
  const comparerCard = $('comparerCard');

  if (!canvas || !status || !analysis || !typeSelect) return;

  const showIdOne = $('compareShowIdOne').value.trim();
  const showIdTwo = $('compareShowIdTwo').value.trim();
  const isTagMode = state.comparerMode === 'ppv-tags';
  const isTabular = typeSelect.value === 'comparer tabular';
  if (isTagMode) {
    state.comparerChartHours = null;
    resultGrid?.classList.remove('hidden');
    comparerTable?.classList.add('hidden');
    comparerCard?.classList.remove('comparer-card-empty');
    clearComparerMetrics();
    if (typeSelect.value === 'comparer tabular') {
      typeSelect.value = allRetentionOptions()[0]?.sheet || 'normalised overall';
    }
    renderPPVTagComparison(typeSelect.value);
    return;
  }
  if (resultGrid) {
    resultGrid.classList.toggle(
      'hidden',
      (!showIdOne && !showIdTwo) || isTabular
    );
  }
  analysis.classList.toggle('hidden', isTabular);
  if (comparerTable) {
    comparerTable.classList.toggle(
      'hidden',
      !isTabular || !showIdOne || !showIdTwo
    );
  }
  if (comparerCard) {
    comparerCard.classList.toggle(
      'comparer-card-empty',
      !showIdOne && !showIdTwo
    );
  }

  if ((!showIdOne || !showIdTwo) && state.comparerChart) {
    state.comparerChart.destroy();
    state.comparerChart = null;
  }

  const dataset = retentionDatasetForView(
    isTabular ? 'ppv benchmarks' : typeSelect.value
  );
  const rowOne = compareRowById(dataset, showIdOne);
  const rowTwo = compareRowById(dataset, showIdTwo);

  if (!showIdOne || !showIdTwo) {
    status.textContent = '';
    analysis.textContent = '';
    clearComparerMetrics();
    if (comparerTable) comparerTable.innerHTML = '';
    return;
  }

  if (!dataset || !rowOne || !rowTwo) {
    status.textContent = 'One or both Show IDs were not found for this retention type.';
    analysis.textContent = '';
    clearComparerMetrics();
    if (comparerTable) comparerTable.innerHTML = '';
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

  if (isTabular) {
    renderComparerPPVTable(rowOne['Show ID'], rowTwo['Show ID'], dataset);
  }

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

  const benchmarkRowFor = row => dataset.isPPVBenchmark
    ? dataset.cohortBenchmarks?.[
        `${benchmarkGenreKey(row['Genre'])}|${row['PPV Max Hour']}`
      ]
    : dataset.benchmarks?.[benchmarkGenreKey(row['Genre'])];

  const benchmarkPointsFor = row =>
    retentionFieldEntries(benchmarkRowFor(row));

  const firstBelowBenchmark = (row, points) => {
    const benchmarkByHour = new Map(
      benchmarkPointsFor(row).map(point => [point.hour, point.value])
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

  const formatLdau = value => {
    const numeric = Number.parseFloat(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(numeric) ? numeric.toLocaleString('en-IN') : '-';
  };
  const ldauAnalysis = !isTabular && !dataset.isPPVBenchmark
    ? `LDAU: ${rowOne['Show Title'] || showIdOne} ${formatLdau(rowOne.LDAU)} · ${rowTwo['Show Title'] || showIdTwo} ${formatLdau(rowTwo.LDAU)}.`
    : null;

  analysis.textContent = [
    ldauAnalysis,
    `First below benchmark: ${rowOne['Show Title'] || showIdOne} at ${belowBenchmarkText(rowOne, pointsOne)}; ${rowTwo['Show Title'] || showIdTwo} at ${belowBenchmarkText(rowTwo, pointsTwo)}.`
  ].filter(Boolean).join('\n');

  if (isTabular) return;

  const hours = [...new Set([
    ...pointsOne.map(point => point.hour),
    ...pointsTwo.map(point => point.hour)
  ])].sort((a, b) => a - b);

  const benchmarkPointsOne = benchmarkPointsFor(rowOne);
  const benchmarkPointsTwo = benchmarkPointsFor(rowTwo);
  const benchmarkMapOne = new Map(
    benchmarkPointsOne.map(point => [point.hour, point.value])
  );
  const benchmarkMapTwo = new Map(
    benchmarkPointsTwo.map(point => [point.hour, point.value])
  );
  const titleOne = rowOne['Show Title'] || showIdOne;
  const titleTwo = rowTwo['Show Title'] || showIdTwo;
  const useCohortSpacing = dataset.isPPVBenchmark;
  const chartHours = useCohortSpacing ? hours : null;
  const chartLabels = useCohortSpacing ? hours.map(hour => `H${hour}`) : undefined;
  const chartData = values => useCohortSpacing
    ? hours.map(hour => values.get(hour) ?? null)
    : hours.map(hour => ({ x: hour, y: values.get(hour) ?? null }));
  const datasets = [
    {
      label: `${titleOne} (actual)`,
      data: chartData(pointMapOne),
      borderColor: '#ff5964',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      spanGaps: true,
      tension: .25
    },
    {
      label: `${titleTwo} (actual)`,
      data: chartData(pointMapTwo),
      borderColor: '#78e7f0',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      spanGaps: true,
      tension: .25
    }
  ];

  const sameGenre = normalized(rowOne['Genre']) === normalized(rowTwo['Genre']);

  if (benchmarkPointsOne.length) {
    datasets.push({
      label: sameGenre ? 'Benchmark' : `${titleOne} (benchmark)`,
      data: chartData(benchmarkMapOne),
      borderColor: sameGenre ? '#ffffff' : '#ff5964',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [6, 5],
      pointRadius: 0,
      pointHoverRadius: 4,
      spanGaps: true,
      tension: .15
    });
  }

  if (!sameGenre && benchmarkPointsTwo.length) {
    datasets.push({
      label: `${titleTwo} (benchmark)`,
      data: chartData(benchmarkMapTwo),
      borderColor: '#78e7f0',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [6, 5],
      pointRadius: 0,
      pointHoverRadius: 4,
      spanGaps: true,
      tension: .15
    });
  }

  state.comparerChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets
    },
    options: comparisonChartOptions(chartHours, useCohortSpacing ? null : hours)
  });
  state.comparerChartHours = chartHours;
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
  const cleaned = displayMetricValue(row[field]);
  if (cleaned === '-') return cleaned;

  const date = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (date) {
    const year = date[3].length === 2 ? `20${date[3]}` : date[3];
    return `${date[1].padStart(2, '0')}/${date[2].padStart(2, '0')}/${year}`;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    const numeric = Number(cleaned);
    return Number.isInteger(numeric)
      ? numeric.toLocaleString('en-IN')
      : numeric.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  if (!/^https?:\/\//i.test(cleaned)) {
    return cleaned.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  return cleaned;
}

function reportFieldLabel(field, label) {
  return String(label)
    .replace(/\bP([1-3])s([12])\b/gi, 'P$1 S$2')
    .replace(/\bLdau\b/gi, 'LDAU');
}

function reportTitle(row) {
  return row.show_title || row['Show Title'] || row.book_title || row['Show Title'] || 'Show';
}

function reportId(row) {
  return row.show_id || row['Show ID'] || '-';
}

function reportRetentionChartsMarkup() {
  return `
    <div class="report-subheading">Retention performance and benchmarks</div>
    <div class="report-retention-charts">
      <article class="report-retention-chart">
        <h4>Normal Overall</h4>
        <div class="report-retention-chart-wrap"><canvas id="reportNormalOverallChart"></canvas></div>
        <p id="reportNormalOverallStatus" class="report-chart-status"></p>
      </article>
      <article class="report-retention-chart">
        <h4>Whale+ Overall</h4>
        <div class="report-retention-chart-wrap"><canvas id="reportWhaleOverallChart"></canvas></div>
        <p id="reportWhaleOverallStatus" class="report-chart-status"></p>
      </article>
    </div>
  `;
}

function renderReportRetentionCharts(reportRow) {
  state.reportCharts ||= {};
  Object.values(state.reportCharts).forEach(chart => chart?.destroy());
  state.reportCharts = {};

  const showRow = state.allRows.find(row =>
    normalized(row['Show ID']) === normalized(reportId(reportRow)) ||
    normalized(row['Show Title']) === normalized(reportTitle(reportRow))
  );
  if (!showRow || typeof Chart === 'undefined') return;

  [
    ['reportNormalOverallChart', 'reportNormalOverallStatus', 'normalised overall', 'Normalised Live Retention'],
    ['reportWhaleOverallChart', 'reportWhaleOverallStatus', 'Whale+ Overall', 'Whale+ Live Retention']
  ].forEach(([canvasId, statusId, viewKey, actualLabel]) => {
    const canvas = $(canvasId);
    const status = $(statusId);
    const dataset = retentionDatasetForView(viewKey);
    const retentionRow = dataset?.rows?.find(row => normalized(row['Show ID']) === normalized(showRow['Show ID']));
    const points = retentionFieldEntries(retentionRow);
    const benchmarkRow = dataset?.benchmarks?.[benchmarkGenreKey(showRow['Genre'])];
    const benchmarkPoints = retentionFieldEntries(benchmarkRow);

    if (!canvas || !points.length) {
      if (status) status.textContent = 'No retention data is available for this show.';
      return;
    }

    const benchmarkByHour = new Map(benchmarkPoints.map(point => [point.hour, point.value]));
    state.reportCharts[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map(point => `H${point.hour}`),
        datasets: [
          {
            label: actualLabel,
            data: points.map(point => point.value),
            borderColor: '#8ee6a8',
            backgroundColor: 'rgba(142, 230, 168, .14)',
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
            fill: true,
            tension: .25,
            spanGaps: true
          },
          ...(benchmarkPoints.length ? [{
            label: `${showRow['Genre'] || 'Genre'} benchmark`,
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
          }] : [])
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: true, position: 'bottom', labels: { color: '#b7c0ce', font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: '#8993a3', font: { size: 9 } }, grid: { color: 'rgba(136, 149, 168, .12)' } },
          y: { beginAtZero: false, suggestedMin: 0, suggestedMax: 100, ticks: { color: '#8993a3', callback: value => `${value}%` }, grid: { color: 'rgba(136, 149, 168, .12)' } }
        }
      }
    });
  });
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
  const labels = {
    show_id: 'Show ID',
    show_title: 'Show Title',
    author_id: 'Author ID',
    show_cohort: 'Show Cohort',
    editorial_lead: 'Editorial Lead',
    channel_type: 'Channel Type',
    sherpa_classification: 'Sherpa Classification',
    book_completed: 'Book Completed',
    book_genre: 'Book Genre',
    stage_label_numbered: 'Stage Label',
    sub_stage_label_numbered: 'Sub-stage Label',
    current_testing_state: 'Current Testing State',
    current_age_bucket: 'Current Age Bucket',
    show_status: 'Show Status',
    contract_status: 'Contract Status',
    wbp_status: 'WBP Status',
    wbp_sub_status: 'WBP Sub-status',
    incentive_flag: 'Incentive Flag',
    published_word_count: 'Published Word Count',
    published_word_count_l30: 'Published Word Count L30',
    show_live_length: 'Show Live Length',
    l7d_active_days: 'L7D Active Days',
    active_days_l30_distinct: 'Active Days L30 Distinct',
    author_other_book_l30d_active_days: 'Author Other Book L30D Active Days',
    ppv_tag: 'PPV Tag',
    moderation_status: 'Moderation Status',
    editor_score: 'Editor Score',
    show_editor_score: 'Show Editor Score',
    moderation_evaluation_date: 'Moderation Evaluation Date',
    llm_result: 'LLM Result',
    llm_score: 'LLM Score',
    Number: 'Number'
  };
  const addGroup = (title, keys) => {
    const available = keys.filter(key => fields.includes(key));
    available.forEach(key => assigned.add(key));
    if (available.length) groups.push({
      title,
      fields: available.map(field => [
        field,
        reportFieldLabel(field, labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()))
      ])
    });
  };

  addGroup('Show Identity, Quality and Editorial Data', [
    'show_title', 'show_cohort', 'create_date', 'editor', 'senior_editor',
    'editorial_lead', 'channel_type', 'sherpa_classification', 'book_genre',
    'moderation_status', 'editor_score', 'show_editor_score',
    'moderation_evaluation_date', 'llm_result', 'llm_score'
  ]);
  addGroup('Status and Contracting Details', [
    'book_completed', 'stage_label_numbered', 'sub_stage_label_numbered',
    'current_testing_state', 'current_age_bucket', 'show_status',
    'contract_status', 'wbp_status', 'wbp_sub_status', 'incentive_flag', 'ppv_tag',
    'contract_offered_date', 'contract_signed_date', 'Stage Funnel Stage',
    'Stage Funnel Bucket', 'Stage Funnel Sub-Bucket'
  ]);
  addGroup('Publishing, activity and milestones', [
    'published_word_count', 'published_word_count_l30', 'show_live_length',
    'l7d_active_days', 'active_days_l30_distinct',
    'First Chapter Publish Date', 'Last Chapter Publish Date',
    'date_10k', 'date_crossed_50k', 'date_crossed_100k', 'date_crossed_200k',
    'date_crossed_300k', 'date_crossed_400k', 'date_crossed_h1', 'date_crossed_h2',
    'date_crossed_h5', 'date_crossed_h10', 'date_crossed_h20', 'date_crossed_h30',
    'date_crossed_h40'
  ]);
  addGroup('P3 S1 retention and testing', fields.filter(field => /^p3s1_/.test(field)));
  addGroup('P3 S2 retention and testing', fields.filter(field => /^p3s2_/.test(field)));
  addGroup('Author Details', [
    'author_id', 'author_other_book_l30d_active_days', 'Number of books', 'Book rank', 'Auth geography', 'Author book rank (>5k words)',
  ]);

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
    ${reportRetentionChartsMarkup()}
    <div class="report-notes">
      <span>Retention and benchmark findings</span>
      ${reportRetentionFindings(row).map(finding => `<p>${escapeHTML(finding)}</p>`).join('')}
    </div>
  `;
  output.classList.remove('hidden');
  renderReportRetentionCharts(row);
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
  const headerHeight = 132;
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
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  write('P3 & PPV Shows Slate', { size: 10, color: [242, 13, 91], weight: 'bold', gap: 11 });
  write(reportTitle(row), { size: 20, color: [255, 255, 255], weight: 'bold', gap: -6 });
  write(`Show ID - ${reportId(row)}`, { size: 9, color: [196, 211, 230], gap: 8 });
  y = Math.max(y + 4, headerHeight + 16);

  reportFieldGroups(row).forEach(group => {
    // Let long sections flow naturally so pages do not contain large unused gaps.
    ensureSpace(30);
    doc.setFillColor(224, 242, 247);
    doc.roundedRect(margin - 4, y - 12, pageWidth - margin * 2 + 8, 19, 3, 3, 'F');
    write(group.title, { size: 11, color: [7, 83, 104], weight: 'bold', gap: 5 });
    group.fields.forEach(([field, label]) => {
      const value = reportValue(row, field);
      const text = `${label}: ${value}`;
      write(text, { size: 9, color: [31, 41, 55], gap: 2 });
    });
    y += 5;
  });

  const showRow = state.allRows.find(candidate =>
    normalized(candidate['Show ID']) === normalized(reportId(row)) ||
    normalized(candidate['Show Title']) === normalized(reportTitle(row))
  );
  const addRetentionPdfChart = (label, viewKey) => {
    const dataset = retentionDatasetForView(viewKey);
    const retentionRow = dataset?.rows?.find(candidate =>
      normalized(candidate['Show ID']) === normalized(showRow?.['Show ID'])
    );
    const points = retentionFieldEntries(retentionRow);
    if (!showRow || !points.length) return;

    const benchmarkRow = dataset?.benchmarks?.[benchmarkGenreKey(showRow['Genre'])];
    const benchmarkByHour = new Map(retentionFieldEntries(benchmarkRow).map(point => [point.hour, point.value]));
    ensureSpace(205);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(7, 83, 104);
    doc.text(label, margin, y);
    const chartLeft = margin + 28;
    const chartTop = y + 14;
    const chartWidth = pageWidth - margin * 2 - 36;
    const chartHeight = 135;
    const minHour = points[0]?.hour ?? 1;
    const maxHour = points.at(-1)?.hour ?? minHour;
    const xForHour = hour => chartLeft + (maxHour === minHour ? 0 : ((hour - minHour) / (maxHour - minHour)) * chartWidth);
    const xFor = index => xForHour(points[index]?.hour ?? minHour);
    const yFor = value => chartTop + chartHeight - (Math.max(0, Math.min(100, value)) / 100) * chartHeight;

    doc.setDrawColor(190, 199, 212);
    doc.setLineWidth(.6);
    doc.line(chartLeft, chartTop, chartLeft, chartTop + chartHeight);
    doc.line(chartLeft, chartTop + chartHeight, chartLeft + chartWidth, chartTop + chartHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    [0, 25, 50, 75, 100].forEach(value => {
      const lineY = yFor(value);
      doc.setDrawColor(225, 230, 237);
      doc.line(chartLeft, lineY, chartLeft + chartWidth, lineY);
      doc.setTextColor(100, 116, 139);
      doc.text(`${value}%`, margin, lineY + 2);
    });

    const preferredTicks = [1, 5, 10, 20, 50, 100, 120, 150, 200];
    const tickPoints = points.filter(point => preferredTicks.includes(point.hour));
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    tickPoints.forEach(point => {
      const index = points.indexOf(point);
      const x = xFor(index);
      doc.setDrawColor(210, 218, 228);
      doc.setLineWidth(.5);
      doc.line(x, chartTop + chartHeight, x, chartTop + chartHeight + 4);
      doc.text(`H${point.hour}`, x, chartTop + chartHeight + 13, { align: 'center' });
    });

    const drawSeries = (series, color, dashed = false) => {
      const available = series.map((value, index) => ({ value, index })).filter(point => Number.isFinite(point.value));
      if (!available.length) return;
      doc.setDrawColor(...color);
      doc.setLineWidth(dashed ? .8 : 1.5);
      if (dashed && doc.setLineDashPattern) doc.setLineDashPattern([3, 3], 0);
      for (let index = 1; index < available.length; index += 1) {
        const previous = available[index - 1];
        const current = available[index];
        doc.line(xFor(previous.index), yFor(previous.value), xFor(current.index), yFor(current.value));
      }
      if (dashed && doc.setLineDashPattern) doc.setLineDashPattern([], 0);
    };

    drawSeries(points.map(point => point.value), [34, 139, 79]);
    drawSeries(points.map(point => benchmarkByHour.get(point.hour)), [55, 65, 81], true);
    const legendY = chartTop + chartHeight + 29;
    doc.setFontSize(7);
    doc.setLineWidth(1.5);
    doc.setDrawColor(34, 139, 79);
    doc.line(chartLeft, legendY, chartLeft + 18, legendY);
    doc.setTextColor(34, 139, 79);
    const actualLegend = viewKey.startsWith('Whale') ? 'Whale+ Overall (actual)' : 'Normal Overall (actual)';
    const actualLegendX = chartLeft + 24;
    doc.text(actualLegend, actualLegendX, legendY + 2);
    const benchmarkLegendX = actualLegendX + doc.getTextWidth(actualLegend) + 18;
    doc.setDrawColor(55, 65, 81);
    doc.setLineWidth(.8);
    for (let x = benchmarkLegendX; x < benchmarkLegendX + 18; x += 6) {
      doc.line(x, legendY, Math.min(x + 3, benchmarkLegendX + 18), legendY);
    }
    doc.setTextColor(55, 65, 81);
    doc.text(`${showRow['Genre'] || 'Genre'} benchmark (dashed)`, benchmarkLegendX + 24, legendY + 2);
    y = legendY + 17;
  };

  const addPPVTabularPdf = () => {
    const dataset = retentionDatasetForView('ppv benchmarks');
    const availableHours = dataset?.cohortHours?.filter(hour =>
      dataset.cohortRows?.[`${showRow?.['Show ID']}|${hour}`]
    ) || [];
    if (!showRow || !availableHours.length) return;

    const retentionHours = dataset.cohortHours || [];
    const tableWidth = pageWidth - margin * 2;
    const firstColumnsWidth = 86;
    const retentionWidth = Math.max(28, (tableWidth - firstColumnsWidth) / Math.max(1, retentionHours.length));
    const rowHeight = 24;
    const headerHeight = 18;
    const tableHeight = headerHeight + rowHeight * availableHours.length + 62;
    ensureSpace(tableHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(7, 83, 104);
    doc.text('PPV Benchmarks - H10 Base (Tabular)', margin, y);
    y += 14;

    const ratioLegend = [
      ['> 1.0x', [15, 116, 55]],
      ['0.7–1.0x', [98, 239, 141]],
      ['0.5–0.7x', [245, 190, 66]],
      ['< 0.5x', [255, 95, 115]]
    ];
    let legendX = margin;
    doc.setFontSize(6.5);
    ratioLegend.forEach(([label, color]) => {
      doc.setFillColor(...color);
      doc.circle(legendX + 3, y - 2, 3, 'F');
      doc.setTextColor(55, 65, 81);
      doc.text(label, legendX + 9, y);
      legendX += 62;
    });
    y += 8;

    const header = ['Cohort', 'H10 LDAU', ...retentionHours.map(hour => `H${hour}`)];
    const widths = [42, 44, ...retentionHours.map(() => retentionWidth)];
    const drawCell = (text, x, width, top, fillColor = null, lines = null) => {
      if (fillColor) {
        doc.setFillColor(...fillColor);
        doc.rect(x, top, width, rowHeight, 'F');
      }
      doc.setDrawColor(210, 218, 228);
      doc.rect(x, top, width, rowHeight);
      doc.setFont('helvetica', fillColor ? 'bold' : 'normal');
      doc.setFontSize(fillColor ? 6 : 6.5);
      doc.setTextColor(fillColor ? 255 : 55, fillColor ? 255 : 65, fillColor ? 255 : 81);
      doc.text(lines || String(text), x + 3, top + (lines ? 8 : 14), { maxWidth: width - 6 });
    };

    let x = margin;
    header.forEach((text, index) => {
      drawCell(text, x, widths[index], y, [62, 78, 110]);
      x += widths[index];
    });
    y += rowHeight;

    const retentionPercent = value => {
      const numeric = Number.parseFloat(String(value ?? '').replace('%', ''));
      return Number.isFinite(numeric) ? (numeric <= 1 ? numeric * 100 : numeric) : null;
    };
    availableHours.forEach(cohortHour => {
      const row = dataset.cohortRows[`${showRow['Show ID']}|${cohortHour}`];
      const benchmarkRow = dataset.cohortBenchmarks?.[
        `${benchmarkGenreKey(showRow['Genre'])}|${cohortHour}`
      ];
      const values = [
        `H${cohortHour}`,
        row?.['H10 LDAU'] || '-',
        ...retentionHours.map(hour => {
          const actual = retentionPercent(row?.[`H${hour} Ret% Nth TD`]);
          const benchmark = retentionPercent(benchmarkRow?.[`H${hour} Ret% Nth TD`]);
          if (!Number.isFinite(actual)) return '-';
          return {
            actual,
            benchmark,
            ratio: Number.isFinite(benchmark) && benchmark !== 0 ? actual / benchmark : null
          };
        })
      ];
      x = margin;
      values.forEach((value, index) => {
        if (index < 2 || typeof value === 'string') {
          drawCell(value, x, widths[index], y);
        } else {
          const color = value.ratio === null
            ? null
            : value.ratio > state.ppvThresholds.darkGreen
              ? [15, 116, 55]
              : value.ratio >= state.ppvThresholds.green
                ? [88, 232, 133]
                : value.ratio >= state.ppvThresholds.yellow
                  ? [245, 190, 66]
                  : [255, 95, 115];
          const meta = `BM ${Number.isFinite(value.benchmark) ? `${value.benchmark.toFixed(1)}%` : '-'} · ${Number.isFinite(value.ratio) ? `${value.ratio.toFixed(2)}x` : 'n/a'}`;
          drawCell('', x, widths[index], y, color, [`${value.actual.toFixed(1)}%`, meta]);
        }
        x += widths[index];
      });
      y += rowHeight;
    });
    y += 14;
  };

  ensureSpace(420);
  addRetentionPdfChart('Normal Overall', 'normalised overall');
  addRetentionPdfChart('Whale+ Overall', 'Whale+ Overall');
  addPPVTabularPdf();

  const filename = `${reportTitle(row).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'show'}-report.pdf`;
  doc.save(filename);
}

function comparisonChartOptions(cohortHours = null, actualHours = null) {
  const usesCohortSpacing = Array.isArray(cohortHours);
  const numericTickValues = () => {
    if (!actualHours) return null;
    const rangeMin = state.comparerChartXMin || 1;
    const rangeMax = state.comparerChartXMax || 200;
    if (rangeMin === 1 && rangeMax === 200) return [1, 10, 30, 50, 100, 120, 150, 200];
    if (rangeMin === 1 && rangeMax === 10) return Array.from({ length: 10 }, (_, index) => index + 1);
    if (rangeMin === 10 && rangeMax === 50) return [10, 20, 30, 40, 50];
    if (rangeMin === 50 && rangeMax === 100) return [50, 60, 70, 80, 90, 100];
    if (rangeMin === 100 && rangeMax === 200) return [100, 120, 140, 160, 180, 200];
    return actualHours.filter(hour => hour >= rangeMin && hour <= rangeMax);
  };
  const isPPVBenchmarks = $('compareRetentionType')?.value === 'ppv benchmarks';
  const overallMin = isPPVBenchmarks ? 20 : 1;
  const overallMax = isPPVBenchmarks ? 100 : 200;
  const isOverallRange = (state.comparerChartXMin || overallMin) === overallMin
    && (state.comparerChartXMax || overallMax) === overallMax;
  const hourTicks = isPPVBenchmarks
    ? [20, 30, 40, 50, 60, 70, 80, 90, 100]
    : [1, 5, 10, 50, 100, 150, 200];
  const startIndex = usesCohortSpacing
    ? Math.max(0, cohortHours.findIndex(hour => hour >= state.comparerChartXMin))
    : null;
  const endIndex = usesCohortSpacing
    ? Math.max(0, cohortHours.reduce((lastIndex, hour, index) => (
      hour <= state.comparerChartXMax ? index : lastIndex
    ), 0))
    : null;

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
          title: items => {
            const item = items[0];
            if (!item) return '';
            const rawHour = usesCohortSpacing
              ? cohortHours[item.parsed.x]
              : item.parsed.x ?? item.label;
            return rawHour === undefined || rawHour === null
              ? ''
              : `H${String(rawHour).replace(/^H/i, '')}`;
          },
          label: context => ` ${context.parsed.y.toFixed(1)}%`,
          labelColor: context => {
            const color = context.dataset?.borderColor || '#b7c0ce';
            const isBenchmark = /benchmark/i.test(context.dataset?.label || '');
            return {
              borderColor: color,
              backgroundColor: isBenchmark ? 'transparent' : color,
              borderWidth: isBenchmark ? 2 : 0
            };
          }
        }
      }
    },
    scales: {
      x: {
        type: usesCohortSpacing ? 'category' : 'linear',
        min: usesCohortSpacing ? startIndex : (state.comparerChartXMin || overallMin),
        max: usesCohortSpacing ? endIndex : (state.comparerChartXMax || overallMax),
        afterBuildTicks: axis => {
          if (usesCohortSpacing) {
            axis.ticks = hourTicks
              .map(hour => cohortHours.indexOf(hour))
              .filter(index => index >= axis.min && index <= axis.max)
              .map(value => ({ value }));
            return;
          }
          axis.ticks = (numericTickValues() || hourTicks)
            .filter(value => value >= axis.min && value <= axis.max)
            .map(value => ({ value }));
        },
        ticks: {
          color: '#8e98a9',
          maxTicksLimit: 20,
          maxRotation: 0,
          callback: value => usesCohortSpacing ? `H${cohortHours[value]}` : `H${value}`
        },
        grid: { color: '#293140' }
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
