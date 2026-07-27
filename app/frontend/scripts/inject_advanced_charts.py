import re

with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'r', encoding='utf-8') as f:
    content = f.read()

# First, remove the old script block we injected previously
start_script = '<script>\nfunction generateVibration(type) {'
end_script = 'setTimeout(() => { if(typeof Chart !== \'undefined\') renderSignalChart(\'healthy\'); }, 1000);\n});\n</script>'
idx1 = content.find(start_script)
idx2 = content.find(end_script)
if idx1 != -1 and idx2 != -1:
    content = content[:idx1] + content[idx2 + len(end_script):]

# Remove the old injection HTML
old_html_start = '<div class="sci-tag" style="background:#1e293b;color:#cbd5e1;border:1px solid #475569">📈 4. Compare Different Signals</div>'
idx_html = content.find(old_html_start)
if idx_html != -1:
    # find enclosing <div class="sci-row full">
    b_idx = content.rfind('<div class="sci-row full">', 0, idx_html)
    # find closing </div>\n  </div>
    e_idx = content.find('</canvas>\n      </div>\n    </div>\n  </div>', idx_html)
    if b_idx != -1 and e_idx != -1:
        content = content[:b_idx] + content[e_idx + len('</canvas>\n      </div>\n    </div>\n  </div>'):]


new_html_injection = '''
  <div class="sci-row full">
    <div class="sci-panel sci-panel-dark">
      <div class="sci-tag" style="background:#1e293b;color:#cbd5e1;border:1px solid #475569">📈 4. Compare Different Signals</div>
      <div class="sci-h2-light">Multi-Sensor Signal Visualization</div>
      <p class="sci-p-light">The CWRU dataset provides data from Drive End (DE), Fan End (FE), and Base (BA) accelerometers. Because the mechanical shocks originate near the Drive End, you can observe that the vibration amplitude (g) decreases significantly at the Fan End and Base due to mechanical damping.</p>
      
      <div style="display:flex; flex-wrap:wrap; gap:2rem; margin-bottom:1rem; align-items:center;">
        <div>
          <div style="font-size:0.75rem; font-weight:700; color:#94a3b8; margin-bottom:0.5rem; text-transform:uppercase;">1. Select Fault Type</div>
          <div style="display:flex; gap:0.5rem;" id="sig-type-btns">
            <button class="btn btn-sm btn-pri active" style="background:#10b981;border-color:#10b981" onclick="setSigType('healthy', this)">Healthy</button>
            <button class="btn btn-sm btn-ghost" onclick="setSigType('ir', this)">Inner Race</button>
            <button class="btn btn-sm btn-ghost" onclick="setSigType('or', this)">Outer Race</button>
            <button class="btn btn-sm btn-ghost" onclick="setSigType('b', this)">Ball Fault</button>
          </div>
        </div>
        <div>
          <div style="font-size:0.75rem; font-weight:700; color:#94a3b8; margin-bottom:0.5rem; text-transform:uppercase;">2. Select Sensor Location</div>
          <div style="display:flex; gap:0.5rem;" id="sig-loc-btns">
            <button class="btn btn-sm btn-pri active" style="background:#6366f1;border-color:#6366f1" onclick="setSigLoc('de', this)">Drive End (DE)</button>
            <button class="btn btn-sm btn-ghost" onclick="setSigLoc('fe', this)">Fan End (FE)</button>
            <button class="btn btn-sm btn-ghost" onclick="setSigLoc('ba', this)">Base (BA)</button>
          </div>
        </div>
      </div>
      
      <div style="height:350px; background:#0f172a; border-radius:12px; padding:1rem; position:relative;">
        <canvas id="sig-canvas"></canvas>
      </div>
    </div>
  </div>
'''

new_script_injection = '''
<script>
let currentSigType = 'healthy';
let currentSigLoc = 'de';
let sigChart = null;

function setSigType(type, btn) {
    currentSigType = type;
    document.querySelectorAll('#sig-type-btns button').forEach(b => {
        b.className = 'btn btn-sm btn-ghost';
    });
    btn.className = 'btn btn-sm btn-pri active';
    if(type==='healthy') btn.style.cssText = 'background:#10b981;border-color:#10b981';
    if(type==='ir') btn.style.cssText = 'background:#ef4444;border-color:#ef4444';
    if(type==='or') btn.style.cssText = 'background:#f97316;border-color:#f97316';
    if(type==='b') btn.style.cssText = 'background:#f59e0b;border-color:#f59e0b';
    renderAdvancedSignalChart();
}

function setSigLoc(loc, btn) {
    currentSigLoc = loc;
    document.querySelectorAll('#sig-loc-btns button').forEach(b => {
        b.className = 'btn btn-sm btn-ghost';
    });
    btn.className = 'btn btn-sm btn-pri active';
    btn.style.cssText = 'background:#6366f1;border-color:#6366f1';
    renderAdvancedSignalChart();
}

function generateAdvancedVibration() {
    // Determine amplitude multiplier based on location (Damping)
    let locMult = 1.0;
    if(currentSigLoc === 'fe') locMult = 0.45; // Fan end is further, less amplitude
    if(currentSigLoc === 'ba') locMult = 0.15; // Base is furthest, heavily damped
    
    let t = Array.from({length: 1200}, (_, i) => i);
    let s = t.map(x => Math.sin(x*0.1) * (Math.random()*0.15)); // base noise
    
    // Add impulses for faults
    if(currentSigType === 'ir') s = s.map((v,i) => v + (i%55===0 ? (3+Math.random()*1.5) : (i%55===1 ? -(2+Math.random()) : 0)));
    if(currentSigType === 'or') s = s.map((v,i) => v + (i%38===0 ? (4+Math.random()*2) : (i%38===1 ? -(3+Math.random()*1.5) : 0)));
    if(currentSigType === 'b')  s = s.map((v,i) => v + (i%47===0 ? (2+Math.random()*3) : (i%47===1 ? -(1.5+Math.random()*2) : 0)));
    
    // Apply damping multiplier and add tiny sensor noise
    return s.map(v => (v * locMult) + (Math.random()*0.05*locMult));
}

function renderAdvancedSignalChart() {
    if(!document.getElementById('sig-canvas')) return;
    const ctx = document.getElementById('sig-canvas').getContext('2d');
    if(sigChart) sigChart.destroy();
    
    let color = '#10b981';
    let typeLabel = 'Healthy Bearing';
    if(currentSigType === 'ir') { color = '#ef4444'; typeLabel = 'Inner Race Fault (IR)'; }
    if(currentSigType === 'or') { color = '#f97316'; typeLabel = 'Outer Race Fault (OR)'; }
    if(currentSigType === 'b')  { color = '#f59e0b'; typeLabel = 'Ball Fault (B)'; }
    
    let locLabel = 'Drive End (DE)';
    if(currentSigLoc === 'fe') locLabel = 'Fan End (FE)';
    if(currentSigLoc === 'ba') locLabel = 'Base (BA)';
    
    sigChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 1200}, (_,i)=>(i/48000).toFixed(4)),
            datasets: [{
                label: `${locLabel} - ${typeLabel}`,
                data: generateAdvancedVibration(),
                borderColor: color,
                borderWidth: 1.2,
                pointRadius: 0,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: { 
                    min: -6, max: 6, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    title: { display: true, text: 'Acceleration (g)', color: '#94a3b8' },
                    ticks: { color: '#94a3b8' }
                },
                x: { 
                    grid: { display: false },
                    title: { display: true, text: 'Time (seconds) @ 48kHz', color: '#94a3b8' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 10 }
                }
            },
            plugins: { 
                legend: { labels: { color: '#fff', font: {size: 14} } } 
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if(typeof Chart !== 'undefined') renderAdvancedSignalChart(); }, 1000);
});
</script>
'''

# Find insertion point
if 'Condensing 2048 Samples into 9 Numbers' in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if '3. The 9 Statistical Features' in line:
            lines.insert(i-2, new_html_injection)
            break
            
    body_end = len(lines) - 1
    for i in range(len(lines)-1, -1, -1):
        if '</body>' in lines[i]:
            body_end = i
            break
    lines.insert(body_end, new_script_injection)
    
    with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('Advanced signal chart successfully injected.')
else:
    print('Could not find injection point.')
