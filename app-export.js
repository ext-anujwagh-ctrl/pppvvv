/* CSV export controls and download logic */

function setupExport() {
  $('columnSelector').innerHTML = CSV_HEADERS
    .map(
      (header, index) => `
        <label class="column-option">
          <input
            type="checkbox"
            value="${index}"
            ${
              state.selectedColumns.includes(header)
                ? 'checked'
                : ''
            }
          />

          <span>${escapeHTML(header)}</span>
        </label>
      `
    )
    .join('');

  document
    .querySelectorAll('#columnSelector input')
    .forEach(input => {
      input.addEventListener('change', () => {
        state.selectedColumns = [
          ...document.querySelectorAll(
            '#columnSelector input:checked'
          )
        ].map(item =>
          CSV_HEADERS[Number(item.value)]
        );

        updateExportMeta();
      });
    });

  updateExportMeta();
}

function updateExportMeta() {
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


