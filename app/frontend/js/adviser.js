/* ================================================================
   BearingIQ — adviser.js
   AI adviser chat interface, contextual advice, NLU responses
   ================================================================ */

const {
  apiFetch, fmt, FAULT_META, FEATURES, FEATURE_INFO,
  PRESETS, showToast, setLoading
} = window.BIQ;

let currentValues  = [0.28, -0.26, 0.011, 0.087, 0.088, 0.02, -0.04, 3.18, 6.96];
let lastAdvice     = null;
let lastPrediction = null;
let messageCount   = 0;

const QUICK_QUESTIONS = [
  'When should I replace the bearing?',
  'What is the root cause?',
  'Is it safe to operate?',
  'Explain the signal features',
  'What lubrication is recommended?',
  'How confident is the model?',
];

const initAdviser = () => {
  buildContextSliders();
  buildAdviserPresets();
  populateSensSelect();
  setupChat();
  postWelcomeMessage();
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdviser);
} else {
  initAdviser();
}

// ── Context sliders (compact version) ───────────────────────
function buildContextSliders() {
  const container = document.getElementById('context-sliders');
  if (!container) return;

  container.innerHTML = FEATURES.map((feat, i) => {
    const info = FEATURE_INFO[feat];
    const val  = currentValues[i];
    return `
      <div class="quick-input-row">
        <span class="qi-label">${feat}</span>
        <input type="range" class="qi-slider" id="ctx-slider-${feat}"
               min="${info.min}" max="${info.max}" step="0.001" value="${val}"
               oninput="syncCtx('${feat}', this.value, false)">
        <input type="number" class="qi-number" id="ctx-num-${feat}"
               min="${info.min}" max="${info.max}" step="0.001" value="${val}"
               oninput="syncCtx('${feat}', this.value, true)">
      </div>
    `;
  }).join('');
}

function syncCtx(feat, value, fromNumber) {
  const idx  = FEATURES.indexOf(feat);
  currentValues[idx] = parseFloat(value) || 0;
  const slider = document.getElementById(`ctx-slider-${feat}`);
  const numIn  = document.getElementById(`ctx-num-${feat}`);
  const info   = FEATURE_INFO[feat];
  if (fromNumber) slider.value = value;
  else numIn.value = parseFloat(value).toFixed(4);
  const pct = ((parseFloat(value) - info.min) / (info.max - info.min)) * 100;
  slider.style.setProperty('--pct', `${Math.max(0, Math.min(100, pct))}%`);
}

function updateAllCtxSliders() {
  FEATURES.forEach((feat, i) => {
    syncCtx(feat, currentValues[i], true);
    syncCtx(feat, currentValues[i], false);
  });
}

// ── Presets ──────────────────────────────────────────────────
function buildAdviserPresets() {
  const grid = document.getElementById('adviser-presets-grid');
  if (!grid) return;

  const items = [
    { cls: 'Normal_1',   label: '✅ Normal',  color: '#10B981', bg: '#D1FAE5' },
    { cls: 'Ball_007_1', label: '⚠️ Ball-L', color: '#F59E0B', bg: '#FEF3C7' },
    { cls: 'Ball_021_1', label: '🔴 Ball-H', color: '#EF4444', bg: '#FEE2E2' },
    { cls: 'IR_021_1',   label: '🔴 IR-H',   color: '#6D28D9', bg: '#EDE9FE' },
    { cls: 'OR_021_6_1', label: '🔴 OR-H',   color: '#1D4ED8', bg: '#DBEAFE' },
    { cls: 'OR_007_6_1', label: '⚠️ OR-L',  color: '#3B82F6', bg: '#DBEAFE' },
    { cls: 'IR_007_1',   label: '⚠️ IR-L',  color: '#8B5CF6', bg: '#EDE9FE' },
    { cls: 'IR_014_1',   label: '🔶 IR-M',   color: '#7C3AED', bg: '#EDE9FE' },
  ];

  grid.innerHTML = items.map(item => `
    <button class="adviser-preset-btn"
            style="color:${item.color};border-color:${item.color};background:${item.bg}"
            onclick="loadAdviserPreset('${item.cls}')">
      ${item.label}
    </button>
  `).join('');
}

function loadAdviserPreset(cls) {
  const vals = PRESETS[cls];
  if (!vals) return;
  currentValues = [...vals];
  updateAllCtxSliders();
  showToast(`Loaded: ${FAULT_META[cls]?.label}`, 'info', 1200);
}

// ── Chat setup ───────────────────────────────────────────────
function setupChat() {
  // Analyse button
  document.getElementById('btn-analyse')?.addEventListener('click', runAnalysis);

  // Send button
  document.getElementById('btn-send')?.addEventListener('click', () => {
    sendUserMessage();
  });

  // Enter key
  document.getElementById('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  });

  // Quick questions
  const qqContainer = document.getElementById('quick-questions');
  if (qqContainer) {
    qqContainer.innerHTML = QUICK_QUESTIONS.map(q => `
      <button class="quick-q" onclick="askQuickQuestion('${q.replace(/'/g, "\\'")}')">${q}</button>
    `).join('');
  }

  // Clear chat
  document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
    document.getElementById('chat-messages').innerHTML = '';
    postWelcomeMessage();
    lastAdvice = null; lastPrediction = null;
    document.getElementById('current-context-display').innerHTML =
      '<div style="font-size:.78rem;color:var(--clr-text-muted);text-align:center;padding:1rem">No analysis run yet</div>';
  });
}

// ── Welcome message ──────────────────────────────────────────
function postWelcomeMessage() {
  appendSystemMsg('Session started — BearingIQ AI Adviser v1.0');
  appendBotMsg(
    `👋 **Hello! I'm BearingIQ AI**, your intelligent bearing fault adviser.\n\n` +
    `I can help you:\n` +
    `• 🔮 Predict bearing fault type from sensor data\n` +
    `• ⚠️ Assess severity and urgency\n` +
    `• 🔧 Recommend maintenance actions\n` +
    `• 📊 Explain signal features\n` +
    `• 💬 Answer your engineering questions\n\n` +
    `**Set your sensor values on the left**, then click **Analyse** to get started.`
  );
}

// ── Run full analysis ────────────────────────────────────────
async function runAnalysis() {
  const btn = document.getElementById('btn-analyse');
  setLoading(btn, true);
  appendUserMsg('Analyse current sensor readings');
  showTyping();

  try {
    const result = await apiFetch('/adviser', {
      method: 'POST',
      body: JSON.stringify({
        features: currentValues,
        model: 'random_forest',
        message: ''
      })
    });

    lastPrediction = result.prediction;
    lastAdvice     = result.advice;

    hideTyping();
    updateContextDisplay(result.prediction);
    appendAdviceReport(result.advice, result.prediction);

  } catch (e) {
    hideTyping();
    appendBotMsg('❌ Could not reach the backend. Please ensure Flask server is running on port 5000.');
  } finally {
    setLoading(btn, false);
  }
}

// ── Send user question ───────────────────────────────────────
async function sendUserMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendUserMsg(msg);
  showTyping();

  if (!lastPrediction) {
    // Auto-run analysis first
    try {
      const result = await apiFetch('/adviser', {
        method: 'POST',
        body: JSON.stringify({ features: currentValues, model: 'random_forest', message: msg })
      });
      lastPrediction = result.prediction;
      lastAdvice     = result.advice;
      hideTyping();
      updateContextDisplay(result.prediction);
      if (result.advice.chat_response) {
        appendBotMsg(result.advice.chat_response);
      } else {
        appendAdviceReport(result.advice, result.prediction);
      }
    } catch (e) {
      hideTyping();
      appendBotMsg('❌ Backend not reachable. Please start Flask server.');
    }
    return;
  }

  try {
    const result = await apiFetch('/adviser', {
      method: 'POST',
      body: JSON.stringify({ features: currentValues, model: 'random_forest', message: msg })
    });
    hideTyping();
    if (result.advice.chat_response) {
      appendBotMsg(result.advice.chat_response);
    } else {
      appendBotMsg('I analyzed your question but could not generate a specific response. Try asking about replacement, root cause, safety, or lubrication.');
    }
  } catch (e) {
    hideTyping();
    appendBotMsg('⚠️ Request failed. Please check your connection to the backend.');
  }
}

function askQuickQuestion(q) {
  const input = document.getElementById('chat-input');
  if (input) input.value = q;
  sendUserMessage();
}

// ── Context display ──────────────────────────────────────────
function updateContextDisplay(prediction) {
  const container = document.getElementById('current-context-display');
  if (!container) return;

  const m     = FAULT_META[prediction.predicted_class] || {};
  const ftype = prediction.fault_type;
  const sev   = prediction.severity;
  const sevColors = { 0:'#10B981', 1:'#F59E0B', 2:'#F97316', 3:'#EF4444' };
  const sevLabels = { 0:'Healthy', 1:'Low', 2:'Moderate', 3:'Critical' };

  container.innerHTML = `
    <div style="margin-bottom:.75rem">
      <span class="context-result-pill"
            style="color:${m.color};border-color:${m.color};background:${m.color}18">
        ${m.icon || '🔧'} ${m.label || prediction.predicted_class}
      </span>
      <span style="font-size:.72rem;color:${sevColors[sev]};font-weight:700;margin-left:.5rem">
        ● ${sevLabels[sev]}
      </span>
    </div>
    <div style="font-size:.72rem;color:var(--clr-text-muted);margin-bottom:.5rem">
      Confidence: <strong style="color:${m.color}">${(prediction.confidence*100).toFixed(1)}%</strong>
    </div>
    <div class="context-features">
      ${FEATURES.map((f, i) => `
        <div class="ctx-feat"><strong>${f}:</strong> ${fmt(currentValues[i], 4)}</div>
      `).join('')}
    </div>
  `;
}

// ── Append advice report card ────────────────────────────────
function appendAdviceReport(advice, prediction) {
  const m         = FAULT_META[prediction.predicted_class] || {};
  const sevColors = { 0:'#10B981', 1:'#F59E0B', 2:'#F97316', 3:'#EF4444' };
  const sevColor  = sevColors[advice.severity] || '#999';

  const mainLines = advice.main_advice.map(l =>
    `<div class="advice-line">${mdToHtml(l)}</div>`
  ).join('');

  const anomalyLines = advice.anomalies.length
    ? advice.anomalies.map(a =>
        `<div class="advice-anomaly">${mdToHtml(a)}</div>`
      ).join('')
    : '<div class="advice-line" style="color:var(--clr-text-muted)">No anomalies detected.</div>';

  const diffLines = advice.differential.length
    ? advice.differential.map(d => `<div class="advice-line">${mdToHtml(d)}</div>`).join('')
    : '';

  const html = `
    <div class="advice-report">
      <div class="advice-report-header">
        <div class="adviser-avatar" style="background:linear-gradient(135deg,${m.color},${sevColor})">🤖</div>
        <div>
          <div style="font-weight:700;font-size:.95rem">Diagnostic Report</div>
          <div style="font-size:.72rem;color:var(--clr-text-muted)">${new Date().toLocaleTimeString()}</div>
        </div>
        <span class="advice-severity-badge ml-auto"
              style="color:${sevColor};border-color:${sevColor};background:${sevColor}18">
          ${advice.severity_label}
        </span>
      </div>
      <div class="advice-body">
        <div class="advice-section">
          <div class="advice-section-title">📋 Main Advice</div>
          ${mainLines}
        </div>
        <div class="advice-section">
          <div class="advice-section-title">⚡ Signal Anomalies</div>
          ${anomalyLines}
        </div>
        ${advice.differential.length ? `
        <div class="advice-section">
          <div class="advice-section-title">🔎 Differential</div>
          ${diffLines}
        </div>` : ''}
        <div class="advice-section">
          <div class="advice-section-title">🎯 Confidence</div>
          <div class="advice-line">${mdToHtml(advice.confidence_msg)}</div>
        </div>
        ${advice.distance_info?.distance_from_normal !== undefined ? `
        <div class="advice-section">
          <div class="advice-section-title">📏 Distance from Normal</div>
          <div class="advice-line">Feature-space distance from healthy baseline:
            <strong style="color:${sevColor}">${advice.distance_info.distance_from_normal}</strong>
          </div>
        </div>` : ''}
      </div>
    </div>
  `;

  appendRawToChat(html, 'bot');
  scrollChat();
}

// ── Chat DOM helpers ─────────────────────────────────────────
function appendSystemMsg(text) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  messages.insertAdjacentHTML('beforeend',
    `<div class="msg-system">${text}</div>`);
  scrollChat();
}

function appendBotMsg(text) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  messages.insertAdjacentHTML('beforeend', `
    <div class="msg-bot">
      <div class="msg-bot-avatar">🤖</div>
      <div class="msg-bot-bubble">${mdToHtml(text)}</div>
    </div>
  `);
  scrollChat();
}

function appendUserMsg(text) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  messages.insertAdjacentHTML('beforeend', `
    <div class="msg-user">
      <div class="msg-user-bubble">${escapeHtml(text)}</div>
    </div>
  `);
  scrollChat();
}

function appendRawToChat(html, role) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  if (role === 'bot') {
    messages.insertAdjacentHTML('beforeend', `
      <div class="msg-bot">
        <div class="msg-bot-avatar">🤖</div>
        <div style="max-width:90%">${html}</div>
      </div>
    `);
  } else {
    messages.insertAdjacentHTML('beforeend', html);
  }
  scrollChat();
}

let typingEl = null;
function showTyping() {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  typingEl = document.createElement('div');
  typingEl.className = 'typing-indicator';
  typingEl.innerHTML = `
    <div class="msg-bot-avatar" style="width:32px;height:32px;background:linear-gradient(135deg,#7C3AED,#4F46E5);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0">🤖</div>
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  messages.appendChild(typingEl);
  scrollChat();
}

function hideTyping() {
  typingEl?.remove();
  typingEl = null;
}

function scrollChat() {
  const messages = document.getElementById('chat-messages');
  if (messages) messages.scrollTop = messages.scrollHeight;
}

// ── Markdown-lite renderer ───────────────────────────────────
function mdToHtml(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#F0F4FF;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:.85em">$1</code>')
    .replace(/\n  •/g, '<br>&nbsp;&nbsp;•')
    .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function populateSensSelect() {
  // Not needed on adviser page, just defensive
}
