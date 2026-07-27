/* ================================================================
   BearingIQ — analysis.js
   Statistics tables, box plots, correlation heatmap, radar chart
   ================================================================ */

const { apiFetch, fmt, FAULT_META, FEATURES, exportTableCSV, showToast, lerpColor } = window.BIQ;

let statsData = null, corrData = null, modelInfo = null;
let boxChart = null, radarChart = null;

const STAT_COLS = ['mean','median','std','min','max','skewness','kurtosis','q25','q75'];
const COL_LABELS = {
  mean:'Mean', median:'Median', std:'Std Dev',
  min:'Min', max:'Max', skewness:'Skewness',
  kurtosis:'Kurtosis', q25:'Q25', q75:'Q75'
};

const initAnalysis = async () => {
  renderFeatureTabs();
  await Promise.all([loadStats(), loadModelInfo()]);
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalysis);
} else {
  initAnalysis();
}

// ── Load statistics ──────────────────────────────────────────
async function loadStats() {
  try {
    statsData = await apiFetch('/stats');
    corrData  = await apiFetch('/correlation');
    renderSummaryCards(statsData.overall);
    renderStatsTable('max');
    renderCorrelationHeatmap(corrData);
    renderBoxPlot('max');
    renderRadarChart();
  } catch (e) {
    document.getElementById('stats-container').innerHTML =
      '<div class="alert alert-danger">⚠️ Backend not connected. Start Flask server first.</div>';
  }
}

async function loadModelInfo() {
  try {
    modelInfo = await apiFetch('/model/info');
  } catch(e) {}
}

// ── Feature tabs ─────────────────────────────────────────────
function renderFeatureTabs() {
  const container = document.getElementById('feature-tabs');
  if (!container) return;
  container.innerHTML = FEATURES.map((f, i) => `
    <button class="feat-tab ${i === 0 ? 'active' : ''}" data-feat="${f}"
            onclick="switchFeature('${f}', this)">${f}</button>
  `).join('');
}

function switchFeature(feat, btn) {
  document.querySelectorAll('.feat-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderStatsTable(feat);
  renderBoxPlot(feat);
}

// ── Summary cards (overall stats) ───────────────────────────
function renderSummaryCards(overall) {
  const container = document.getElementById('summary-cards');
  if (!container || !overall) return;

  const highlights = [
    { feat:'rms',      stat:'mean',  label:'Avg. RMS (all)',    suffix:' g' },
    { feat:'kurtosis', stat:'max',   label:'Peak Kurtosis',     suffix:''   },
    { feat:'crest',    stat:'mean',  label:'Avg. Crest Factor', suffix:''   },
    { feat:'sd',       stat:'mean',  label:'Avg. Std Dev',      suffix:' g' },
    { feat:'skewness', stat:'mean',  label:'Mean Skewness',     suffix:''   },
    { feat:'rms',      stat:'max',   label:'Max RMS Seen',      suffix:' g' },
  ];

  container.innerHTML = highlights.map(h => {
    const val = overall[h.feat]?.[h.stat];
    return `
      <div class="summary-card anim-fade-in-up">
        <div class="summary-card-label">${h.label}</div>
        <div class="summary-card-value">${fmt(val, 4)}${h.suffix}</div>
        <div class="summary-card-sub">${h.feat} → ${h.stat}</div>
      </div>
    `;
  }).join('');
}

// ── Per-class statistics table ───────────────────────────────
function renderStatsTable(activeFeat) {
  if (!statsData) return;
  const container = document.getElementById('stats-table-wrap');
  if (!container) return;

  const perClass = statsData.per_class;
  const classes  = Object.keys(perClass);

  // Collect values for heat coloring
  const allVals = {};
  STAT_COLS.forEach(col => {
    allVals[col] = classes.map(cls => perClass[cls][activeFeat]?.[col] ?? 0);
  });

  const rows = classes.map(cls => {
    const row = perClass[cls][activeFeat] || {};
    const m = FAULT_META[cls] || {};
    const cells = STAT_COLS.map(col => {
      const v = row[col] ?? 0;
      const arr = allVals[col];
      const minV = Math.min(...arr), maxV = Math.max(...arr);
      const t = maxV !== minV ? (v - minV) / (maxV - minV) : 0;
      const bg = lerpColor('#F0F4FF', '#4F46E5', t * 0.6);
      const color = t > 0.5 ? '#fff' : 'var(--clr-text)';
      return `<td class="heat-cell" style="background:${bg};color:${color}">${fmt(v, 5)}</td>`;
    });

    return `
      <tr>
        <td class="td-label">
          <span style="display:inline-flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;
              background:${m.color||'#999'};flex-shrink:0"></span>
            ${m.label || cls}
          </span>
        </td>
        ${cells.join('')}
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="stats-table-wrap">
      <table class="stats-table">
        <thead>
          <tr>
            <th>Fault Class</th>
            ${STAT_COLS.map(c => `<th>${COL_LABELS[c]}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="heatmap-legend">
      <span>Low</span>
      <div class="heatmap-gradient"></div>
      <span>High</span>
      <span style="margin-left:auto;font-size:.72rem">Feature: <strong>${activeFeat}</strong></span>
    </div>
  `;
}

// ── Box Plot (violin-style approximation) ────────────────────
function renderBoxPlot(feat) {
  if (!statsData) return;
  const ctx = document.getElementById('boxPlotChart');
  if (!ctx) return;
  if (boxChart) boxChart.destroy();

  const perClass = statsData.per_class;
  const classes  = Object.keys(perClass);

  const datasets = [{
    label: 'Mean',
    data: classes.map(cls => perClass[cls][feat]?.mean ?? 0),
    backgroundColor: classes.map(cls => (FAULT_META[cls]?.color || '#999') + 'CC'),
    borderColor:     classes.map(cls => FAULT_META[cls]?.color || '#999'),
    borderWidth: 2,
    borderRadius: 8,
    borderSkipped: false,
  }];

  // Error bars via max/min overlay
  const errorData = classes.map(cls => ({
    x: cls,
    y: perClass[cls][feat]?.mean ?? 0,
    yMin: perClass[cls][feat]?.q25 ?? 0,
    yMax: perClass[cls][feat]?.q75 ?? 0,
  }));

  boxChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: classes.map(cls => FAULT_META[cls]?.label || cls),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => classes[items[0].dataIndex],
            label: ctx => {
              const cls  = classes[ctx.dataIndex];
              const row  = perClass[cls][feat] || {};
              return [
                ` Mean: ${fmt(row.mean, 5)}`,
                ` Std:  ${fmt(row.std, 5)}`,
                ` Min:  ${fmt(row.min, 5)}`,
                ` Max:  ${fmt(row.max, 5)}`,
                ` Q25:  ${fmt(row.q25, 5)}`,
                ` Q75:  ${fmt(row.q75, 5)}`,
              ];
            }
          },
          backgroundColor: '#fff',
          titleColor: '#0F172A',
          bodyColor: '#334155',
          borderColor: '#E2E8F8',
          borderWidth: 2,
          padding: 14,
          titleFont: { weight: 700 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#334155', font: { size: 10, weight: 600 }, maxRotation: 35 },
          border: { display: false }
        },
        y: {
          grid: { color: '#E2E8F8', drawBorder: false },
          ticks: { color: '#94A3B8', font: { size: 11 } },
          border: { display: false },
          title: { display: true, text: feat, color: '#64748B', font: { weight: 700 } }
        }
      },
      animation: { duration: 600, easing: 'easeOutCubic' }
    }
  });
}

// ── Correlation Heatmap ──────────────────────────────────────
function renderCorrelationHeatmap(corr) {
  const container = document.getElementById('corr-heatmap');
  if (!container || !corr.matrix) return;

  const feats  = corr.features;
  const matrix = corr.matrix;
  const n = feats.length;

  // Canvas-based heatmap
  const canvas = document.createElement('canvas');
  canvas.width  = 400;
  canvas.height = 400;
  canvas.style.cssText = 'width:100%;height:100%;border-radius:8px;';
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const cell = 400 / n;
  const padding = 50;
  const size = (400 - padding) / n;

  ctx.fillStyle = '#F8FAFF';
  ctx.fillRect(0, 0, 400, 400);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const val = matrix[i][j];
      const t   = (val + 1) / 2; // -1..1 → 0..1
      const r   = Math.round(220 - t * 150);
      const g   = Math.round(50  + t * 150);
      const b   = Math.round(50  + t * 180);
      ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
      ctx.beginPath();
      ctx.roundRect(padding + j * size + 2, padding + i * size + 2, size - 4, size - 4, 4);
      ctx.fill();

      ctx.fillStyle = Math.abs(val) > 0.5 ? '#fff' : '#334155';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.toFixed(2), padding + j * size + size/2, padding + i * size + size/2);
    }
  }

  // Labels
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillStyle = '#64748B';
  feats.forEach((f, i) => {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(f, padding - 6, padding + i * size + size/2);
    ctx.save();
    ctx.translate(padding + i * size + size/2, padding - 6);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(f, 0, 0);
    ctx.restore();
  });
}

// ── Radar Chart (per-class mean values) ─────────────────────
function renderRadarChart() {
  if (!statsData) return;
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  if (radarChart) radarChart.destroy();

  const classes   = Object.keys(statsData.per_class);
  const radarFeats = ['rms', 'kurtosis', 'skewness', 'crest', 'sd'];

  // Normalize each feature to 0–1
  const allVals = {};
  radarFeats.forEach(f => {
    const vals = classes.map(cls => statsData.per_class[cls][f]?.mean ?? 0);
    allVals[f] = { min: Math.min(...vals), max: Math.max(...vals), vals };
  });

  const normalize = (v, f) => {
    const { min, max } = allVals[f];
    return max !== min ? (v - min) / (max - min) : 0;
  };

  // Only show 5 classes for readability
  const shown = ['Normal_1', 'Ball_021_1', 'IR_021_1', 'OR_021_6_1', 'Ball_007_1'];

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: radarFeats.map(f => f.toUpperCase()),
      datasets: shown.map(cls => {
        const m    = FAULT_META[cls] || {};
        const data = radarFeats.map(f =>
          normalize(statsData.per_class[cls][f]?.mean ?? 0, f)
        );
        return {
          label: m.label || cls,
          data,
          backgroundColor: (m.color || '#999') + '22',
          borderColor:     m.color || '#999',
          borderWidth: 2.5,
          pointBackgroundColor: m.color || '#999',
          pointRadius: 4,
          pointHoverRadius: 6,
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 16, color: '#334155' }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(1)}% (normalized)`
          }
        }
      },
      scales: {
        r: {
          min: 0, max: 1,
          ticks: { display: false },
          grid: { color: '#E2E8F8' },
          pointLabels: {
            color: '#334155',
            font: { size: 12, weight: 700, family: 'JetBrains Mono, monospace' }
          }
        }
      },
      animation: { duration: 800 }
    }
  });
}

// ── Export ───────────────────────────────────────────────────
document.getElementById('btn-export')?.addEventListener('click', () => {
  const table = document.querySelector('.stats-table');
  if (table) exportTableCSV(table, 'bearing_statistics.csv');
  else showToast('No table to export', 'warning');
});

// ── Box plot feature select ──────────────────────────────────
document.getElementById('boxplot-feat-select')?.addEventListener('change', e => {
  renderBoxPlot(e.target.value);
});
