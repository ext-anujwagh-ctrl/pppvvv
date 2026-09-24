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

    if (field === 'PPV Tag' && !rawValue && options.excludeBlank) {
      return;
    }

    let value = rawValue || '(Blank)';

    if (
      field === 'Priority' &&
      (!rawValue ||
        normalizedValue === 'na' ||
        normalizedValue === 'not found')
    ) {
      value = 'NA / Not found';
    }

    value = chartDisplayLabel(value);
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => {
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
    '#55c5d6',
    '#6da7f5',
    '#e4b65c',
    '#55c99b',
    '#8c9bea',
    '#73c0a4',
    '#b5a0e6',
    '#78a8c7',
    '#d08d78',
    '#8c99aa'
  ];

  return Array.from(
    { length },
    (_, index) => colors[index % colors.length]
  );
}

function drawChart(id, type, field, options = {}) {
  if (typeof Chart === 'undefined') return;

  const canvas = $(id);
  const groups = groupedCounts(field, options);
  const horizontal = Boolean(options.horizontal);

  const labels = groups.map(item => item[0]);
  const data = groups.map(item => item[1]);

  if (state.charts[id]) {
    state.charts[id].destroy();
  }

  state.charts[id] = new Chart(canvas, {
    type,

    data: {
      labels,

      datasets: [
        {
          data,
          backgroundColor: chartColors(data.length),
          borderColor:
            type === 'bar'
              ? '#ff5964'
              : '#11151d',
          borderWidth: type === 'bar' ? 0 : 2,
          borderRadius: type === 'bar' ? 5 : 0,
          barPercentage: .72
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',

      animation: {
        duration: 250
      },

      plugins: {
        legend: {
          display: type === 'pie',
          position: 'bottom',

          labels: {
            color: '#b7c0ce',

            font: {
              size: 10
            },

            boxWidth: 10,
            padding: 8
          }
        },

        tooltip: {
          callbacks: {
            label: context =>
              ` ${context.label}: ${context.raw}`
          }
        }
      },

      scales:
        type === 'bar'
          ? horizontal
            ? {
                x: {
                  beginAtZero: true,

                  ticks: {
                    color: '#8e98a9',

                    font: {
                      size: 10
                    },

                    precision: 0
                  },

                  grid: {
                    color: '#293140'
                  }
                },

                y: {
                  ticks: {
                    color: '#b7c0ce',

                    font: {
                      size: 10
                    }
                  },

                  grid: {
                    display: false
                  }
                }
              }
            : {
                x: {
                  ticks: {
                    color: '#8e98a9',

                    font: {
                      size: 10
                    },

                    maxRotation: 35,
                    minRotation: 0
                  },

                  grid: {
                    display: false
                  }
                },

                y: {
                  beginAtZero: true,

                  ticks: {
                    color: '#8e98a9',

                    font: {
                      size: 10
                    },

                    precision: 0
                  },

                  grid: {
                    color: '#293140'
                  }
                }
              }
          : {}
    }
  });
}

function updateCharts() {
  drawChart(
    'overallConvictionChart',
    'bar',
    'Classification',
    { horizontal: true }
  );

  drawChart(
    'subjectiveConvictionChart',
    'bar',
    'Category',
    { horizontal: true }
  );

  drawChart(
    'contractedChart',
    'bar',
    'PPV Tag',
    {
      excludeBlank: true,
      horizontal: true
    }
  );

  drawChart(
    'priorityChart',
    'bar',
    'Priority',
    { horizontal: true }
  );
}
