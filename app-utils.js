/* CSV parsing, normalization, formatting, and display helpers */

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if (
      (char === '\n' || char === '\r') &&
      !quoted
    ) {
      if (char === '\r' && next === '\n') i++;

      row.push(value);

      if (row.some(cell => cell.trim() !== '')) {
        rows.push(row);
      }

      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value !== '' || row.length) {
    row.push(value);

    if (row.some(cell => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  if (!rows.length) return [];

  const headers = rows[0].map(header =>
    header.trim().replace(/^"|"$/g, '')
  );

  return rows.slice(1).map(values =>
    Object.fromEntries(
      headers.map((header, index) => [
        header,
        (values[index] || '').trim()
      ])
    )
  );
}

function parseRetentionWorkbook(workbook) {
  const datasets = {};

  workbook.SheetNames.forEach(sheetName => {
    const matrix = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      {
        header: 1,
        defval: ''
      }
    );

    const headerIndex = matrix.findIndex(row =>
      row.some(cell => String(cell).trim() === 'Show ID')
    );

    if (headerIndex < 0) return;

    const headers = matrix[headerIndex].map(cell =>
      String(cell || '').trim()
    );

    const benchmarkRows = {};

    matrix.slice(0, headerIndex).forEach(row => {
      const type = String(row[1] || '').trim().toLowerCase();
      const genre = String(row[2] || '').trim();

      if (type !== 'benchmark' || !genre) return;

      benchmarkRows[normalized(genre)] = Object.fromEntries(
        headers.map((header, index) => [
          header,
          row[index] ?? ''
        ])
      );
    });

    const rows = matrix
      .slice(headerIndex + 1)
      .map(values => Object.fromEntries(
        headers.map((header, index) => [
          header,
          String(values[index] ?? '').trim()
        ])
      ))
      .filter(row => row['Show ID']);

    datasets[sheetName] = {
      rows,
      benchmarks: benchmarkRows
    };
  });

  return datasets;
}

function parsePPVBenchmarkCSV(text) {
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS could not be loaded');
  }

  const workbook = XLSX.read(text, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ''
  });
  const headerIndex = matrix.findIndex(row =>
    row.some(cell => String(cell).trim().toLowerCase() === 'show_id')
  );

  if (headerIndex < 0) {
    throw new Error('PPV benchmark CSV headers not found');
  }

  const maxHourRow = matrix[0] || [];
  const headers = matrix[headerIndex].map(cell =>
    String(cell || '').trim()
  );
  const retentionColumns = headers
    .map((header, index) => {
      const match = header.match(/^H(\d+)_Retention$/i);
      return match ? { index, hour: Number(match[1]) } : null;
    })
    .filter(Boolean);

  const canonicalRow = (values, cohortMaxHour) => {
    const row = {};

    retentionColumns
      .filter(column => Number(maxHourRow[column.index]) === cohortMaxHour)
      .forEach(column => {
        row[`H${column.hour} Ret% Nth TD`] = values[column.index] ?? '';
      });

    return row;
  };

  const benchmarkRows = {};

  matrix.slice(0, headerIndex).forEach(values => {
    const genre = String(values[2] || '').trim();
    if (!genre) return;

    const benchmarkByCohort = {};
    [...new Set(
      retentionColumns.map(column => Number(maxHourRow[column.index]))
    )].forEach(cohortMaxHour => {
      benchmarkByCohort[`${normalized(genre)}|${cohortMaxHour}`] = {
        Genre: genre,
        ...canonicalRow(values, cohortMaxHour)
      };
    });

    Object.assign(benchmarkRows, benchmarkByCohort);
  });

  const rows = matrix
    .slice(headerIndex + 1)
    .map(values => {
      const populatedRetentionColumns = retentionColumns.filter(column =>
        String(values[column.index] ?? '').trim() !== ''
      );
      const lastRetentionColumn = populatedRetentionColumns.at(-1);
      const maxHour = lastRetentionColumn
        ? Number(maxHourRow[lastRetentionColumn.index])
        : null;

      return {
        'Show ID': String(values[0] || '').trim(),
        'Show Title': String(values[1] || '').trim(),
        Genre: String(values[2] || '').trim(),
        'PPV Max Hour': maxHour,
        ...(maxHour ? canonicalRow(values, maxHour) : {})
      };
    })
    .filter(row => row['Show ID']);

  return {
    rows,
    benchmarks: {},
    cohortBenchmarks: benchmarkRows,
    isPPVBenchmark: true
  };
}

function unique(field) {
  return [
    ...new Set(
      state.allRows.map(row => row[field] ?? '')
    )
  ].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

function isYes(value) {
  return [
    'yes',
    'y',
    'true',
    '1',
    'completed',
    'contracted',
    'active'
  ].includes(normalized(value));
}

function num(value) {
  const parsed = Number(
    String(value || '').replace(/[^0-9.-]/g, '')
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function filterKey(value) {
  return value === '' ? '__BLANK__' : value;
}

function filterLabel(value) {
  return value === '' ? '(Blank)' : value;
}

function showLengthBucket(value) {
  const length = num(value);

  if (length === null) return '__BLANK__';
  if (length <= 50) return '0-50';
  if (length <= 100) return '50-100';

  return '100+';
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
