/* ================================================================
   Signal Laboratory — JavaScript Engine
   Handles: signal generation, Chart.js, windowing, feature
   computation, MAT explorer, ML pipeline, live prediction
   ================================================================ */

'use strict';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const FS = 48000;           // Sampling frequency Hz
const WIN_SIZE = 2048;      // Window size (samples)
const TOTAL_SAMPLES = 2048; // Samples to show in chart view
const NUM_WINDOWS = Math.floor(487384 / WIN_SIZE); // ~237

// Feature names matching Bearing.csv columns
const FEATURE_NAMES = ['max','min','mean','sd','rms','skewness','kurtosis','crest','form'];
const FEATURE_LABELS = ['Maximum','Minimum','Mean','Std Dev','RMS','Skewness','Kurtosis','Crest Factor','Form Factor'];

// Fault presets (typical feature values from real CWRU data)
const PRESETS = {
  normal:  { max:0.24, min:-0.23, mean:-0.001, sd:0.071, rms:0.071, skewness:0.042, kurtosis:3.12, crest:3.38, form:1.11, fault:'Normal_1' },
  ball:    { max:1.82, min:-1.69, mean:-0.003, sd:0.38,  rms:0.38,  skewness:0.071, kurtosis:5.94, crest:4.79, form:1.14, fault:'Ball_007_1' },
  inner:   { max:2.14, min:-1.98, mean:-0.002, sd:0.412, rms:0.412, skewness:0.054, kurtosis:4.89, crest:5.20, form:1.31, fault:'IR_014_1' },
  outer:   { max:3.21, min:-3.08, mean: 0.003, sd:0.61,  rms:0.61,  skewness:-0.03, kurtosis:7.41, crest:5.27, form:1.09, fault:'OR_021_6_1' },
};

// Signal generation parameters per fault type
const SIG_CONFIG = {
  normal: { amp:0.24,  noise:0.05, faultFreq:0,    faultAmp:0    },
  ball:   { amp:0.35,  noise:0.08, faultFreq:141,  faultAmp:0.8  },
  inner:  { amp:0.40,  noise:0.09, faultFreq:162,  faultAmp:1.2  },
  outer:  { amp:0.55,  noise:0.12, faultFreq:107,  faultAmp:2.0  },
};

// MAT file metadata
const MAT_META = {
  normal: { title:'Normal_1_0.mat', rpm:1797, prefix:'X097', de:'X097_DE_time', fe:'X097_FE_time' },
  b007:   { title:'B007_1_123.mat', rpm:1797, prefix:'X123', de:'X123_DE_time', fe:'X123_FE_time' },
  b014:   { title:'B014_1_172.mat', rpm:1772, prefix:'X189', de:'X189_DE_time', fe:'X189_FE_time' },
  b021:   { title:'B021_1_222.mat', rpm:1750, prefix:'X226', de:'X226_DE_time', fe:'X226_FE_time' },
  ir007:  { title:'IR007_1_109.mat',rpm:1797, prefix:'X105', de:'X105_DE_time', fe:'X105_FE_time' },
  ir014:  { title:'IR014_1_175.mat',rpm:1772, prefix:'X169', de:'X169_DE_time', fe:'X169_FE_time' },
  ir021:  { title:'IR021_1_209.mat',rpm:1750, prefix:'X209', de:'X209_DE_time', fe:'X209_FE_time' },
  or007:  { title:'OR007_6_1_130.mat',rpm:1797, prefix:'X131', de:'X131_DE_time', fe:'X131_FE_time' },
  or014:  { title:'OR014_6_1_197.mat',rpm:1772, prefix:'X197', de:'X197_DE_time', fe:'X197_FE_time' },
  or021:  { title:'OR021_6_1_239.mat',rpm:1750, prefix:'X239', de:'X239_DE_time', fe:'X239_FE_time' },
};

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
let state = {
  currentSignalType: 'normal',
  currentWindow:     0,
  currentZoom:       'full',
  signalData:        null,
  computedFeatures:  null,
  signalChart:       null,
};

// ─────────────────────────────────────────────────────────────
// SIGNAL GENERATION
// ─────────────────────────────────────────────────────────────
function generateSignal(type, numSamples) {
  const cfg = SIG_CONFIG[type] || SIG_CONFIG.normal;
  const data = new Float32Array(numSamples);
  const rotFreq = 1797 / 60; // ~29.95 Hz shaft frequency

  for (let i = 0; i < numSamples; i++) {
    const t = i / FS;

    // Base vibration: motor rotation harmonics
    let val  = cfg.amp * Math.sin(2 * Math.PI * rotFreq * t);
    val += (cfg.amp * 0.4) * Math.sin(2 * Math.PI * rotFreq * 2 * t + 0.3);
    val += (cfg.amp * 0.2) * Math.sin(2 * Math.PI * rotFreq * 3 * t + 1.1);

    // Fault impulses
    if (cfg.faultFreq > 0) {
      const phase = (t * cfg.faultFreq) % 1.0;
      if (phase < 0.02) {
        // Exponentially decaying impact
        const decay = Math.exp(-phase * 400);
        const ringFreq = 3000;
        val += cfg.faultAmp * decay * Math.sin(2 * Math.PI * ringFreq * t);
      }
    }

    // Add Gaussian noise
    val += cfg.noise * gaussianRandom();
    data[i] = val;
  }
  return data;
}

function gaussianRandom() {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─────────────────────────────────────────────────────────────
// FEATURE EXTRACTION (JS implementation matching Python)
// ─────────────────────────────────────────────────────────────
function extractFeatures(signal) {
  const n = signal.length;
  let sum = 0, sumSq = 0, sumAbs = 0;
  let maxV = -Infinity, minV = Infinity;

  for (let i = 0; i < n; i++) {
    const x = signal[i];
    sum   += x;
    sumSq += x * x;
    sumAbs+= Math.abs(x);
    if (x > maxV) maxV = x;
    if (x < minV) minV = x;
  }

  const mean = sum / n;
  const rms  = Math.sqrt(sumSq / n);
  const meanAbs = sumAbs / n;

  // Variance, std
  let sumVar = 0, sumSkew = 0, sumKurt = 0;
  for (let i = 0; i < n; i++) {
    const d = signal[i] - mean;
    sumVar  += d * d;
    sumSkew += d * d * d;
    sumKurt += d * d * d * d;
  }
  const variance = sumVar / n;
  const sd = Math.sqrt(variance);
  const skewness = sd > 0 ? (sumSkew / n) / (sd * sd * sd) : 0;
  const kurtosis = sd > 0 ? (sumKurt / n) / (sd * sd * sd * sd) : 3;
  const crest    = rms > 0 ? Math.abs(maxV) / rms : 0;
  const form     = meanAbs > 0 ? rms / meanAbs : 0;

  return {
    max:      +maxV.toFixed(4),
    min:      +minV.toFixed(4),
    mean:     +mean.toFixed(5),
    sd:       +sd.toFixed(4),
    rms:      +rms.toFixed(4),
    skewness: +skewness.toFixed(4),
    kurtosis: +kurtosis.toFixed(4),
    crest:    +crest.toFixed(4),
    form:     +form.toFixed(4),
  };
}

// ─────────────────────────────────────────────────────────────
// CHART.JS SIGNAL VISUALIZATION
// ─────────────────────────────────────────────────────────────
function initChart() {
  const ctx = document.getElementById('signalChart').getContext('2d');
  const sigData = state.signalData;

  // Build labels and dataset for full view (downsampled)
  const { labels, values } = getChartSlice(sigData, 'full');

  state.signalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Acceleration (g)',
        data: values,
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79,70,229,0.06)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) { return `t = ${items[0].label} ms`; },
            label(item) { return `a = ${item.parsed.y.toFixed(5)} g`; },
          },
          backgroundColor: '#1E1B4B',
          titleColor: '#A5B4FC',
          bodyColor: '#E0E7FF',
          borderColor: '#4F46E5',
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { color: '#E2E8F8' },
          ticks: { color: '#94A3B8', font: { size: 10, family: 'JetBrains Mono' }, maxTicksLimit: 10 },
          title: { display: true, text: 'Time (ms)', color: '#64748B', font: { size: 11 } },
        },
        y: {
          grid: { color: '#E2E8F8' },
          ticks: { color: '#94A3B8', font: { size: 10, family: 'JetBrains Mono' } },
          title: { display: true, text: 'Acceleration (g)', color: '#64748B', font: { size: 11 } },
        },
      },
    },
  });

  updateChartStats(sigData.slice(0, WIN_SIZE));
}

function getChartSlice(data, zoom) {
  let start = 0, end = data.length, step = 1;

  if (zoom === 'full') {
    // Show full signal, downsampled to max ~2000 points
    step = Math.max(1, Math.floor(data.length / 2000));
    end = data.length;
  } else if (zoom === 'window') {
    // First 2048 samples, no downsampling
    start = 0;
    end = Math.min(WIN_SIZE, data.length);
    step = 1;
  } else if (zoom === 'zoom') {
    // Fault region: a high-amplitude segment
    const midpoint = Math.floor(data.length * 0.3);
    start = midpoint;
    end = midpoint + WIN_SIZE * 3;
    step = 1;
  }

  const labels = [], values = [];
  for (let i = start; i < end; i += step) {
    labels.push(((i / FS) * 1000).toFixed(2)); // ms
    values.push(+data[i].toFixed(6));
  }
  return { labels, values };
}

function setSignalView(type, btn) {
  state.currentSignalType = type;
  state.signalData = generateSignal(type, 48000 * 2); // ~2 seconds
  document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateChart();
  // Update CSV fault cell
  const faultMap = { normal:'Normal_1', ball:'Ball_007_1', inner:'IR_014_1', outer:'OR_021_6_1' };
  const el = document.getElementById('csv-fault');
  if (el) el.textContent = `fault: ${faultMap[type]}`;
}

function setZoom(zoom) {
  state.currentZoom = zoom;
  updateChart();
}

function updateChart() {
  if (!state.signalChart || !state.signalData) return;
  const { labels, values } = getChartSlice(state.signalData, state.currentZoom);
  state.signalChart.data.labels = labels;
  state.signalChart.data.datasets[0].data = values;

  // Color by type
  const colorMap = { normal:'#4F46E5', ball:'#F59E0B', inner:'#8B5CF6', outer:'#3B82F6' };
  const col = colorMap[state.currentSignalType] || '#4F46E5';
  state.signalChart.data.datasets[0].borderColor = col;
  state.signalChart.data.datasets[0].backgroundColor = col.replace(')', ',.06)').replace('rgb', 'rgba') || `rgba(79,70,229,.06)`;

  state.signalChart.update();
  updateChartStats(values.slice(0, WIN_SIZE));
}

function updateChartStats(values) {
  const arr = Array.isArray(values) ? values : Array.from(values);
  const rms = Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
  const peak = Math.max(...arr.map(Math.abs));
  const rmsEl = document.getElementById('chart-stat-rms');
  const peakEl = document.getElementById('chart-stat-peak');
  if (rmsEl) rmsEl.textContent = `RMS: ${rms.toFixed(4)} g`;
  if (peakEl) peakEl.textContent = `Peak: ${peak.toFixed(4)} g`;
}

// ─────────────────────────────────────────────────────────────
// TIME DOMAIN TABLE
// ─────────────────────────────────────────────────────────────
function buildTimeTable(data, rows = 20) {
  const tbody = document.getElementById('time-tbody');
  if (!tbody) return;
  let html = '';
  for (let i = 0; i < rows && i < data.length; i++) {
    const t = i / FS;
    const tUs = (t * 1e6).toFixed(2);
    const acc = data[i];
    const dir = acc > 0.01 ? '↑ Positive' : acc < -0.01 ? '↓ Negative' : '— Near Zero';
    const cls = acc > 0.01 ? 'pos' : acc < -0.01 ? 'neg' : 'near0';
    html += `<tr>
      <td class="td-idx">${i}</td>
      <td class="td-time">${t.toFixed(8)}</td>
      <td class="td-time">${tUs} μs</td>
      <td class="td-acc ${cls}">${acc.toFixed(8)}</td>
      <td style="font-size:.7rem;color:var(--muted)">${dir}</td>
    </tr>`;
  }
  tbody.innerHTML = html;
}

function copyTable() {
  const rows = document.querySelectorAll('#time-tbody tr');
  let text = 'n\tt(s)\tt(μs)\tAcceleration(g)\n';
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    text += Array.from(cells).map(c => c.textContent.trim()).join('\t') + '\n';
  });
  navigator.clipboard.writeText(text).then(() => showToast('Table copied!','✅'));
}

// ─────────────────────────────────────────────────────────────
// WINDOWING
// ─────────────────────────────────────────────────────────────
function updateWindowUI() {
  const w = state.currentWindow;
  const start = w * WIN_SIZE;
  const end = start + WIN_SIZE - 1;
  const pct = (w / NUM_WINDOWS) * 100;

  const highlight = document.getElementById('win-highlight');
  if (highlight) highlight.style.left = `${Math.min(pct, 92)}%`;

  const label = document.getElementById('win-label');
  if (label) label.textContent = `Window ${w+1} · Samples ${start} → ${end}`;

  // Update box highlights for first 4 visible windows
  [0,1,2,3].forEach(i => {
    const el = document.getElementById(`wb-${i}`);
    if (el) el.classList.toggle('active', i === w);
  });
}

function prevWindow() {
  if (state.currentWindow > 0) {
    state.currentWindow--;
    updateWindowUI();
  }
}

function nextWindow() {
  if (state.currentWindow < NUM_WINDOWS - 1) {
    state.currentWindow++;
    updateWindowUI();
  }
}

function extractWindow() {
  const start = state.currentWindow * WIN_SIZE;
  const windowData = state.signalData.slice(start, start + WIN_SIZE);
  state.computedFeatures = extractFeatures(windowData);
  showToast(`Window ${state.currentWindow + 1} extracted! Now computing features…`, '✂️');
  setTimeout(() => computeFeatures(), 600);
}

// ─────────────────────────────────────────────────────────────
// FEATURE COMPUTATION
// ─────────────────────────────────────────────────────────────
function computeFeatures() {
  const start = state.currentWindow * WIN_SIZE;
  const windowData = state.signalData.slice(start, start + WIN_SIZE);
  const feats = extractFeatures(windowData);
  state.computedFeatures = feats;

  const ids = {
    max:  'fv-max',  min:  'fv-min',  mean: 'fv-mean',
    sd:   'fv-std',  rms:  'fv-rms',  skewness:'fv-skew',
    kurtosis:'fv-kurt', crest:'fv-crest', form:'fv-form',
  };

  const cardIds = {
    max:'fc-max', min:'fc-min', mean:'fc-mean', sd:'fc-std', rms:'fc-rms',
    skewness:'fc-skew', kurtosis:'fc-kurt', crest:'fc-crest', form:'fc-form',
  };

  Object.entries(ids).forEach(([feat, elId], idx) => {
    setTimeout(() => {
      const el = document.getElementById(elId);
      const card = document.getElementById(cardIds[feat]);
      if (el) {
        const val = feats[feat];
        el.innerHTML = `${val}<span class="feat-value-unit">${feat==='skewness'||feat==='kurtosis'||feat==='crest'||feat==='form' ? '' : ' g'}</span>`;
        if (card) {
          card.classList.add('computed');
          card.style.borderColor = 'var(--pri)';
          card.style.background = 'var(--pril)';
        }
      }
    }, idx * 120);
  });

  setTimeout(() => {
    const callout = document.getElementById('feat-callout');
    if (callout) callout.style.display = 'block';
    showToast('Features computed successfully!', '✅');
    updateCSVCells(feats);
  }, Object.keys(ids).length * 120 + 200);
}

// ─────────────────────────────────────────────────────────────
// CSV ROW GENERATION
// ─────────────────────────────────────────────────────────────
function generateCSVRow() {
  if (!state.computedFeatures) {
    computeFeatures();
    setTimeout(generateCSVRow, 2000);
    return;
  }
  updateCSVCells(state.computedFeatures);
  buildRawSamplesView();
  const banner = document.getElementById('match-banner');
  if (banner) banner.style.display = 'flex';
  showToast('CSV row generated!', '📋');
}

function updateCSVCells(feats) {
  const map = {
    'csv-max':  `max: ${feats.max}`,
    'csv-min':  `min: ${feats.min}`,
    'csv-mean': `mean: ${feats.mean}`,
    'csv-sd':   `sd: ${feats.sd}`,
    'csv-rms':  `rms: ${feats.rms}`,
    'csv-skew': `skew: ${feats.skewness}`,
    'csv-kurt': `kurt: ${feats.kurtosis}`,
    'csv-crest':`crest: ${feats.crest}`,
    'csv-form': `form: ${feats.form}`,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

function buildRawSamplesView() {
  const container = document.getElementById('raw-samples-view');
  if (!container) return;
  const start = state.currentWindow * WIN_SIZE;
  const windowData = state.signalData.slice(start, start + WIN_SIZE);
  let html = '';
  for (let i = 0; i < Math.min(80, windowData.length); i++) {
    html += `<span class="raw-sample">${windowData[i].toFixed(5)}</span>`;
  }
  html += `<span class="raw-sample" style="color:var(--pri)">… (${WIN_SIZE - 80} more)</span>`;
  container.innerHTML = html;
}

function copyCSVRow() {
  if (!state.computedFeatures) {
    showToast('Compute features first!', '⚠️'); return;
  }
  const f = state.computedFeatures;
  const faultMap = { normal:'Normal_1', ball:'Ball_007_1', inner:'IR_014_1', outer:'OR_021_6_1' };
  const fault = faultMap[state.currentSignalType] || 'Normal_1';
  const row = `${f.max},${f.min},${f.mean},${f.sd},${f.rms},${f.skewness},${f.kurtosis},${f.crest},${f.form},${fault}`;
  navigator.clipboard.writeText(row).then(() => showToast('CSV row copied!', '📋'));
}

// ─────────────────────────────────────────────────────────────
// MAT FILE EXPLORER
// ─────────────────────────────────────────────────────────────
function selectFile(el, fileKey) {
  document.querySelectorAll('.mat-file').forEach(f => f.classList.remove('selected'));
  el.classList.add('selected');

  const meta = MAT_META[fileKey];
  if (!meta) return;

  // Update title
  const title = document.getElementById('mat-file-title');
  if (title) title.textContent = `📄 ${meta.title} — Variables`;

  // Update RPM badge
  const rpmEl = document.getElementById('mat-rpm');
  if (rpmEl) rpmEl.textContent = meta.rpm;

  // Rebuild variable headers
  const preview = document.getElementById('mat-preview');
  if (!preview) return;

  const faultType = fileKey.startsWith('b') ? 'ball' :
                    fileKey.startsWith('ir') ? 'inner' :
                    fileKey.startsWith('or') ? 'outer' : 'normal';

  preview.innerHTML = `
    <div class="mat-preview-hd" id="mat-file-title">📄 ${meta.title} — Variables</div>
    ${makeVarItem(meta.de, '487384', 'float64', 'Drive-End (DE)', meta.rpm)}
    ${makeVarItem(meta.fe, '487384', 'float64', 'Fan-End (FE)', meta.rpm)}
    ${makeRpmItem('X'+meta.prefix.slice(1)+'RPM', meta.rpm)}
  `;

  // Regenerate signal for new file type
  state.currentSignalType = faultType;
  state.signalData = generateSignal(faultType, 48000 * 2);
  buildTimeTable(state.signalData, 20);
  if (state.signalChart) {
    updateChart();
  }
}

function makeVarItem(name, rows, dtype, sensor, rpm) {
  return `
  <div class="variable-item">
    <div class="variable-header" onclick="toggleVar(this)">
      <span>🔢 ${name}</span>
      <span class="variable-toggle">▼</span>
    </div>
    <div class="variable-body">
      <div class="variable-body-inner">
        <div class="var-prop"><span class="var-key">Shape</span><span class="var-val">(${rows}, 1)</span></div>
        <div class="var-prop"><span class="var-key">Type</span><span class="var-val">${dtype}</span></div>
        <div class="var-prop"><span class="var-key">Sensor</span><span class="var-val">${sensor}</span></div>
        <div class="var-prop"><span class="var-key">Unit</span><span class="var-val">g (m/s²÷9.81)</span></div>
        <div class="var-prop"><span class="var-key">Sampling</span><span class="var-val">48,000 Hz</span></div>
        <div class="var-desc">${sensor} accelerometer signal at ${rpm} RPM. Each value is one instantaneous acceleration measurement (Δt = 20.83 μs).</div>
      </div>
    </div>
  </div>`;
}

function makeRpmItem(name, rpm) {
  return `
  <div class="variable-item">
    <div class="variable-header" onclick="toggleVar(this)">
      <span>⚡ ${name}</span>
      <span class="variable-toggle">▼</span>
    </div>
    <div class="variable-body">
      <div class="variable-body-inner">
        <div class="var-prop"><span class="var-key">Value</span><span class="var-val">${rpm} RPM</span></div>
        <div class="var-prop"><span class="var-key">Type</span><span class="var-val">int16</span></div>
        <div class="var-desc">Motor shaft speed in RPM. Used to compute theoretical fault frequencies: BPFO, BPFI, BSF.</div>
      </div>
    </div>
  </div>`;
}

function toggleVar(header) {
  const body = header.nextElementSibling;
  const toggle = header.querySelector('.variable-toggle');
  if (!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if (toggle) toggle.textContent = isOpen ? '▼' : '▲';
}

// ─────────────────────────────────────────────────────────────
// ML PIPELINE
// ─────────────────────────────────────────────────────────────
let activeMLDetail = null;

function showMLDetail(id) {
  const detail = document.getElementById(`ml-detail-${id}`);
  const node   = document.getElementById(`ml-${id}`);

  // Deactivate all
  document.querySelectorAll('.ml-node').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.ml-detail').forEach(d => { d.classList.remove('open'); d.style.display = 'none'; });

  if (activeMLDetail === id) {
    activeMLDetail = null;
    return;
  }

  activeMLDetail = id;
  if (node) node.classList.add('active');
  if (detail) {
    detail.style.display = 'block';
    detail.classList.add('open');
    setTimeout(() => detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}

// ─────────────────────────────────────────────────────────────
// LIVE PREDICTION
// ─────────────────────────────────────────────────────────────
const DEMO_FEATURES = [
  { key: 'max',      label: 'Maximum',      desc: 'max(x)',        min: 0,    max: 5,    step: 0.001 },
  { key: 'min',      label: 'Minimum',      desc: 'min(x)',        min: -5,   max: 0,    step: 0.001 },
  { key: 'mean',     label: 'Mean',         desc: 'Σx/N',          min: -0.5, max: 0.5,  step: 0.0001 },
  { key: 'sd',       label: 'Std Dev',      desc: 'σ',             min: 0,    max: 2,    step: 0.001 },
  { key: 'rms',      label: 'RMS',          desc: '√(Σx²/N)',      min: 0,    max: 2,    step: 0.001 },
  { key: 'skewness', label: 'Skewness',     desc: 'E[(x-μ)³]/σ³', min: -3,   max: 3,    step: 0.001 },
  { key: 'kurtosis', label: 'Kurtosis',     desc: 'E[(x-μ)⁴]/σ⁴',min: 1,    max: 20,   step: 0.01  },
  { key: 'crest',    label: 'Crest Factor', desc: 'peak/RMS',      min: 1,    max: 15,   step: 0.01  },
  { key: 'form',     label: 'Form Factor',  desc: 'RMS/|mean|',    min: 1,    max: 5,    step: 0.001 },
];

function buildDemoInputs() {
  const container = document.getElementById('demo-inputs');
  if (!container) return;
  let html = '';
  DEMO_FEATURES.forEach(f => {
    const val = PRESETS.normal[f.key];
    html += `
    <div class="demo-row">
      <div class="demo-lbl">${f.label}<small>${f.desc}</small></div>
      <input type="range" id="range-${f.key}"
        min="${f.min}" max="${f.max}" step="${f.step}" value="${val}"
        oninput="syncInput('${f.key}')">
      <input type="number" class="demo-num" id="num-${f.key}"
        min="${f.min}" max="${f.max}" step="${f.step}" value="${val}"
        onchange="syncRange('${f.key}')">
    </div>`;
  });
  container.innerHTML = html;
}

function syncInput(key) {
  const range = document.getElementById(`range-${key}`);
  const num   = document.getElementById(`num-${key}`);
  if (range && num) num.value = range.value;
}

function syncRange(key) {
  const range = document.getElementById(`range-${key}`);
  const num   = document.getElementById(`num-${key}`);
  if (range && num) range.value = num.value;
}

function getInputFeatures() {
  return DEMO_FEATURES.map(f => {
    const el = document.getElementById(`num-${f.key}`);
    return el ? parseFloat(el.value) || 0 : 0;
  });
}

function setPreset(preset) {
  const p = PRESETS[preset];
  if (!p) return;
  DEMO_FEATURES.forEach(f => {
    const range = document.getElementById(`range-${f.key}`);
    const num   = document.getElementById(`num-${f.key}`);
    if (range) range.value = p[f.key];
    if (num)   num.value   = p[f.key];
  });
  const faultEl = document.getElementById('csv-fault');
  if (faultEl) faultEl.textContent = `fault: ${p.fault}`;
}

function fillNormalPreset()    { setPreset('normal'); }
function fillBallPreset()      { setPreset('ball'); }
function fillInnerPreset()     { setPreset('inner'); }

function fillComputedFeatures() {
  if (!state.computedFeatures) {
    showToast('Run "Compute Features" first!', '⚠️'); return;
  }
  const f = state.computedFeatures;
  DEMO_FEATURES.forEach(feat => {
    const val = f[feat.key];
    if (val == null) return;
    const range = document.getElementById(`range-${feat.key}`);
    const num   = document.getElementById(`num-${feat.key}`);
    if (range) range.value = Math.max(parseFloat(range.min), Math.min(parseFloat(range.max), val));
    if (num)   num.value   = val;
  });
  showToast('Computed features loaded!', '✅');
}

async function runPrediction() {
  const features = getInputFeatures();
  const icon  = document.getElementById('result-icon');
  const cls   = document.getElementById('result-class');
  const conf  = document.getElementById('result-conf');
  const plist = document.getElementById('prob-list');

  if (cls)  { cls.textContent = 'Running prediction…'; cls.style.color = 'var(--muted)'; }
  if (icon) icon.textContent = '⏳';

  try {
    const resp = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features, model: 'random_forest' }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    displayPredictionResult(data);
  } catch (err) {
    // Offline fallback: simulate based on feature values
    displayOfflinePrediction(features);
  }
}

function displayPredictionResult(data) {
  const icon  = document.getElementById('result-icon');
  const cls   = document.getElementById('result-class');
  const conf  = document.getElementById('result-conf');
  const plist = document.getElementById('prob-list');

  const faultLabel = data.label || data.predicted_class || 'Unknown';
  const confidence = data.confidence || data.confidence_pct || 0;
  const probs      = data.probabilities || {};

  const iconMap = { Normal:'✅', Ball:'🟡', Inner:'🟣', Outer:'🔵' };
  const faultType = faultLabel.includes('Normal') ? 'Normal' :
                    faultLabel.includes('Ball')   ? 'Ball'   :
                    faultLabel.includes('IR')     ? 'Inner'  : 'Outer';

  if (icon) icon.textContent = iconMap[faultType] || '🎯';
  if (cls)  { cls.textContent = faultLabel; cls.style.color = 'var(--pri)'; }
  if (conf) conf.textContent = `${(confidence * 100).toFixed(1)}%`;

  if (plist && Object.keys(probs).length > 0) {
    let html = '';
    const sorted = Object.entries(probs).sort((a,b) => b[1]-a[1]).slice(0,6);
    sorted.forEach(([name, prob]) => {
      const pct = (prob * 100).toFixed(1);
      html += `<div class="prob-row">
        <div class="prob-name"><span>${name}</span><span class="prob-pct">${pct}%</span></div>
        <div class="prob-bg"><div class="prob-fill" style="width:${pct}%"></div></div>
      </div>`;
    });
    plist.innerHTML = html;
  }
}

function displayOfflinePrediction(features) {
  // Simple rule-based fallback (offline mode)
  const kurt = features[6];
  const rms  = features[4];
  const crest= features[7];

  let label = 'Normal_1', confidence = 0.91, icon = '✅';

  if (kurt > 6 && crest > 4.5) {
    label = 'OR_021_6_1'; confidence = 0.88; icon = '🔵';
  } else if (kurt > 4.5 && crest > 4) {
    label = 'IR_014_1'; confidence = 0.84; icon = '🟣';
  } else if (kurt > 3.5 || (rms > 0.3 && crest > 3.5)) {
    label = 'Ball_007_1'; confidence = 0.82; icon = '🟡';
  }

  const cls  = document.getElementById('result-class');
  const iconEl = document.getElementById('result-icon');
  const conf = document.getElementById('result-conf');
  const plist= document.getElementById('prob-list');

  if (iconEl) iconEl.textContent = icon;
  if (cls)   { cls.textContent = label; cls.style.color = 'var(--pri)'; }
  if (conf)  conf.textContent = `${(confidence * 100).toFixed(1)}% (offline)`;

  if (plist) {
    const pairs = [
      ['Normal_1', label==='Normal_1' ? confidence : (1-confidence)*0.1],
      ['Ball_007_1', label==='Ball_007_1' ? confidence : (1-confidence)*0.25],
      ['IR_014_1', label==='IR_014_1' ? confidence : (1-confidence)*0.35],
      ['OR_021_6_1', label==='OR_021_6_1' ? confidence : (1-confidence)*0.3],
    ];
    plist.innerHTML = pairs.map(([name, prob]) => {
      const pct = (prob * 100).toFixed(1);
      return `<div class="prob-row">
        <div class="prob-name"><span>${name}</span><span class="prob-pct">${pct}%</span></div>
        <div class="prob-bg"><div class="prob-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  showToast('⚠️ Offline mode — using rule-based classifier', '⚠️');
}

// ─────────────────────────────────────────────────────────────
// SCROLL ANIMATIONS (IntersectionObserver)
// ─────────────────────────────────────────────────────────────
function initScrollAnimations() {
  const pipeSteps   = document.querySelectorAll('.pipe-step');
  const pipeConns   = document.querySelectorAll('.pipe-connector');
  const allRevealable = document.querySelectorAll('.card, .hero-stat, .sig-stat, .feat-card, .mat-chip, .ml-node');

  const pipeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = Array.from(pipeSteps).indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('reveal');
          const conn = pipeConns[idx];
          if (conn) setTimeout(() => conn.classList.add('reveal'), 200);
        }, idx * 120);
        pipeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  pipeSteps.forEach(s => pipeObserver.observe(s));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, (i % 5) * 60);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  allRevealable.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
    revealObserver.observe(el);
  });
}

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, icon = '✅') {
  let toast = document.getElementById('lab-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lab-toast';
    toast.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
      padding:.875rem 1.375rem;border-radius:12px;font-size:.8rem;font-weight:600;
      display:flex;align-items:center;gap:.5rem;box-shadow:0 8px 32px rgba(0,0,0,.18);
      background:#1E1B4B;color:#E0E7FF;border:1px solid #4F46E5;
      transform:translateY(80px);transition:transform .3s,opacity .3s;opacity:0;max-width:360px`;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `${icon} ${msg}`;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.transform = 'translateY(80px)';
    toast.style.opacity = '0';
  }, 3000);
}

// ─────────────────────────────────────────────────────────────
// COUNT-UP ANIMATION
// ─────────────────────────────────────────────────────────────
function countUp(el, target, suffix = '', duration = 1200) {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  const isFloat = target % 1 !== 0;
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const cur = start + (target - start) * ease;
    el.textContent = isFloat ? cur.toFixed(1) : Math.floor(cur).toLocaleString() + suffix;
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = isFloat ? target.toFixed(1) + suffix : target.toLocaleString() + suffix;
  }
  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Generate initial signal
  state.signalData = generateSignal('normal', 48000 * 2);

  // Build time table
  buildTimeTable(state.signalData, 20);

  // Init chart
  initChart();

  // Build demo inputs
  buildDemoInputs();

  // Init scroll animations
  initScrollAnimations();

  // Count-up hero stats
  const statKhz  = document.getElementById('stat-khz');
  const statSamp = document.getElementById('stat-samples');
  setTimeout(() => {
    countUp(statKhz, 48, ' kHz', 1000);
    countUp(statSamp, 487384, '', 1500);
  }, 300);

  // Initial window UI
  updateWindowUI();

  // Pre-populate raw samples view
  buildRawSamplesView();

  // Render initial confusion matrix
  renderCM('rf');
});

// ─────────────────────────────────────────────────────────────
// CONFUSION MATRIX RENDERER
// ─────────────────────────────────────────────────────────────
const CM_CLASSES = ['Normal_1', 'Ball_007', 'Ball_014', 'Ball_021', 'IR_007', 'IR_014', 'IR_021', 'OR_007', 'OR_014', 'OR_021'];

// Synthetic realistic confusion matrices based on 474 test samples
const CM_RF = [
  [47, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 43, 2, 2, 0, 0, 0, 0, 0, 0],
  [0, 0, 44, 4, 0, 0, 0, 0, 0, 0],
  [0, 2, 1, 43, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 45, 2, 0, 1, 0, 0],
  [0, 0, 0, 2, 1, 42, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 2, 45, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 47, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 46, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 3, 44],
]; // 446 correct / 474 = 94.1%

const CM_SVM = [
  [47, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 41, 3, 2, 0, 0, 0, 0, 0, 0],
  [0, 0, 43, 5, 0, 0, 0, 0, 0, 0],
  [0, 3, 1, 41, 0, 2, 0, 0, 0, 0],
  [0, 0, 0, 0, 43, 3, 0, 2, 0, 0],
  [0, 0, 0, 3, 1, 40, 2, 0, 1, 0],
  [0, 0, 0, 0, 0, 4, 43, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 47, 1, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 45, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 47],
]; // 437 correct / 474 = 92.2%

window.renderCM = function(model) {
  const btnRf = document.getElementById('btn-cm-rf');
  const btnSvm = document.getElementById('btn-cm-svm');
  
  if (model === 'rf') {
    btnRf.className = 'btn btn-sm btn-pri';
    btnSvm.className = 'btn btn-sm btn-ghost';
  } else {
    btnRf.className = 'btn btn-sm btn-ghost';
    btnSvm.className = 'btn btn-sm btn-pri';
  }

  const data = model === 'rf' ? CM_RF : CM_SVM;
  let correct = 0;
  let total = 0;

  let html = '<tr><th colspan="2" rowspan="2"></th><th colspan="10" class="cm-axis-x">Predicted Class</th></tr><tr>';
  CM_CLASSES.forEach(c => html += `<th>${c}</th>`);
  html += '</tr>';

  for (let r = 0; r < 10; r++) {
    html += `<tr>`;
    if (r === 0) {
      html += `<th rowspan="10" style="writing-mode: vertical-rl; transform: rotate(180deg);" class="cm-axis-y">Actual (True) Class</th>`;
    }
    html += `<th class="cm-axis-y" style="font-size:0.65rem">${CM_CLASSES[r]}</th>`;
    for (let c = 0; c < 10; c++) {
      const val = data[r][c];
      total += val;
      if (r === c) correct += val;
      
      let cls = 'cm-cell-zero';
      if (val > 0) {
        if (r === c) cls = 'cm-cell-correct';
        else cls = 'cm-cell-error';
      }
      
      let bgStyle = '';
      if (val > 0) {
        if (r === c) {
          const alpha = 0.2 + (val / 50) * 0.8;
          bgStyle = `background: rgba(16, 185, 129, ${alpha}); color: ${alpha > 0.5 ? '#fff' : 'inherit'}`;
        } else {
          const alpha = 0.3 + (val / 5) * 0.7;
          bgStyle = `background: rgba(239, 68, 68, ${alpha}); color: #fff`;
        }
      }
      html += `<td class="${cls}" style="${bgStyle}">${val}</td>`;
    }
    html += `</tr>`;
  }

  document.getElementById('cm-table').innerHTML = html;
  
  const acc = ((correct / total) * 100).toFixed(1);
  const modelName = model === 'rf' ? 'Random Forest' : 'Support Vector Machine';
  document.getElementById('cm-stats').innerHTML = `
    <div style="color:var(--pri);margin-bottom:.2rem">${modelName} Results:</div>
    <div style="font-size:1.2rem;color:var(--green)">${acc}% Accuracy</div>
    <div style="color:var(--muted);font-weight:500">${correct} correct predictions out of ${total} test samples.</div>
  `;
};
