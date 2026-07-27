/* ================================================================
   BearingIQ — main.js  (Global utilities + navigation)
   ================================================================ */

const API = 'http://127.0.0.1:5000/api';

// ── Fault metadata (mirrors Python) ─────────────────────────
const FAULT_META = {
  'Normal_1':   { label:'Normal',              type:'normal', severity:0, color:'#10B981', icon:'✅' },
  'Ball_007_1': { label:'Ball — 0.007"',        type:'ball',   severity:1, color:'#F59E0B', icon:'⚠️' },
  'Ball_014_1': { label:'Ball — 0.014"',        type:'ball',   severity:2, color:'#F97316', icon:'🔶' },
  'Ball_021_1': { label:'Ball — 0.021"',        type:'ball',   severity:3, color:'#EF4444', icon:'🔴' },
  'IR_007_1':   { label:'Inner Race — 0.007"',  type:'inner',  severity:1, color:'#8B5CF6', icon:'⚠️' },
  'IR_014_1':   { label:'Inner Race — 0.014"',  type:'inner',  severity:2, color:'#7C3AED', icon:'🔶' },
  'IR_021_1':   { label:'Inner Race — 0.021"',  type:'inner',  severity:3, color:'#6D28D9', icon:'🔴' },
  'OR_007_6_1': { label:'Outer Race — 0.007"',  type:'outer',  severity:1, color:'#3B82F6', icon:'⚠️' },
  'OR_014_6_1': { label:'Outer Race — 0.014"',  type:'outer',  severity:2, color:'#2563EB', icon:'🔶' },
  'OR_021_6_1': { label:'Outer Race — 0.021"',  type:'outer',  severity:3, color:'#1D4ED8', icon:'🔴' },
};

const FEATURE_INFO = {
  max:      { label:'Max',      desc:'Maximum amplitude',      unit:'g', min:-1.5, max:1.5 },
  min:      { label:'Min',      desc:'Minimum amplitude',      unit:'g', min:-1.5, max:0.5 },
  mean:     { label:'Mean',     desc:'Mean value',             unit:'g', min:-0.1, max:0.1 },
  sd:       { label:'Std Dev',  desc:'Standard deviation',     unit:'g', min:0,    max:0.6 },
  rms:      { label:'RMS',      desc:'Root Mean Square',       unit:'g', min:0,    max:0.6 },
  skewness: { label:'Skewness', desc:'Signal skewness',        unit:'',  min:-2,   max:2   },
  kurtosis: { label:'Kurtosis', desc:'Signal kurtosis',        unit:'',  min:-1,   max:2   },
  crest:    { label:'Crest',    desc:'Crest factor',           unit:'',  min:1,    max:10  },
  form:     { label:'Form',     desc:'Form factor',            unit:'',  min:1,    max:15  },
};

const FEATURES = ['max','min','mean','sd','rms','skewness','kurtosis','crest','form'];

// ── Example presets per fault class ─────────────────────────
const PRESETS = {
  'Normal_1':   [0.28, -0.26, 0.011, 0.087, 0.088, 0.02,  -0.04, 3.18,  6.96],
  'Ball_007_1': [0.46, -0.38, 0.022, 0.132, 0.134, 0.17,  -0.08, 3.48,  6.04],
  'Ball_014_1': [0.54, -0.48, 0.024, 0.155, 0.157, 0.15,  -0.10, 3.60,  6.50],
  'Ball_021_1': [0.80, -0.70, 0.030, 0.195, 0.197, 0.22,  -0.12, 4.10,  7.20],
  'IR_007_1':   [0.50, -0.45, 0.020, 0.140, 0.142, 0.08,   0.05, 3.55,  7.12],
  'IR_014_1':   [0.65, -0.60, 0.026, 0.168, 0.170, 0.12,   0.08, 3.82,  7.55],
  'IR_021_1':   [0.90, -0.85, 0.032, 0.210, 0.213, 0.18,   0.14, 4.25,  8.10],
  'OR_007_6_1': [0.48, -0.42, 0.019, 0.135, 0.137, -0.05,  0.06, 3.50,  7.05],
  'OR_014_6_1': [0.62, -0.55, 0.025, 0.162, 0.165, -0.09,  0.10, 3.78,  7.48],
  'OR_021_6_1': [0.85, -0.78, 0.031, 0.200, 0.203, -0.14,  0.16, 4.18,  8.05],
};

// ── API helper ───────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(API + endpoint, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[API] ${endpoint} →`, err.message);
    throw err;
  }
}

// ── Number formatting ────────────────────────────────────────
function fmt(v, decimals = 4) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(decimals);
}

function fmtPct(v) { return (v * 100).toFixed(1) + '%'; }

function animateCounter(el, end, duration = 900, decimals = 0) {
  const start = 0;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;
    el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Badge creation ───────────────────────────────────────────
function makeBadge(faultClass) {
  const m = FAULT_META[faultClass] || {};
  const type = m.type || 'normal';
  return `<span class="badge badge-${type}">${m.icon || ''} ${m.label || faultClass}</span>`;
}

// ── Set active nav item ──────────────────────────────────────
function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('href') === page ||
      (page === '' && el.getAttribute('href') === 'index.html'));
  });
}

// ── Toast notifications ──────────────────────────────────────
let toastTimeout;
function showToast(message, type = 'info', duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      padding:14px 22px; border-radius:12px; font-size:.875rem;
      font-weight:600; display:flex; align-items:center; gap:10px;
      box-shadow:0 8px 32px rgba(0,0,0,.18); transform:translateY(80px);
      transition:transform .3s ease, opacity .3s ease; opacity:0;
      font-family:var(--font-sans); max-width:380px;
    `;
    document.body.appendChild(toast);
  }
  const styles = {
    info:    'background:#EEF2FF; color:#3730A3; border:2px solid #C7D2FE;',
    success: 'background:#D1FAE5; color:#065F46; border:2px solid #6EE7B7;',
    warning: 'background:#FEF3C7; color:#92400E; border:2px solid #FCD34D;',
    error:   'background:#FEE2E2; color:#991B1B; border:2px solid #FCA5A5;',
  };
  const icons = { info:'ℹ️', success:'✅', warning:'⚠️', error:'❌' };
  toast.style.cssText += styles[type] || styles.info;
  toast.innerHTML = `<span>${icons[type]}</span> ${message}`;
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.transform = 'translateY(80px)';
    toast.style.opacity = '0';
  }, duration);
}

// ── Loading overlay ──────────────────────────────────────────
function setLoading(el, isLoading, originalContent = '') {
  if (isLoading) {
    el.disabled = true;
    el.dataset.original = el.innerHTML;
    el.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:3px;"></span> Processing…';
  } else {
    el.disabled = false;
    el.innerHTML = el.dataset.original || originalContent;
  }
}

// ── Color interpolation ──────────────────────────────────────
function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')}`;
}

// ── Export table as CSV ──────────────────────────────────────
function exportTableCSV(tableEl, filename = 'data.csv') {
  const rows = Array.from(tableEl.querySelectorAll('tr'));
  const csv = rows.map(row =>
    Array.from(row.querySelectorAll('th,td'))
      .map(cell => `"${cell.textContent.trim()}"`)
      .join(',')
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  showToast('CSV exported successfully!', 'success');
}

// ── Init on every page ───────────────────────────────────────
const initMain = () => {
  setActiveNav();

  // Animate all .anim-* elements via IntersectionObserver
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.visibility = 'visible';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[class*="anim-"]').forEach(el => {
    el.style.visibility = 'hidden';
    observer.observe(el);
  });
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMain);
} else {
  initMain();
}

// ── Global exports ───────────────────────────────────────────
window.BIQ = {
  API, FAULT_META, FEATURE_INFO, FEATURES, PRESETS,
  apiFetch, fmt, fmtPct, animateCounter, makeBadge,
  showToast, setLoading, lerpColor, exportTableCSV
};
