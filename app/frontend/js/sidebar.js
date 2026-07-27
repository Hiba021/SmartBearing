document.write(`
<aside class="sidebar" id="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">⚙</div>
    <div><span class="logo-name">BearingIQ</span><span class="logo-sub">ML DIAGNOSTICS</span></div>
  </div>
  <nav class="sidebar-nav">
    <span class="nav-label">Navigation</span>
    <a href="BearingIQ_complete.html#intro" onclick="sessionStorage.setItem('goto','intro'); if(window.goto) { goto('intro'); return false; }" class="nav-item" data-page="intro"><span class="nav-item-icon">📖</span>Introduction</a>
    <a href="BearingIQ_complete.html#science" onclick="sessionStorage.setItem('goto','science'); if(window.goto) { goto('science'); return false; }" class="nav-item" data-page="science"><span class="nav-item-icon">🔬</span>Bearing Science</a>
    <a href="BearingIQ_complete.html#signals" onclick="sessionStorage.setItem('goto','signals'); if(window.goto) { goto('signals'); return false; }" class="nav-item" data-page="signals"><span class="nav-item-icon">📡</span>Signals &amp; Dataset</a>
    <a href="BearingIQ_complete.html#dashboard" onclick="sessionStorage.setItem('goto','dashboard'); if(window.goto) { goto('dashboard'); return false; }" class="nav-item" data-page="dashboard"><span class="nav-item-icon">🏠</span>Dashboard</a>
    <a href="BearingIQ_complete.html#predict" onclick="sessionStorage.setItem('goto','predict'); if(window.goto) { goto('predict'); return false; }" class="nav-item" data-page="predict"><span class="nav-item-icon">🔮</span>Predict</a>
    <a href="BearingIQ_complete.html#analysis" onclick="sessionStorage.setItem('goto','analysis'); if(window.goto) { goto('analysis'); return false; }" class="nav-item" data-page="analysis"><span class="nav-item-icon">📊</span>Analysis</a>
    <a href="BearingIQ_complete.html#adviser" onclick="sessionStorage.setItem('goto','adviser'); if(window.goto) { goto('adviser'); return false; }" class="nav-item" data-page="adviser"><span class="nav-item-icon">🤖</span>AI Adviser<span class="nav-badge">AI</span></a>
    <a href="BearingIQ_complete.html#mlai" onclick="sessionStorage.setItem('goto','mlai'); if(window.goto) { goto('mlai'); return false; }" class="nav-item" data-page="mlai"><span class="nav-item-icon">🧠</span>AI/ML Foundations<span class="nav-badge" style="background:#7C3AED">DL</span></a>
    <a href="BearingIQ_complete.html#report" onclick="sessionStorage.setItem('goto','report'); if(window.goto) { goto('report'); return false; }" class="nav-item" data-page="report"><span class="nav-item-icon">📄</span>Report</a>
    
    <span class="nav-label" style="margin-top:.75rem">Labs &amp; Tools</span>
    <a href="signal-laboratory.html" class="nav-item" id="nav-lab" data-page="signal-laboratory"><span class="nav-item-icon">🧪</span>Signal Laboratory<span class="nav-badge" style="background:#06B6D4;color:white">LAB</span></a>
    <a href="live-simulation-page.html" class="nav-item" id="nav-live" data-page="live-simulation-page"><span class="nav-item-icon">⚡</span>Live Simulation<span class="nav-badge" style="background:#10B981;color:white">LIVE</span></a>
    <a href="ai-features.html" class="nav-item" id="nav-ai" data-page="ai-features"><span class="nav-item-icon">🧠</span>AI Features Lab<span class="nav-badge" style="background:#8B5CF6;color:white">AI</span></a>
    <a href="signal-pipeline.html" class="nav-item" id="nav-pipe" data-page="signal-pipeline"><span class="nav-item-icon">🏭</span>Signal Pipeline<span class="nav-badge" style="background:#F59E0B;color:white">NEW</span></a>
  </nav>
  <div class="sidebar-footer"><strong>BearingIQ v1.0</strong>CWRU Bearing Dataset · 48 kHz<br>Fully offline — no backend needed</div>
</aside>
`);

// Add active state based on current URL path
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop();
  if (currentPath && currentPath !== 'BearingIQ_complete.html') {
    // For standalone lab pages, highlight based on href matching
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      const href = item.getAttribute('href');
      if (href === currentPath) {
        item.classList.add('active');
      }
    });
  }
});
