/* Table rendering and show-details modal */

function render() {
  const rows = state.filteredRows;

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
    .map(
      (row, index) => `
        <tr>
          <td>
            <div
              class="show-name"
              title="${escapeHTML(row['Show Title'])}"
            >
              ${escapeHTML(
                row['Show Title'] || 'Untitled'
              )}
            </div>

            <div class="show-id">
              ${escapeHTML(row['Show ID'])}
            </div>
          </td>

          <td>${escapeHTML(row.Genre)}</td>
          <td>${tag(row['PPV Tag'])}</td>
          <td>${statusTag(row['Active/Inactive'])}</td>

          <td>
            ${escapeHTML(
              row['Activity Days (L30D)'] || '—'
            )}
          </td>

          <td>${escapeHTML(row.Category || '—')}</td>

          <td>
            ${escapeHTML(
              row['Show Length'] || '—'
            )}
          </td>

          <td>${priorityTag(row.Priority)}</td>

          <td>
            <button
              class="details-button"
              data-row-index="${start + index}"
            >
              View
            </button>
          </td>
        </tr>
      `
    )
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
    ${sections}
    ${remainingSection}
  `;

  $('detailsModal').classList.remove('hidden');
}
