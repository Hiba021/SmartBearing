/* ================================================================
   BearingIQ — predict.js
   Custom input sliders, live prediction, probability bars,
   sensitivity analysis, modify & re-predict
   ================================================================ */

const {
  apiFetch, fmt, fmtPct, FAULT_META, FEATURES,
  FEATURE_INFO, PRESETS, showToast, setLoading, lerpColor
} = window.BIQ;

let currentModel   = 'random_forest';
let currentValues  = [0.36, -0.28, 0.018, 0.110, 0.112, 0.02, -0.04, 3.18, 6.96];
let lastPrediction = null;
let sensitivityChart = null;

const initPredict = () => {
  buildSliders();
  buildPresets();
  setupModelToggle();
  setupActions();
  updateAllSliders();
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPredict);
} else {
  initPredict();
}

// ── Build feature sliders ────────────────────────────────────
function buildSliders() {
  const container = document.getElementById('feature-sliders');
  if (!container) return;

  container.innerHTML = FEATURES.map((feat, i) => {
    const info = FEATURE_INFO[feat];
    const val  = currentValues[i];
    return `
      <div class="feature-input-row" id="row-${feat}">
        <label class="feature-input-label" for="slider-${feat}">
          ${feat}
          <span class="feature-input-desc">${info.desc}</span>
        </label>
        <input type="range" id="slider-${feat}"
               min="${info.min}" max="${info.max}"
               step="${getStep(feat)}" value="${val}"
               oninput="syncSlider('${feat}', this.value, false)">
        <input type="number" id="num-${feat}"
               class="feature-number-input"
               min="${info.min}" max="${info.max}"
               step="${getStep(feat)}" value="${val}"
               oninput="syncSlider('${feat}', this.value, true)">
      </div>
    `;
  }).join('');
}

function getStep(feat) {
  return ['kurtosis','skewness'].includes(feat) ? 0.01 :
         ['mean'].includes(feat) ? 0.001 : 0.001;
}

function syncSlider(feat, value, fromNumber) {
  const idx = FEATURES.indexOf(feat);
  currentValues[idx] = parseFloat(value) || 0;

  const slider = document.getElementById(`slider-${feat}`);
  const numIn  = document.getElementById(`num-${feat}`);
  const info   = FEATURE_INFO[feat];

  if (fromNumber) slider.value = value;
  else numIn.value = parseFloat(value).toFixed(4);

  // Update slider gradient
  const pct = ((parseFloat(value) - info.min) / (info.max - info.min)) * 100;
  slider.style.setProperty('--pct', `${Math.max(0, Math.min(100, pct))}%`);
}

function updateAllSliders() {
  FEATURES.forEach((feat, i) => {
    syncSlider(feat, currentValues[i], true);
    syncSlider(feat, currentValues[i], false);
  });
}

// ── Presets ──────────────────────────────────────────────────
function buildPresets() {
  const container = document.getElementById('presets-grid');
  if (!container) return;

  const items = [
    { cls: 'Normal_1',   label: '✅ Normal',    color: '#10B981', bg: '#D1FAE5' },
    { cls: 'Ball_007_1', label: '⚠️ Ball-L',   color: '#F59E0B', bg: '#FEF3C7' },
    { cls: 'Ball_021_1', label: '🔴 Ball-H',   color: '#EF4444', bg: '#FEE2E2' },
    { cls: 'IR_014_1',   label: '🔶 IR-M',     color: '#8B5CF6', bg: '#EDE9FE' },
    { cls: 'IR_021_1',   label: '🔴 IR-H',     color: '#6D28D9', bg: '#EDE9FE' },
    { cls: 'OR_007_6_1', label: '⚠️ OR-L',    color: '#3B82F6', bg: '#DBEAFE' },
    { cls: 'OR_021_6_1', label: '🔴 OR-H',    color: '#1D4ED8', bg: '#DBEAFE' },
    { cls: 'Ball_014_1', label: '🔶 Ball-M',  color: '#F97316', bg: '#FFEDD5' },
    { cls: 'IR_007_1',   label: '⚠️ IR-L',    color: '#7C3AED', bg: '#EDE9FE' },
    { cls: 'OR_014_6_1', label: '🔶 OR-M',    color: '#2563EB', bg: '#DBEAFE' },
  ];

  container.innerHTML = items.map(item => `
    <button class="preset-btn"
            style="color:${item.color};border-color:${item.color};background:${item.bg}"
            onclick="loadPreset('${item.cls}')"
            title="Load ${item.label} example">
      ${item.label}
    </button>
  `).join('');
}

function loadPreset(cls) {
  const vals = PRESETS[cls];
  if (!vals) return;
  currentValues = [...vals];
  updateAllSliders();
  showToast(`Loaded example: ${FAULT_META[cls]?.label}`, 'info', 1500);
}

// ── Model toggle ─────────────────────────────────────────────
function setupModelToggle() {
  document.querySelectorAll('.model-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentModel = btn.dataset.model;
      if (lastPrediction) runPrediction(); // re-predict
    });
  });
}

// ── Predict button ───────────────────────────────────────────
function setupActions() {
  const btn = document.getElementById('btn-predict');
  btn?.addEventListener('click', runPrediction);

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    currentValues = [0.28, -0.26, 0.011, 0.087, 0.088, 0.02, -0.04, 3.18, 6.96];
    updateAllSliders();
    resetResultPanel();
    showToast('Reset to Normal defaults', 'info', 1500);
  });

  document.getElementById('btn-sensitivity')?.addEventListener('click', runSensitivity);

  document.getElementById('sens-feat-select')?.addEventListener('change', () => {
    if (lastPrediction) runSensitivity();
  });
}

// ── Run prediction ───────────────────────────────────────────
async function runPrediction() {
  const btn = document.getElementById('btn-predict');
  setLoading(btn, true);

  try {
    const result = await apiFetch('/predict', {
      method: 'POST',
      body: JSON.stringify({ features: currentValues, model: currentModel })
    });

    lastPrediction = result;
    renderResult(result);
    showToast(`Predicted: ${result.label}`, 'success', 2000);
  } catch (e) {
    showToast('Prediction failed — is the backend running?', 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ── Render result ────────────────────────────────────────────
function renderResult(result) {
  const panel = document.getElementById('result-panel');
  if (!panel) return;

  const m         = FAULT_META[result.predicted_class] || {};
  const sevColors = { 0: '#10B981', 1: '#F59E0B', 2: '#F97316', 3: '#EF4444' };
  const sevLabels = { 0: 'Healthy', 1: 'Low', 2: 'Moderate', 3: 'Critical' };
  const sevColor  = sevColors[result.severity] || '#999';
  const confPct   = (result.confidence * 100).toFixed(1);

  // Top card
  document.getElementById('result-hero').style.background =
    `linear-gradient(135deg, ${m.color || '#4F46E5'}18, ${m.color || '#4F46E5'}10)`;

  document.getElementById('result-icon').textContent    = m.icon || '🔧';
  document.getElementById('result-class-name').textContent = result.label || result.predicted_class;
  document.getElementById('result-class-name').style.color = m.color || '#333';
  document.getElementById('result-conf-pct').textContent  = confPct + '%';
  document.getElementById('result-conf-pct').style.color  = m.color || '#333';

  // Severity dots
  const dotsEl = document.getElementById('severity-dots');
  if (dotsEl) {
    dotsEl.innerHTML = [1,2,3].map(lvl => `
      <div class="sev-dot ${lvl <= result.severity ? 'active' : ''}"
           style="--dot-color:${sevColor}"></div>
    `).join('');
  }
  const sevTextEl = document.getElementById('severity-text');
  if (sevTextEl) {
    sevTextEl.textContent = sevLabels[result.severity] || 'Unknown';
    sevTextEl.style.color = sevColor;
  }

  // Probability bars (all classes)
  const probList = document.getElementById('prob-list');
  if (probList) {
    const sorted = Object.entries(result.all_probabilities)
      .sort((a, b) => b[1] - a[1]);

    probList.innerHTML = sorted.map(([cls, prob]) => {
      const cm  = FAULT_META[cls] || {};
      const pct = (prob * 100).toFixed(1);
      const isTop = cls === result.predicted_class;
      return `
        <div class="prob-row" style="opacity:${isTop ? 1 : 0.65}">
          <div class="prob-header">
            <span class="prob-class-name" style="color:${isTop ? cm.color : 'inherit'};
              font-weight:${isTop ? 700 : 500}">${cm.label || cls}</span>
            <span class="prob-pct" style="color:${isTop ? cm.color : 'inherit'}">${pct}%</span>
          </div>
          <div class="prob-bar-bg">
            <div class="prob-bar-fill"
                 style="width:${pct}%; background:${cm.color || '#4F46E5'}"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function resetResultPanel() {
  document.getElementById('result-hero').style.background = '';
  document.getElementById('result-icon').textContent = '🔮';
  document.getElementById('result-class-name').textContent = 'Run a prediction';
  document.getElementById('result-class-name').style.color = 'var(--clr-text-muted)';
  document.getElementById('result-conf-pct').textContent = '—';
  document.getElementById('prob-list').innerHTML = `
    <div class="empty-state" style="padding:2rem">
      <span style="font-size:2rem;opacity:.3">📊</span>
      <p style="margin-top:.5rem;font-size:.85rem;color:var(--clr-text-muted)">
        Run a prediction to see class probabilities
      </p>
    </div>`;
  lastPrediction = null;
}

// ── Sensitivity Analysis ─────────────────────────────────────
async function runSensitivity() {
  const select  = document.getElementById('sens-feat-select');
  const featIdx = select ? parseInt(select.value) : 0;
  const ctx     = document.getElementById('sensitivityChart');
  if (!ctx) return;

  const btn = document.getElementById('btn-sensitivity');
  if (btn) setLoading(btn, true);

  try {
    const result = await apiFetch('/sensitivity', {
      method: 'POST',
      body: JSON.stringify({ features: currentValues, feature_index: featIdx })
    });

    renderSensitivityChart(result);
  } catch (e) {
    showToast('Sensitivity analysis failed', 'error');
  } finally {
    if (btn) setLoading(btn, false);
  }
}

function renderSensitivityChart(data) {
  const ctx = document.getElementById('sensitivityChart');
  if (!ctx) return;
  if (sensitivityChart) sensitivityChart.destroy();

  // Color by predicted class
  const colors = data.predictions.map(cls => FAULT_META[cls]?.color || '#4F46E5');

  sensitivityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.values.map(v => v.toFixed(3)),
      datasets: [{
        label: 'Confidence',
        data: data.confidences.map(v => (v * 100)),
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79,70,229,.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => `${data.feature} = ${items[0].label}`,
            label: ctx => ` Confidence: ${ctx.parsed.y.toFixed(1)}%`,
            afterLabel: ctx => {
              const pred = data.predictions[ctx.dataIndex];
              const m    = FAULT_META[pred] || {};
              return ` Prediction: ${m.label || pred}`;
            }
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
          grid: { display: false },
          ticks: { maxTicksLimit: 8, color: '#94A3B8', font: { size: 10 } },
          title: {
            display: true, text: data.feature,
            color: '#64748B', font: { weight: 700 }
          }
        },
        y: {
          grid: { color: '#E2E8F8' },
          ticks: { callback: v => v + '%', color: '#94A3B8', font: { size: 11 } },
          title: {
            display: true, text: 'Prediction Confidence (%)',
            color: '#64748B', font: { weight: 700 }
          },
          min: 0, max: 100,
        }
      },
      animation: { duration: 500 }
    }
  });

  document.getElementById('sens-feat-name').textContent = data.feature;
}

// Populate sensitivity feature select
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('sens-feat-select');
  if (sel) {
    sel.innerHTML = FEATURES.map((f, i) =>
      `<option value="${i}">${f}</option>`
    ).join('');
  }
});
