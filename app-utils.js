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


