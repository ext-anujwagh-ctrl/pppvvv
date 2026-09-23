/* CSV export controls and download logic */

function setupExport() {
  const pinnedColumns =
    state.exportMode === 'operational'
      ? OPERATIONAL_VIEW_HEADERS
      : [];

  $('columnSelector').innerHTML = CSV_HEADERS
    .map(
      (header, index) => `
        <label class="column-option ${
          pinnedColumns.includes(header)
            ? 'column-option-pinned'
            : ''
        }">
          <input
            type="checkbox"
            value="${index}"
            ${
              state.selectedColumns.includes(header)
                ? 'checked'
                : ''
            }
            ${
              pinnedColumns.includes(header)
                ? 'disabled'
                : ''
            }
          />

          <span>${escapeHTML(header)}</span>
          ${
            pinnedColumns.includes(header)
              ? '<small>Operational</small>'
              : ''
          }
        </label>
      `
    )
    .join('');

  document
    .querySelectorAll('#columnSelector input')
    .forEach(input => {
      input.addEventListener('change', () => {
        const selected = [
          ...document.querySelectorAll(
            '#columnSelector input:checked'
          )
        ].map(item =>
          CSV_HEADERS[Number(item.value)]
        );

        state.selectedColumns = [
          ...pinnedColumns,
          ...selected.filter(
            header => !pinnedColumns.includes(header)
          )
        ];

        updateExportMeta();
      });
    });

  updateExportMeta();
}

function updateExportMeta() {
  const operationalMode =
    state.exportMode === 'operational';

  $('exportTitle').textContent = operationalMode
    ? 'Export operational view'
    : 'Export filtered data';

  $('exportCopy').textContent = operationalMode
    ? 'Operational columns are included. Add any other columns you need, then download the rows matching your filters.'
    : 'Choose the columns to include. Export uses the rows currently matching your filters.';

  $('selectedColumnCount').textContent =
    `${state.selectedColumns.length} column${
      state.selectedColumns.length === 1 ? '' : 's'
    } selected`;

  $('exportRowCount').textContent =
    `${state.filteredRows.length.toLocaleString()} row${
      state.filteredRows.length === 1 ? '' : 's'
    } will be exported`;
}

function csvCell(value) {
  const text = String(value ?? '');

  return /[",\n\r]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function downloadCSV() {
  if (
    !state.selectedColumns.length ||
    !state.filteredRows.length
  ) {
    return;
  }

  const content = [
    state.selectedColumns,
    state.filteredRows.map(row =>
      state.selectedColumns.map(
        header => row[header] || ''
      )
    )
  ]
    .flat()
    .map(row => row.map(csvCell).join(','))
    .join('\r\n');

  const blob = new Blob(
    [`\uFEFF${content}`],
    {
      type: 'text/csv;charset=utf-8;'
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download =
    `show-dashboard-export-${
      new Date().toISOString().slice(0, 10)
    }.csv`;

  link.click();
  URL.revokeObjectURL(url);
}

