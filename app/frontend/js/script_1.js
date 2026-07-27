
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
