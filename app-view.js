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
  return value
    ? `<span class="tag">${escapeHTML(value)}</span>`
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

  const className = [
    'high',
    'urgent'
  ].includes(normalizedValue)
    ? 'tag-red'
    : [
        'medium',
        'p2'
      ].includes(normalizedValue)
      ? 'tag-yellow'
      : '';

  return `
    <span class="tag ${className}">
      ${escapeHTML(value)}
    </span>
  `;
}

function openDetails(row) {
  $('detailsTitle').textContent =
    row['Show Title'] || 'Show details';

  $('detailsContent').innerHTML = DETAIL_HEADERS
    .map(header => {
      const value = row[header];

      if (!value) return '';

      const full =
        value.length > 100 ||
        header.includes('Comments') ||
        header.includes('Synopsis') ||
        header.includes('conversation') ||
        header.includes('documents');

      return `
        <div class="detail-item ${full ? 'full' : ''}">
          <span class="detail-label">
            ${escapeHTML(header)}
          </span>

          <div class="detail-value">
            ${escapeHTML(value)}
          </div>
        </div>
      `;
    })
    .join('');

  $('detailsModal').classList.remove('hidden');
}

