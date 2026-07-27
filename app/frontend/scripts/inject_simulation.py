import re
import os

with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Sidebar
nav_target = '<div class="nav-item" data-page="signals"><span class="nav-item-icon">📡</span>Signals & Dataset<span class="nav-badge" style="background:#10b981;color:white">NEW</span></div>'
new_nav = '<div class="nav-item" data-page="simulation"><span class="nav-item-icon">⚡</span>Live Simulation<span class="nav-badge" style="background:#ef4444;color:white">PRO</span></div>'
content = content.replace(nav_target, nav_target + '\n    ' + new_nav)

# 2. Update Next Button in Signals Page
# We need to find the specific next button injected previously
old_next_signals = '''<button class="btn btn-lg btn-pri" onclick="goto('dashboard')" style="font-size:1.1rem; padding: 1rem 2rem; border-radius:30px; background:#4F46E5; border-color:#4F46E5;">
      Next: ML Prediction Dashboard 🚀 →
    </button>'''
new_next_signals = '''<button class="btn btn-lg btn-pri" onclick="goto('simulation')" style="font-size:1.1rem; padding: 1rem 2rem; border-radius:30px; background:#ef4444; border-color:#ef4444; box-shadow: 0 0 20px rgba(239,68,68,0.5);">
      Next: Live Fault Simulation ⚡ →
    </button>'''
content = content.replace(old_next_signals, new_next_signals)

# 3. HTML for Simulation Page
sim_html = '''
<!-- 
     PAGE: SIMULATION
 -->
<div class="page" id="page-simulation">
<style>
.sim-dash { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; height: calc(100vh - 120px); background: #000; border-radius: 20px; overflow: hidden; border: 2px solid #334155; font-family: 'JetBrains Mono', monospace; }
.sim-col { display: flex; flex-direction: column; padding: 2rem; position: relative; }
.sim-col.left { background: radial-gradient(circle at center, #0f172a, #000); border-right: 2px solid #1e293b; align-items: center; justify-content: center; }
.sim-col.right { background: #020617; gap: 1rem; }

/* Dynamic 3D Bearing */
.dyn-3d-wrap { width: 300px; height: 300px; perspective: 800px; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.dyn-3d-wrap.fault-zoom { transform: scale(1.6); }

.dyn-3d { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; animation: bSpin 5s linear infinite; }
@keyframes bSpin { from{transform: rotateX(25deg) rotateZ(0deg)} to{transform: rotateX(25deg) rotateZ(360deg)} }

.dyn-out { position: absolute; inset: 0; border-radius: 50%; border: 30px solid #1e293b; box-shadow: inset 0 0 15px #000, 0 0 30px rgba(16,185,129,0.2); transition: all 0.3s; }
.dyn-in { position: absolute; inset: 70px; border-radius: 50%; border: 25px solid #334155; box-shadow: 0 0 20px rgba(16,185,129,0.3); transition: all 0.3s; }
.dyn-balls { position: absolute; inset: 0; border-radius: 50%; animation: bRoll 2.5s linear infinite; }
@keyframes bRoll { from{transform: rotate(0deg)} to{transform: rotate(360deg)} }

.dyn-ball { position: absolute; width: 28px; height: 28px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #94a3b8, #475569); top: 50%; left: 50%; transform-origin: 0 0; transition: all 0.3s; }
.dyn-shaft { position: absolute; inset: 125px; border-radius: 50%; background: radial-gradient(circle, #475569, #0f172a); }

/* Fault Glowing States */
.fault-state-ir .dyn-in { border-color: #ef4444; box-shadow: 0 0 40px #ef4444, inset 0 0 20px #ef4444; }
.fault-state-or .dyn-out { border-color: #f97316; box-shadow: 0 0 40px #f97316, inset 0 0 20px #f97316; }
.fault-state-b .dyn-ball:nth-child(1) { background: radial-gradient(circle at 35% 35%, #f59e0b, #b45309); box-shadow: 0 0 30px #f59e0b; }

/* Control Panel */
.sim-controls { background: #0f172a; padding: 1.5rem; border-radius: 12px; border: 1px solid #334155; display: flex; flex-direction: column; gap: 1rem; }
.sim-btn { width: 100%; padding: 1rem; border-radius: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; border: none; transition: all 0.2s; font-size: 1.2rem; }
.btn-inject { background: #ef4444; color: #fff; box-shadow: 0 0 20px rgba(239,68,68,0.4); }
.btn-inject:hover { background: #dc2626; box-shadow: 0 0 30px rgba(239,68,68,0.7); transform: scale(1.02); }
.btn-restore { background: #10b981; color: #fff; box-shadow: 0 0 20px rgba(16,185,129,0.4); display: none; }
.btn-restore:hover { background: #059669; box-shadow: 0 0 30px rgba(16,185,129,0.7); transform: scale(1.02); }

.radio-group { display: flex; gap: 1rem; justify-content: space-between; }
.rad-label { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.9rem; cursor: pointer; }
.rad-label input { width: 18px; height: 18px; cursor: pointer; }

/* Telemetry & Alert */
.sim-kpis { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
.skpi { background: #0f172a; padding: 1rem; border-radius: 12px; border: 1px solid #1e293b; text-align: center; }
.skpi-val { font-size: 1.8rem; font-weight: 800; color: #10b981; transition: color 0.3s; }
.skpi-lbl { font-size: 0.7rem; color: #64748b; text-transform: uppercase; }

.sim-alert { position: absolute; top: 2rem; left: 50%; transform: translateX(-50%) translateY(-150%); background: rgba(239,68,68,0.95); color: #fff; padding: 1rem 2rem; border-radius: 12px; border: 2px solid #fca5a5; box-shadow: 0 10px 40px rgba(239,68,68,0.6); text-align: center; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: 10; width: 80%; backdrop-filter: blur(5px); }
.sim-alert.active { transform: translateX(-50%) translateY(0); }
.sim-alert h2 { margin: 0 0 0.5rem 0; font-size: 1.5rem; letter-spacing: 1px; }
.sim-alert p { margin: 0; font-size: 0.85rem; font-family: 'Inter', sans-serif; }
.alert-flash { animation: flashRed 1s infinite alternate; }
@keyframes flashRed { from{box-shadow: 0 0 20px #ef4444} to{box-shadow: 0 0 60px #ef4444} }

/* Oscilloscope */
.osc-wrap { flex: 1; background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; padding: 1rem; position: relative; overflow: hidden; }
.osc-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(51, 65, 85, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(51, 65, 85, 0.4) 1px, transparent 1px); background-size: 40px 40px; }

@media(max-width:1000px) { .sim-dash{grid-template-columns: 1fr; height: auto;} .dyn-3d-wrap{width:200px; height:200px;} }
</style>

<div class="sim-dash">
  <!-- LEFT: Physical View -->
  <div class="sim-col left">
    <div class="sim-alert" id="sim-alert">
      <h2 id="sa-title">⚠ CRITICAL FAULT DETECTED</h2>
      <p id="sa-desc">Description of the fault.</p>
    </div>
    
    <div style="position:absolute; top:2rem; left:2rem; color:#10b981; font-weight:800; font-size:1.2rem; letter-spacing:2px; text-shadow: 0 0 10px #10b981;" id="sim-status">SYSTEM NORMAL</div>
    
    <div class="dyn-3d-wrap" id="sim-3d">
      <div class="dyn-3d">
        <div class="dyn-out"></div>
        <div class="dyn-in"></div>
        <div class="dyn-balls">
          <div class="dyn-ball" style="transform:translate(-50%,-50%) rotate(0deg) translateX(105px)"></div>
          <div class="dyn-ball" style="transform:translate(-50%,-50%) rotate(45deg) translateX(105px)"></div>
          <div class="dyn-ball" style="transform:translate(-50%,-50%) rotate(90deg) translateX(105px)"></div>
          <div class="dyn-ball" style="transform:translate(-50%,-50%) rotate(135deg) translateX(105px)"></div>
          <div class="dyn-ball" style="transform:translate(-50%,-50%) rotate(180deg) translateX(105px)"></div>
          <div class="dyn-ball" style="transform:translate(-50%,-50%) rotate(225deg) translateX(105px)"></div>
          <div class="dyn-ball" style="transform:translate(-50%,-50%) rotate(270deg) translateX(105px)"></div>
          <div class="dyn-ball" style="transform:translate(-50%,-50%) rotate(315deg) translateX(105px)"></div>
        </div>
        <div class="dyn-shaft"></div>
      </div>
    </div>
    
    <div style="position:absolute; bottom:2rem; left:2rem; color:#64748b; font-size:0.8rem;">MOTOR LOAD: 1 HP<br>RPM: 1772</div>
  </div>
  
  <!-- RIGHT: Data & Controls -->
  <div class="sim-col right">
    
    <div class="sim-controls">
      <div class="radio-group">
        <label class="rad-label"><input type="radio" name="simfault" value="ir" checked> Inner Race</label>
        <label class="rad-label"><input type="radio" name="simfault" value="or"> Outer Race</label>
        <label class="rad-label"><input type="radio" name="simfault" value="b"> Ball Fault</label>
      </div>
      <button class="sim-btn btn-inject" id="btn-sim-inject" onclick="triggerSimFault()">INJECT DEFECT</button>
      <button class="sim-btn btn-restore" id="btn-sim-restore" onclick="restoreSimHealth()">RESTORE HEALTH</button>
    </div>
    
    <div class="sim-kpis">
      <div class="skpi"><div class="skpi-val" id="sk-rms">0.021</div><div class="skpi-lbl">RMS Energy</div></div>
      <div class="skpi"><div class="skpi-val" id="sk-kur">2.98</div><div class="skpi-lbl">Kurtosis</div></div>
      <div class="skpi"><div class="skpi-val" id="sk-ml">0%</div><div class="skpi-lbl">ML Fault Confidence</div></div>
    </div>
    
    <div style="font-size:0.8rem; color:#94a3b8; margin-top:0.5rem; text-transform:uppercase;">Live Telemetry (Drive End)</div>
    <div class="osc-wrap">
      <div class="osc-grid"></div>
      <canvas id="osc-canvas" style="position:relative; z-index:2;"></canvas>
    </div>
    
    <div style="text-align: right; margin-top: 1rem;">
      <button class="btn btn-pri" onclick="goto('dashboard')" style="background:#4F46E5; border-color:#4F46E5;">Proceed to ML Dashboard →</button>
    </div>
  </div>
</div>
</div>
'''

# Find end of page-signals and inject sim_html
page_dash_marker = '<!-- \n     PAGE: DASHBOARD\n -->'
idx = content.find(page_dash_marker)
if idx != -1:
    content = content[:idx] + sim_html + '\n' + content[idx:]

# 4. Javascript for Simulation
sim_js = '''
<script>
let simActive = false;
let simOscChart = null;
let simData = Array(200).fill(0);
let simIter = 0;
let simInterval = null;

function initSimulationChart() {
    if(!document.getElementById('osc-canvas')) return;
    const ctx = document.getElementById('osc-canvas').getContext('2d');
    if(simOscChart) simOscChart.destroy();
    
    simOscChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(200).fill(''),
            datasets: [{
                data: simData,
                borderColor: '#10b981',
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: { min: -5, max: 5, display: false },
                x: { display: false }
            },
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
    
    if(!simInterval) simInterval = setInterval(updateOscilloscope, 50);
}

function updateOscilloscope() {
    if(!simOscChart) return;
    simIter++;
    
    // Generate next point
    let val = Math.sin(simIter * 0.5) * (Math.random() * 0.1);
    
    if(simActive) {
        const fType = document.querySelector('input[name="simfault"]:checked').value;
        if(fType === 'ir' && simIter % 10 === 0) val += (2 + Math.random() * 2);
        if(fType === 'or' && simIter % 15 === 0) val += (3 + Math.random() * 2);
        if(fType === 'b'  && simIter % 12 === 0) val += (1.5 + Math.random() * 1.5);
    }
    
    simData.push(val);
    simData.shift();
    
    simOscChart.update();
    
    // Update KPIs with jitter
    if(simActive) {
        const fType = document.querySelector('input[name="simfault"]:checked').value;
        let baseRms = fType==='or'? 0.9 : (fType==='ir'? 0.6 : 0.4);
        let baseKur = fType==='or'? 6.5 : (fType==='ir'? 5.2 : 4.0);
        
        document.getElementById('sk-rms').textContent = (baseRms + Math.random()*0.1).toFixed(3);
        document.getElementById('sk-kur').textContent = (baseKur + Math.random()*0.3).toFixed(2);
        document.getElementById('sk-ml').textContent = (96 + Math.random()*3).toFixed(1) + '%';
        
        document.getElementById('sk-rms').style.color = '#ef4444';
        document.getElementById('sk-kur').style.color = '#ef4444';
        document.getElementById('sk-ml').style.color = '#ef4444';
        simOscChart.data.datasets[0].borderColor = fType==='or'?'#f97316':(fType==='ir'?'#ef4444':'#f59e0b');
    } else {
        document.getElementById('sk-rms').textContent = (0.02 + Math.random()*0.005).toFixed(3);
        document.getElementById('sk-kur').textContent = (2.9 + Math.random()*0.2).toFixed(2);
        document.getElementById('sk-ml').textContent = '0%';
        
        document.getElementById('sk-rms').style.color = '#10b981';
        document.getElementById('sk-kur').style.color = '#10b981';
        document.getElementById('sk-ml').style.color = '#10b981';
        simOscChart.data.datasets[0].borderColor = '#10b981';
    }
}

function triggerSimFault() {
    simActive = true;
    document.getElementById('btn-sim-inject').style.display = 'none';
    document.getElementById('btn-sim-restore').style.display = 'block';
    
    const fType = document.querySelector('input[name="simfault"]:checked').value;
    const wrap = document.getElementById('sim-3d');
    
    wrap.className = 'dyn-3d-wrap fault-zoom fault-state-' + fType;
    
    const status = document.getElementById('sim-status');
    status.textContent = 'FAULT DETECTED';
    status.style.color = '#ef4444';
    status.style.textShadow = '0 0 10px #ef4444';
    
    const alert = document.getElementById('sim-alert');
    const at = document.getElementById('sa-title');
    const ad = document.getElementById('sa-desc');
    
    if(fType === 'ir') {
        at.textContent = '🔴 INNER RACE FAULT';
        ad.textContent = 'Mechanical shocks detected on the rotating inner ring. Probable cause: extreme shaft misalignment or overloading. ML Model highly confident. Action: Replace within 7 days.';
    } else if(fType === 'or') {
        at.textContent = '🟠 OUTER RACE FAULT';
        ad.textContent = 'Severe impacts on the stationary outer race. Probable cause: housing contamination or improper installation. Immediate load reduction required.';
    } else {
        at.textContent = '🟡 BALL FAULT';
        ad.textContent = 'Complex shock pattern from rolling element spalling. Probable cause: poor lubrication or metal fatigue. Action: Schedule maintenance check.';
    }
    
    alert.classList.add('active', 'alert-flash');
}

function restoreSimHealth() {
    simActive = false;
    document.getElementById('btn-sim-inject').style.display = 'block';
    document.getElementById('btn-sim-restore').style.display = 'none';
    
    const wrap = document.getElementById('sim-3d');
    wrap.className = 'dyn-3d-wrap';
    
    const status = document.getElementById('sim-status');
    status.textContent = 'SYSTEM NORMAL';
    status.style.color = '#10b981';
    status.style.textShadow = '0 0 10px #10b981';
    
    const alert = document.getElementById('sim-alert');
    alert.classList.remove('active', 'alert-flash');
}

// Hook into goto so the chart initializes when page opens
const originalGoto = goto;
goto = function(page) {
    originalGoto(page);
    if(page === 'simulation') {
        setTimeout(initSimulationChart, 100);
    }
}
</script>
'''

# insert sim_js before </body>
body_end = content.rfind('</body>')
if body_end != -1:
    content = content[:body_end] + sim_js + '\n' + content[body_end:]

with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Simulation page injected successfully.")
