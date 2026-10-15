/* Chart grouping, labels, and rendering */

function chartDisplayLabel(value) {
  const labels = {
    action_needed_p3_passed: 'P3 Passed',
    action_needed_p3_failed: 'P3 Failed',
    testing_p3: 'Testing P3',
    average: 'Avg',
    bad: 'Bad',
    ppv: 'PPV'
  };

  return labels[normalized(value)] || value;
}

function groupedCounts(field, options = {}) {
  const counts = {};

  state.filteredRows.forEach(row => {
    const rawValue = String(row[field] ?? '').trim();
    const normalizedValue = normalized(rawValue);

    if (!rawValue && options.excludeBlank) {
      return;
    }
    if (field === 'Category' && normalizedValue === 'not found') {
      return;
    }
    if (options.excludeValues?.some(value => normalizedValue === normalized(value))) {
      return;
    }
    if (
      ['Dumper vs Original', 'Category'].includes(field) &&
      normalizedValue === 'to be tagged'
    ) {
      return;
    }
    if (
      field === 'Classification' &&
      state.operationalScope !== 'all-others' &&
      normalizedValue === 'to be tagged'
    ) {
      return;
    }

    let value = rawValue || '(Blank)';

    value = chartDisplayLabel(value);
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => {
    if (options.sortCountDescending) {
      return b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true });
    }
    const aNumber = Number(a[0]);
    const bNumber = Number(b[0]);

    if (
      Number.isFinite(aNumber) &&
      Number.isFinite(bNumber)
    ) {
      return aNumber - bNumber;
    }

    return a[0].localeCompare(
      b[0],
      undefined,
      { numeric: true }
    );
  });
}

function chartColors(length) {
  const colors = [
    '#a675ff',
    '#78e7f0',
    '#c3a4ff',
    '#6f54a8',
    '#f5f7fb',
    '#8c79c7',
    '#4f3d7d',
    '#b4a8dc',
    '#6e9fa8',
    '#746a86'
  ];

  return Array.from(
    { length },
    (_, index) => colors[index % colors.length]
  );
}

const PIE_VALUE_LABELS_PLUGIN = {
  id: 'pieValueLabels',
  afterDatasetsDraw(chart) {
    if (chart.config.type !== 'pie') return;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0]?.data || [];
    const context = chart.ctx;

    context.save();
    context.fillStyle = '#ffffff';
    context.font = '700 12px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    meta.data.forEach((arc, index) => {
      const value = Number(values[index]);
      if (!Number.isFinite(value) || value <= 0) return;
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const radius = arc.outerRadius * 0.56;
      const point = {
        x: arc.x + Math.cos(angle) * radius,
        y: arc.y + Math.sin(angle) * radius
      };
      if (
        chart.canvas?.id === 'contractedChart' &&
        normalized(chart.data.labels?.[index]) === 'hold'
      ) {
        point.x += 1;
        point.y -= 5;
      }
      context.fillText(value.toLocaleString('en-IN'), point.x, point.y);
    });

    context.restore();
  }
};

function drawChart(id, type, field, options = {}) {
  const canvas = $(id);
  if (!canvas) return;

  const groups = groupedCounts(field, options);
  const container = canvas.parentElement;
  const total = state.filteredRows.length;

  if (state.charts[id]) {
    state.charts[id].destroy();
    delete state.charts[id];
  }

  if (type === 'pie') {
    canvas.style.display = 'block';
    container.classList.remove('count-card-wrap');
    container.querySelector('.count-card-scroller')?.remove();
    const colors = groups.map((item, index) => {
      if (id === 'contractedChart') {
        const categoryColors = {
          hold: '#a675ff',
          keep: '#78e7f0',
          remove: '#4f3d7d'
        };
        return categoryColors[normalized(item[0])] || chartColors(groups.length)[index];
      }
      return chartColors(groups.length)[index];
    });
    state.charts[id] = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: groups.map(item => item[0]),
        datasets: [{
          data: groups.map(item => item[1]),
          backgroundColor: colors,
          borderColor: '#11151d',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: id === 'subjectiveConvictionChart'
            ? { bottom: 20 }
            : 0
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#b7c0ce',
              font: { size: 10 },
              boxWidth: 10,
              padding: 8,
              ...(id === 'subjectiveConvictionChart' ? {
                generateLabels: chart => {
                  const baseLabels = Chart.overrides.pie.plugins.legend.labels.generateLabels(chart);
                  const order = ['original', 'dumper'];
                  return baseLabels.sort((a, b) => {
                    const aIndex = order.indexOf(normalized(a.text));
                    const bIndex = order.indexOf(normalized(b.text));
                    return (aIndex < 0 ? order.length : aIndex) -
                      (bIndex < 0 ? order.length : bIndex);
                  });
                }
              } : {})
            }
          },
          tooltip: {
            callbacks: {
              label: context => ` ${context.label}: ${context.raw}`
            }
          }
        }
      },
      plugins: [PIE_VALUE_LABELS_PLUGIN]
    });
    return;
  }

  canvas.style.display = 'none';
  container.classList.add('count-card-wrap');
  container.classList.toggle(
    'count-card-compact',
    ['overallConvictionChart', 'classificationChart'].includes(id)
  );
  container.parentElement?.classList.toggle(
    'chart-card-count-rows',
    ['overallConvictionChart', 'classificationChart'].includes(id)
  );
  container.classList.toggle(
    'count-card-three-columns',
    id === 'classificationChart'
  );
  container.classList.toggle(
    'count-card-two-columns',
    id === 'overallConvictionChart'
  );
  let scroller = container.querySelector('.count-card-scroller');
  if (!scroller) {
    scroller = document.createElement('div');
    container.appendChild(scroller);
  }
  scroller.className = 'count-card-scroller';
  scroller.setAttribute('role', 'list');
  scroller.setAttribute('aria-label', `${field} counts`);
  scroller.innerHTML = `
      ${groups.length ? groups.map(([label, count], index) => {
        const percentage = total ? (count / total) * 100 : 0;
        const color = chartColors(groups.length)[index];
        return `
          <article class="count-card" role="listitem" style="--count-card-color: ${color}">
            <div class="count-card-label" title="${escapeHTML(label)}">${escapeHTML(label)}</div>
            <div class="count-card-metric">
              <strong class="count-card-value">${count.toLocaleString('en-IN')}</strong>
              <span class="count-card-share">(${percentage.toFixed(1)}% of view)</span>
            </div>
          </article>
        `;
      }).join('') : '<div class="count-card-empty">No values in view</div>'}
  `;
}

function updateCharts() {
  drawChart(
    'overallConvictionChart',
    'bar',
    'PPV Tag',
    {
      horizontal: true,
      excludeBlank: true,
      sortCountDescending: true,
      excludeValues: state.operationalScope === 'all-others'
        ? ['null', 'no_change', 'not_found', 'not found']
        : ['null', 'no_change', 'not_found', 'not found', 'testing_p1', 'testing_p2']
    }
  );

  drawChart(
    'subjectiveConvictionChart',
    'pie',
    'Dumper vs Original',
    { horizontal: true, excludeBlank: true }
  );

  drawChart(
    'contractedChart',
    'pie',
    'Category',
    {
      excludeBlank: true,
      horizontal: true
    }
  );

  drawChart(
    'classificationChart',
    'bar',
    'Classification',
    { horizontal: true, excludeBlank: true, sortCountDescending: true }
  );
}
