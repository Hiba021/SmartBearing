/* ================================================================
   BearingIQ — dashboard.js
   Overview page: KPIs, donut chart, feature importance, class list
   ================================================================ */

const { apiFetch, animateCounter, fmt, fmtPct, FAULT_META, showToast } = window.BIQ;

let classData = null, modelInfo = null;
let donutChart = null, importanceChart = null;

// ── Bootstrap ────────────────────────────────────────────────
const initDashboard = async () => {
  await Promise.all([loadClasses(), loadModelInfo()]);
  renderPredictionFeed();
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

// ── Load class distribution ──────────────────────────────────
async function loadClasses() {
  try {
    const data = await apiFetch('/classes');
    classData = data;
    renderKPIs(data);
    renderDonutChart(data.classes);
    renderClassList(data.classes);
  } catch (e) {
    document.getElementById('kpi-grid').innerHTML =
      '<div class="alert alert-danger" style="grid-column:1/-1">⚠️ Could not connect to backend. Make sure Flask is running on port 5000.</div>';
  }
}

// ── Load model info ──────────────────────────────────────────
async function loadModelInfo() {
  try {
    const data = await apiFetch('/model/info');
    modelInfo = data;
    renderModelCards(data);
    renderImportanceChart(data.feature_importances);
  } catch (e) {
    console.warn('Model info not yet available');
  }
}

// ── KPI Cards ────────────────────────────────────────────────
function renderKPIs(data) {
  const rf = modelInfo?.random_forest || {};
  const kpis = [
    {
      id: 'kpi-samples', label: 'Total Samples', value: data.total,
      change: '10 balanced classes', icon: '📊', accent: '#4F46E5'
    },
    {
      id: 'kpi-classes', label: 'Fault Classes', value: data.classes.length,
      change: '3 types + Normal', icon: '🔧', accent: '#8B5CF6'
    },
    {
      id: 'kpi-accuracy', label: 'RF Accuracy', value: rf.accuracy ? (rf.accuracy * 100).toFixed(1) : '—',
      change: rf.cv_mean ? `CV: ${(rf.cv_mean*100).toFixed(1)}% ±${(rf.cv_std*100).toFixed(1)}%` : 'Cross-validated',
      icon: '🎯', accent: '#10B981', isPercent: true
    },
    {
      id: 'kpi-features', label: 'Signal Features', value: data.features.length,
      change: 'Time-domain descriptors', icon: '📈', accent: '#F59E0B'
    },
  ];

  document.getElementById('kpi-grid').innerHTML = kpis.map((k, i) => `
    <div class="kpi-card anim-fade-in-up delay-${i+1}"
         style="--kpi-accent:${k.accent}">
      <span class="kpi-icon">${k.icon}</span>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">
        <span id="${k.id}" class="counter">0</span>${k.isPercent ? '<span class="kpi-unit">%</span>' : ''}
      </div>
      <div class="kpi-change" style="color:${k.accent}">${k.change}</div>
    </div>
  `).join('');

  // Animate counters
  kpis.forEach(k => {
    const el = document.getElementById(k.id);
    if (el && !k.isPercent) animateCounter(el, parseFloat(k.value), 1000);
    else if (el && k.isPercent) animateCounter(el, parseFloat(k.value), 1000, 1);
  });
}

// ── Donut Chart ──────────────────────────────────────────────
function renderDonutChart(classes) {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;
  if (donutChart) donutChart.destroy();

  const labels = classes.map(c => FAULT_META[c.class]?.label || c.class);
  const colors = classes.map(c => c.color);

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: classes.map(c => c.count),
        backgroundColor: colors,
        borderColor: colors.map(c => c + 'CC'),
        borderWidth: 2,
        hoverOffset: 12,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.formattedValue} samples (${(ctx.parsed / 2300 * 100).toFixed(1)}%)`
          },
          backgroundColor: '#fff',
          titleColor: '#0F172A',
          bodyColor: '#334155',
          borderColor: '#E2E8F8',
          borderWidth: 2,
          padding: 12,
          boxPadding: 4,
          titleFont: { weight: 700 },
        }
      },
      animation: { animateScale: true, animateRotate: true, duration: 1000 }
    }
  });
}

// ── Class List ───────────────────────────────────────────────
function renderClassList(classes) {
  const maxCount = Math.max(...classes.map(c => c.count));
  document.getElementById('class-list').innerHTML = classes.map(c => {
    const meta = FAULT_META[c.class] || {};
    const pct = ((c.count / maxCount) * 100).toFixed(0);
    return `
      <div class="class-row" style="--row-color:${c.color}">
        <div class="class-dot" style="background:${c.color}; --dot-color:${c.color}"></div>
        <span class="class-name">${meta.label || c.class}</span>
        <span class="class-count">${c.count}</span>
        <div class="class-bar-wrap">
          <div class="progress-bar"><div class="progress-fill"
            style="width:${pct}%; background:${c.color}"></div></div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Model Cards ──────────────────────────────────────────────
function renderModelCards(data) {
  const rf  = data.random_forest;
  const svm = data.svm;
  document.getElementById('model-cards').innerHTML = `
    <div class="model-card anim-scale-in delay-1">
      <div class="model-card-label">🌲 Random Forest</div>
      <div class="model-card-acc" id="rf-acc">0%</div>
      <div class="model-card-cv">CV: ${(rf.cv_mean*100).toFixed(1)}% ± ${(rf.cv_std*100).toFixed(2)}%</div>
      <div style="margin-top:8px">
        <div style="font-size:.7rem;color:var(--clr-text-muted);margin-bottom:4px">F1 (weighted)</div>
        <div style="font-size:1rem;font-weight:700;color:var(--clr-normal)">${(rf.f1_weighted*100).toFixed(1)}%</div>
      </div>
    </div>
    <div class="model-card anim-scale-in delay-2">
      <div class="model-card-label">⚡ SVM (RBF)</div>
      <div class="model-card-acc" id="svm-acc">0%</div>
      <div class="model-card-cv">CV: ${(svm.cv_mean*100).toFixed(1)}% ± ${(svm.cv_std*100).toFixed(2)}%</div>
      <div style="margin-top:8px">
        <div style="font-size:.7rem;color:var(--clr-text-muted);margin-bottom:4px">F1 (weighted)</div>
        <div style="font-size:1rem;font-weight:700;color:var(--clr-outer)">${(svm.f1_weighted*100).toFixed(1)}%</div>
      </div>
    </div>
  `;
  setTimeout(() => {
    animateCounter(document.getElementById('rf-acc'),  rf.accuracy  * 100, 1000, 1);
    animateCounter(document.getElementById('svm-acc'), svm.accuracy * 100, 1000, 1);
    document.getElementById('rf-acc').insertAdjacentHTML('afterend', '<span class="kpi-unit" style="font-size:1rem">%</span>');
  }, 200);
}

// ── Feature Importance Chart ─────────────────────────────────
function renderImportanceChart(importances) {
  const ctx = document.getElementById('importanceChart');
  if (!ctx) return;
  if (importanceChart) importanceChart.destroy();

  const sorted = Object.entries(importances)
    .sort((a, b) => b[1] - a[1]);

  const labels = sorted.map(([k]) => k);
  const values = sorted.map(([, v]) => (v * 100));
  const colors = ['#4F46E5','#7C3AED','#8B5CF6','#10B981','#F59E0B','#F97316','#3B82F6','#06B6D4','#EC4899'];

  importanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` Importance: ${ctx.formattedValue}%`
          },
          backgroundColor: '#fff',
          titleColor: '#0F172A',
          bodyColor: '#334155',
          borderColor: '#E2E8F8',
          borderWidth: 2,
          padding: 12,
        }
      },
      scales: {
        x: {
          grid: { color: '#E2E8F8', drawBorder: false },
          ticks: { callback: v => v + '%', color: '#94A3B8', font: { size: 11 } },
          border: { display: false }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#334155',
            font: { size: 12, weight: 700, family: "'JetBrains Mono', monospace" }
          },
          border: { display: false }
        }
      },
      animation: { duration: 800, easing: 'easeOutCubic' }
    }
  });
}

// ── Prediction Feed ──────────────────────────────────────────
function renderPredictionFeed() {
  // Seed some demo predictions until live ones come in
  const demos = [
    { cls: 'Normal_1',   conf: 0.97, time: '2 min ago' },
    { cls: 'Ball_007_1', conf: 0.89, time: '8 min ago' },
    { cls: 'IR_014_1',   conf: 0.94, time: '15 min ago' },
    { cls: 'OR_021_6_1', conf: 0.88, time: '22 min ago' },
  ];
  const feed = document.getElementById('prediction-feed');
  if (!feed) return;

  feed.innerHTML = demos.map((d, i) => {
    const m = FAULT_META[d.cls];
    return `
      <div class="prediction-item" style="animation-delay:${i * 0.08}s">
        <div class="pred-icon" style="background:${m.color}22; font-size:1.2rem">${m.icon}</div>
        <div class="pred-info">
          <div class="pred-class" style="color:${m.color}">${m.label}</div>
          <div class="pred-time">${d.time}</div>
        </div>
        <div class="pred-conf" style="color:${m.color}">${(d.conf*100).toFixed(1)}%</div>
      </div>
    `;
  }).join('');
}

// ── Quick action navigation ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-navigate]').forEach(el => {
    el.addEventListener('click', () => {
      window.location.href = el.dataset.navigate;
    });
  });
});
