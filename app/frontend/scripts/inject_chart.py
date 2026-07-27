import re
with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'r', encoding='utf-8') as f:
    content = f.read()

script_to_inject = '''
<script>
function generateVibration(type) {
    let t = Array.from({length: 1000}, (_, i) => i);
    let s = t.map(x => Math.sin(x*0.1) * (Math.random()*0.1)); // base noise
    if(type === 'ir') s = s.map((v,i) => v + (i%50===0 ? 2+Math.random() : 0));
    if(type === 'or') s = s.map((v,i) => v + (i%30===0 ? 3+Math.random()*2 : 0));
    if(type === 'b')  s = s.map((v,i) => v + (i%40===0 ? 1.5+Math.random()*3 : 0));
    return s;
}

let sigChart = null;
function renderSignalChart(type) {
    if(!document.getElementById('sig-canvas')) return;
    const ctx = document.getElementById('sig-canvas').getContext('2d');
    if(sigChart) sigChart.destroy();
    
    let color = '#10b981';
    let label = 'Healthy Bearing';
    if(type === 'ir') { color = '#ef4444'; label = 'Inner Race Fault (IR)'; }
    if(type === 'or') { color = '#f97316'; label = 'Outer Race Fault (OR)'; }
    if(type === 'b')  { color = '#f59e0b'; label = 'Ball Fault (B)'; }
    
    sigChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 1000}, (_,i)=>i),
            datasets: [{
                label: label,
                data: generateVibration(type),
                borderColor: color,
                borderWidth: 1,
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
                y: { min: -5, max: 5, grid: { color: '#334155' } },
                x: { display: false }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if(typeof Chart !== 'undefined') renderSignalChart('healthy'); }, 1000);
});
</script>
'''

html_injection = '''
  <div class="sci-row full">
    <div class="sci-panel sci-panel-dark">
      <div class="sci-tag" style="background:#1e293b;color:#cbd5e1;border:1px solid #475569">📈 4. Compare Different Signals</div>
      <div class="sci-h2-light">Visualizing the Impacts</div>
      <p class="sci-p-light">When we plot the Drive End accelerometer data, we can clearly see the impulsive shocks created by different fault types. Healthy bearings produce random Gaussian noise, while faulty bearings produce sharp peaks.</p>
      
      <div style="display:flex;gap:1rem;margin-bottom:1rem">
        <button class="btn btn-pri" style="background:#10b981;border-color:#10b981" onclick="renderSignalChart('healthy')">Healthy</button>
        <button class="btn btn-pri" style="background:#ef4444;border-color:#ef4444" onclick="renderSignalChart('ir')">Inner Race</button>
        <button class="btn btn-pri" style="background:#f97316;border-color:#f97316" onclick="renderSignalChart('or')">Outer Race</button>
        <button class="btn btn-pri" style="background:#f59e0b;border-color:#f59e0b" onclick="renderSignalChart('b')">Ball Fault</button>
      </div>
      
      <div style="height:300px;background:#0f172a;border-radius:12px;padding:1rem">
        <canvas id="sig-canvas"></canvas>
      </div>
    </div>
  </div>
'''

if 'Condensing 2048 Samples into 9 Numbers' in content:
    lines = content.split('\\n')
    for i, line in enumerate(lines):
        if '3. The 9 Statistical Features' in line:
            lines.insert(i-2, html_injection)
            break
    
    body_end = len(lines) - 1
    for i in range(len(lines)-1, -1, -1):
        if '</body>' in lines[i]:
            body_end = i
            break
    lines.insert(body_end, script_to_inject)
    
    with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'w', encoding='utf-8') as f:
        f.write('\\n'.join(lines))
    print('Signal chart successfully injected.')
else:
    print('Could not find injection point.')
