import os

html1 = """<!-- 
     PAGE: BEARING SCIENCE
 -->
<div class="page" id="page-science">
<style>
.sci-hero { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%); border-radius: var(--rx); padding: 3rem; color: #fff; position: relative; overflow: hidden; margin-bottom: 2.5rem; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.sci-hero-inner { display: grid; grid-template-columns: 1fr auto; gap: 2rem; align-items: center; }
.sci-hero-tag { display: inline-flex; align-items: center; gap: .5rem; background: rgba(99,102,241,.3); border: 1px solid rgba(99,102,241,.5); border-radius: 20px; padding: 4px 14px; font-size: .72rem; font-weight: 700; letter-spacing: .5px; margin-bottom: 1rem; color: #a5b4fc; }
.sci-hero h1 { font-size: 2.8rem; font-weight: 900; letter-spacing: -1px; line-height: 1.1; margin-bottom: .75rem; background: linear-gradient(to right, #60a5fa, #a78bfa, #f0abfc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.sci-hero p { font-size: 1rem; color: #cbd5e1; max-width: 600px; line-height: 1.7; }
.bearing-3d-wrap { width: 220px; height: 220px; perspective: 600px; flex-shrink: 0; }
.bearing-3d { width: 220px; height: 220px; position: relative; transform-style: preserve-3d; animation: bearingSpin 8s linear infinite; }
@keyframes bearingSpin { from { transform: rotateX(20deg) rotateZ(0deg); } to { transform: rotateX(20deg) rotateZ(360deg); } }
.b-outer { position: absolute; inset: 0; border-radius: 50%; border: 22px solid #64748b; box-shadow: 0 0 30px rgba(100,116,139,.6), inset 0 0 20px rgba(100,116,139,.3); }
.b-inner { position: absolute; inset: 55px; border-radius: 50%; border: 18px solid #94a3b8; box-shadow: 0 0 20px rgba(148,163,184,.5); }
.b-shaft { position: absolute; inset: 90px; border-radius: 50%; background: radial-gradient(circle, #cbd5e1, #94a3b8); box-shadow: 0 0 15px rgba(203,213,225,.4); }
.b-balls { position: absolute; inset: 0; border-radius: 50%; animation: ballsSpin 4s linear infinite; }
@keyframes ballsSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.b-ball { position: absolute; width: 20px; height: 20px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #f8fafc, #cbd5e1); box-shadow: 0 0 10px rgba(248,250,252,.7); top: 50%; left: 50%; transform-origin: 0 0; }
.b-ball.ir-fault { background: radial-gradient(circle at 35% 35%, #ef4444, #b91c1c); box-shadow: 0 0 10px rgba(239,68,68,.7); }
.b-ball.or-fault { background: radial-gradient(circle at 35% 35%, #f97316, #c2410c); box-shadow: 0 0 10px rgba(249,115,22,.7); }
.b-ball.b-fault { background: radial-gradient(circle at 35% 35%, #f59e0b, #b45309); box-shadow: 0 0 10px rgba(245,158,11,.7); }
.sci-grid { display: flex; flex-direction: column; gap: 2rem; }
.sci-row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; }
.sci-row.full { grid-template-columns: 1fr; }
.sci-panel { background: var(--surf); border: 2px solid var(--brd); border-radius: var(--rl); padding: 2rem; box-shadow: var(--shm); transition: all .25s; height: 100%; }
.sci-panel:hover { transform: translateY(-3px); box-shadow: var(--shl); }
.sci-panel-dark { background: linear-gradient(135deg, #0f172a, #1e1b4b); border: 2px solid rgba(99,102,241,.3); border-radius: var(--rl); padding: 2rem; color: #e2e8f0; height: 100%; }
.sci-tag { display: inline-block; font-size: .62rem; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; margin-bottom: .75rem; }
.sci-h2 { font-size: 1.6rem; font-weight: 800; color: var(--pri); margin-bottom: .75rem; letter-spacing: -.5px; }
.sci-h2-light { font-size: 1.6rem; font-weight: 800; color: #a5b4fc; margin-bottom: .75rem; }
.sci-p { font-size: .95rem; color: var(--muted); line-height: 1.75; margin-bottom: .75rem; }
.sci-p-light { font-size: .95rem; color: #94a3b8; line-height: 1.75; margin-bottom: .75rem; }
.anatomy-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.anatomy-legend { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }
.aleg { display: flex; align-items: center; gap: .4rem; font-size: .72rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.fault-compare { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.fault-card { border-radius: var(--r); padding: 1.25rem; border: 2px solid; transition: all .2s; cursor: default; }
.fault-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.15); }
.fault-card-icon { font-size: 2rem; margin-bottom: .5rem; }
.fault-card-title { font-size: .88rem; font-weight: 800; margin-bottom: .4rem; }
.fault-card-body { font-size: .78rem; line-height: 1.6; color: var(--muted); }
.freq-formula { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: 1rem; }
.freq-box { padding: .85rem 1rem; border-radius: var(--r); border-left: 4px solid; }
.freq-box-name { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; margin-bottom: .2rem; }
.freq-box-formula { font-size: 1.05rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; margin-bottom: .2rem; }
.freq-box-desc { font-size: .72rem; color: var(--muted); line-height: 1.5; }
.pipe-container { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
.pipe-step { display: flex; align-items: center; gap: 1rem; background: var(--surf2); border: 2px solid var(--brd); padding: 1rem; border-radius: var(--rl); }
.pipe-icon { font-size: 2rem; }
.pipe-content h3 { font-size: 1.1rem; color: var(--pri); margin-bottom: .25rem; }
.pipe-content p { font-size: .85rem; color: var(--muted); }
.pipe-arrow-down { text-align: center; font-size: 1.5rem; color: var(--muted); }
@media(max-width:1000px) { .sci-row, .fault-compare, .freq-formula { grid-template-columns: 1fr; } .sci-hero-inner { grid-template-columns: 1fr; } .bearing-3d-wrap { display: none; } }
</style>

<div class="sci-hero">
  <div class="sci-hero-inner">
    <div>
      <div class="sci-hero-tag">🔬 Deep Dive</div>
      <h1>Understanding Bearing Fault Diagnosis</h1>
      <p>A complete educational guide to rolling element bearings — anatomy, failure mechanics, the CWRU benchmark dataset, and the diagnostic pipeline.</p>
    </div>
    <div class="bearing-3d-wrap">
      <div class="bearing-3d">
        <div class="b-outer"></div>
        <div class="b-inner"></div>
        <div class="b-balls">
          <div class="b-ball" style="transform:translate(-50%,-50%) rotate(0deg) translateX(78px)"></div>
          <div class="b-ball" style="transform:translate(-50%,-50%) rotate(45deg) translateX(78px)"></div>
          <div class="b-ball ir-fault" style="transform:translate(-50%,-50%) rotate(90deg) translateX(78px)"></div>
          <div class="b-ball" style="transform:translate(-50%,-50%) rotate(135deg) translateX(78px)"></div>
          <div class="b-ball or-fault" style="transform:translate(-50%,-50%) rotate(180deg) translateX(78px)"></div>
          <div class="b-ball" style="transform:translate(-50%,-50%) rotate(225deg) translateX(78px)"></div>
          <div class="b-ball b-fault" style="transform:translate(-50%,-50%) rotate(270deg) translateX(78px)"></div>
          <div class="b-ball" style="transform:translate(-50%,-50%) rotate(315deg) translateX(78px)"></div>
        </div>
        <div class="b-shaft"></div>
      </div>
    </div>
  </div>
</div>

<div class="sci-grid">
  <!-- 1. What is a Rolling Bearing? -->
  <div class="sci-row">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#EEF2FF;color:#4f46e5">📖 Introduction</div>
      <div class="sci-h2">1. What is a Rolling Bearing?</div>
      <p class="sci-p">Rolling element bearings are fundamental mechanical components engineered to allow smooth shaft rotation while drastically reducing friction. Without them, metal-on-metal contact would quickly destroy machinery.</p>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.75rem">
        <div style="padding:.65rem .9rem;background:var(--surf2);border-radius:var(--r);border-left:3px solid #64748b"><strong>Outer Race:</strong> The static ring fitted into the housing.</div>
        <div style="padding:.65rem .9rem;background:var(--surf2);border-radius:var(--r);border-left:3px solid #94a3b8"><strong>Inner Race:</strong> Rotates with the shaft. Experiences high stress.</div>
        <div style="padding:.65rem .9rem;background:var(--surf2);border-radius:var(--r);border-left:3px solid #cbd5e1"><strong>Balls:</strong> Rolling elements that distribute the load.</div>
        <div style="padding:.65rem .9rem;background:var(--surf2);border-radius:var(--r);border-left:3px solid #e2e8f0"><strong>Cage:</strong> Maintains equal spacing between the balls.</div>
      </div>
    </div>
    <div class="sci-panel">
      <div class="sci-tag" style="background:#FEF2F2;color:#dc2626">⚠️ Failure Causes</div>
      <div class="sci-h2">2. Why do Bearings Fail?</div>
      <p class="sci-p">Despite their durability, bearings degrade over time. Common causes include:</p>
      <ul style="color:var(--muted);font-size:.9rem;line-height:1.7;margin-left:1.5rem;margin-bottom:1rem">
        <li><strong>Fatigue:</strong> Micro-cracks form due to millions of load cycles.</li>
        <li><strong>Poor Lubrication:</strong> Increases friction and heat.</li>
        <li><strong>Misalignment:</strong> Uneven load distribution.</li>
        <li><strong>Contamination:</strong> Dirt or water entering the bearing.</li>
      </ul>
      <p class="sci-p">Over time, tiny subsurface cracks propagate to the surface, creating a small pit (spall). Whenever a ball rolls over this spall, it generates a sharp impact.</p>
    </div>
  </div>

  <!-- 3. Bearing Fault Types -->
  <div class="sci-row full">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#FFF7ED;color:#c2410c">🔍 Diagnostics</div>
      <div class="sci-h2">3. Bearing Fault Types</div>
      <p class="sci-p" style="margin-bottom:1.5rem">Depending on where the defect forms, the bearing produces a different vibration signature as rolling elements strike the damaged region.</p>
      <div class="fault-compare">
        <div class="fault-card" style="background:#fef2f2;border-color:#fca5a5">
          <div class="fault-card-icon">🔴</div>
          <div class="fault-card-title" style="color:#b91c1c">Inner Race Fault</div>
          <div class="fault-card-body">A defect on the inner ring. As the shaft rotates, the defect moves into and out of the load zone, producing impacts modulated by shaft speed.</div>
        </div>
        <div class="fault-card" style="background:#fff7ed;border-color:#fdba74">
          <div class="fault-card-icon">🟠</div>
          <div class="fault-card-title" style="color:#c2410c">Outer Race Fault</div>
          <div class="fault-card-body">A defect on the stationary outer ring. Balls strike it at a constant periodic rate, producing clear, unmodulated impulse spikes.</div>
        </div>
        <div class="fault-card" style="background:#fefce8;border-color:#fde047">
          <div class="fault-card-icon">🟡</div>
          <div class="fault-card-title" style="color:#a16207">Ball Fault</div>
          <div class="fault-card-body">A defect on the ball itself. As it spins and orbits, it strikes both the inner and outer races, creating a complex impact pattern.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 4 & 5. CWRU Dataset and Conditions -->
  <div class="sci-row">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#F0FDF4;color:#15803d">🗄️ Dataset Setup</div>
      <div class="sci-h2">4. The CWRU Dataset</div>
      <p class="sci-p">The Case Western Reserve University experiment used a 2 HP induction motor, torque transducer, and dynamometer.</p>
      <p class="sci-p">Accelerometers were mounted at three locations to measure vibrations (g):</p>
      <ul style="color:var(--muted);font-size:.9rem;line-height:1.7;margin-left:1.5rem">
        <li><strong>Drive End (DE):</strong> Closest to the motor coupling.</li>
        <li><strong>Fan End (FE):</strong> At the opposite end.</li>
        <li><strong>Base (BA):</strong> On the supporting structure.</li>
      </ul>
    </div>
    <div class="sci-panel">
      <div class="sci-tag" style="background:#EFF6FF;color:#2563eb">⚙️ Parameters</div>
      <div class="sci-h2">5. Operating Conditions</div>
      <p class="sci-p">Data was recorded under different motor loads, which slightly affect the RPM:</p>
      <ul style="color:var(--muted);font-size:.9rem;line-height:1.7;margin-left:1.5rem;margin-bottom:1rem">
        <li>0 HP (~1797 RPM)</li>
        <li><strong>1 HP (~1772 RPM) - Used in this project</strong></li>
        <li>2 HP (~1750 RPM)</li>
        <li>3 HP (~1730 RPM)</li>
      </ul>
      <p class="sci-p">By strictly using the 1 HP dataset, we ensure the Machine Learning model learns fault characteristics rather than variations caused by changing load/speed.</p>
    </div>
  </div>

  <!-- 6 & 7. EDM and Vibrations -->
  <div class="sci-row">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#F5F3FF;color:#7c3aed">⚡ EDM</div>
      <div class="sci-h2">6. Electro-Discharge Machining</div>
      <p class="sci-p">To create a scientifically controlled dataset, researchers intentionally seeded defects using EDM (spark erosion) before running the motor.</p>
      <div style="padding:1rem;background:var(--surf2);border-radius:var(--r);font-size:.85rem;color:var(--muted)">
        Healthy Bearing → EDM creates precise pit (e.g. 0.007") → Installed in rig → Motor rotates → Balls hit defect → Accelerometer records vibration.
      </div>
    </div>
    <div class="sci-panel">
      <div class="sci-tag" style="background:#ECFCCB;color:#3f6212">🌊 Physics</div>
      <div class="sci-h2">7. How Vibrations Generate</div>
      <p class="sci-p">A <strong>healthy bearing</strong> rolls smoothly, producing low-amplitude, random Gaussian noise (small vibrations).</p>
      <p class="sci-p">A <strong>faulty bearing</strong> experiences repeated mechanical impacts as elements cross the defect. This creates high-energy, impulsive vibration spikes that the accelerometer captures.</p>
    </div>
  </div>

  <!-- 8. Characteristic Frequencies -->
  <div class="sci-row full">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#E0E7FF;color:#4338ca">📐 Frequencies</div>
      <div class="sci-h2">8. Characteristic Frequencies</div>
      <p class="sci-p">Based on bearing geometry and shaft speed, we can calculate the exact frequencies at which impacts will occur:</p>
      <div class="freq-formula">
        <div class="freq-box" style="border-color:#ef4444;background:#fef2f2"><div class="freq-box-name" style="color:#b91c1c">BPFI</div><div class="freq-box-desc">Ball Pass Frequency Inner - Rate at which balls pass a defect on the inner race.</div></div>
        <div class="freq-box" style="border-color:#f97316;background:#fff7ed"><div class="freq-box-name" style="color:#c2410c">BPFO</div><div class="freq-box-desc">Ball Pass Frequency Outer - Rate at which balls pass a defect on the outer race.</div></div>
        <div class="freq-box" style="border-color:#f59e0b;background:#fefce8"><div class="freq-box-name" style="color:#a16207">BSF</div><div class="freq-box-desc">Ball Spin Frequency - Rate at which a defect on a ball strikes the races.</div></div>
        <div class="freq-box" style="border-color:#10b981;background:#f0fdf4"><div class="freq-box-name" style="color:#15803d">FTF</div><div class="freq-box-desc">Fundamental Train Frequency - The rotational speed of the cage.</div></div>
      </div>
    </div>
  </div>

  <!-- 9. Complete Pipeline -->
  <div class="sci-row full">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#CFFAFE;color:#0e7490">🔄 Workflow</div>
      <div class="sci-h2">9. Complete Diagnosis Pipeline</div>
      <div class="pipe-container">
        <div class="pipe-step"><div class="pipe-icon">🔩</div><div class="pipe-content"><h3>1. Mechanical Defect</h3><p>A pit forms on the bearing race or ball.</p></div></div>
        <div class="pipe-arrow-down">↓</div>
        <div class="pipe-step"><div class="pipe-icon">💥</div><div class="pipe-content"><h3>2. Mechanical Impacts</h3><p>Balls rolling over the pit generate physical shocks.</p></div></div>
        <div class="pipe-arrow-down">↓</div>
        <div class="pipe-step"><div class="pipe-icon">📡</div><div class="pipe-content"><h3>3. Accelerometer</h3><p>Sensor converts physical vibration into an electrical signal (48,000 times a second).</p></div></div>
        <div class="pipe-arrow-down">↓</div>
        <div class="pipe-step"><div class="pipe-content"><h3>4. Signal Processing & Windowing</h3><p>The long continuous signal is chopped into 2048-sample windows.</p></div></div>
        <div class="pipe-arrow-down">↓</div>
        <div class="pipe-step"><div class="pipe-content"><h3>5. Feature Extraction</h3><p>Statistical math (RMS, Kurtosis, etc.) condenses the window into 9 numbers.</p></div></div>
        <div class="pipe-arrow-down">↓</div>
        <div class="pipe-step"><div class="pipe-icon">🤖</div><div class="pipe-content"><h3>6. Machine Learning Model</h3><p>Random Forest or Centroid model classifies the 9 numbers into one of 10 fault states.</p></div></div>
      </div>
    </div>
  </div>
</div>
</div>
"""

html2 = """<!-- 
     PAGE: SIGNALS & DATASET
 -->
<div class="page" id="page-signals">
<style>
.sig-hero { background: #0f172a; border-radius: var(--rx); padding: 3rem; color: #fff; margin-bottom: 2rem; box-shadow: var(--shm); position: relative; overflow: hidden; }
.sig-hero::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(#334155 1px, transparent 1px); background-size: 20px 20px; opacity: 0.3; }
.sig-hero-inner { position: relative; z-index: 1; }
.sig-hero-tag { display: inline-block; padding: 4px 12px; background: rgba(16,185,129,.2); border: 1px solid rgba(16,185,129,.4); border-radius: 20px; font-size: .7rem; font-weight: 700; color: #34d399; margin-bottom: 1rem; }
.sig-hero h1 { font-size: 2.6rem; font-weight: 900; line-height: 1.1; margin-bottom: .75rem; color: #fff; }
.sig-hero p { font-size: 1rem; color: #cbd5e1; max-width: 600px; line-height: 1.6; }
.sig-code { background: #1e293b; border-radius: var(--r); padding: 1.5rem; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; font-size: .85rem; line-height: 1.6; overflow-x: auto; border: 1px solid #334155; }
.sig-code .comment { color: #64748b; }
.sig-code .keyword { color: #c678dd; }
.sig-code .string { color: #98c379; }
.sig-code .func { color: #61afef; }
.sig-code .num { color: #d19a66; }
.feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem; }
.feat-card { background: var(--surf); border: 1px solid var(--brd); border-radius: var(--r); padding: 1.25rem; transition: transform .2s; }
.feat-card:hover { transform: translateY(-3px); box-shadow: var(--shm); }
.feat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; }
.feat-title { font-weight: 700; font-size: .95rem; color: var(--pri); }
.feat-formula { background: var(--surf2); padding: .5rem; border-radius: 6px; font-family: monospace; font-size: .8rem; text-align: center; margin: .75rem 0; font-weight: 600; }
.feat-desc { font-size: .8rem; color: var(--muted); line-height: 1.5; }
.signal-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.signal-chart-box { background: var(--surf); border: 1px solid var(--brd); border-radius: var(--r); padding: 1rem; }
.signal-chart-box h4 { margin-bottom: .5rem; font-size: .9rem; text-align: center; font-weight: 700; }
</style>

<div class="sig-hero">
  <div class="sig-hero-inner">
    <div class="sig-hero-tag">📊 Dataset Reconstruction</div>
    <h1>Raw Signals to Machine Learning</h1>
    <p>How the original MATLAB files become the final Machine Learning dataset used in this dashboard. From signal windowing to feature extraction.</p>
  </div>
</div>

<div class="sci-grid">
  <div class="sci-row full">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#F3F4F6;color:#374151">📂 1. Exploring MATLAB Files</div>
      <div class="sci-h2">The Original Data Format</div>
      <p class="sci-p">The original CWRU dataset is provided as `.mat` (MATLAB) files. Each file corresponds to one specific experimental run.</p>
      <div class="sig-code" style="margin-bottom:1rem">
        <div>B007_1_123.mat <span class="comment"># Ball Fault, 0.007", 1 HP load</span></div>
        <div>IR014_1_175.mat <span class="comment"># Inner Race Fault, 0.014", 1 HP load</span></div>
        <div>OR021_6_1_239.mat <span class="comment"># Outer Race, 0.021", 6 o'clock position, 1 HP load</span></div>
      </div>
      <p class="sci-p">Inside these files are arrays. The main arrays we use are the <code>X[ID]_DE_time</code> variable, which is a long 1D array of the Drive End accelerometer readings.</p>
    </div>
  </div>

  <div class="sci-row full">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#E0F2FE;color:#0369a1">💻 2. Opening & Segmenting</div>
      <div class="sci-h2">Handling Large Vectors</div>
      <p class="sci-p">One file might contain 480,000 measurements (10 seconds of data at 48kHz). Machine learning algorithms cannot efficiently process a single 480,000-long vector. We must segment the signal into chunks (windows).</p>
      
      <div class="sig-code">
<span class="keyword">import</span> scipy.io
<span class="keyword">import</span> numpy <span class="keyword">as</span> np

<span class="comment"># 1. Load the MATLAB file</span>
mat = scipy.io.<span class="func">loadmat</span>(<span class="string">'IR014_1_175.mat'</span>)

<span class="comment"># 2. Extract the Drive End (DE) acceleration signal</span>
signal = mat[<span class="string">'X175_DE_time'</span>].<span class="func">flatten</span>()
<span class="comment"># signal shape is now (483903,) </span>

<span class="comment"># 3. Define the window size (2048 samples per window)</span>
window_size = <span class="num">2048</span>
num_windows = <span class="func">len</span>(signal) // window_size

<span class="comment"># 4. Reshape into a 2D array: (Number of Windows, Window Size)</span>
windows = signal[:num_windows * window_size].<span class="func">reshape</span>(num_windows, window_size)
<span class="comment"># Result: 236 windows, each containing 2048 samples</span>
      </div>
    </div>
  </div>

  <div class="sci-row full">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#FCE7F3;color:#be185d">📊 3. The 9 Statistical Features</div>
      <div class="sci-h2">Condensing 2048 Samples into 9 Numbers</div>
      <p class="sci-p">For each 2048-sample window, we calculate 9 time-domain statistical features. These features describe the "shape" of the vibration, capturing the impulsiveness of the faults.</p>
      
      <div class="feat-grid">
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">Maximum</span></div>
          <div class="feat-formula">np.max(window)</div>
          <div class="feat-desc">The highest acceleration peak in the window. Faults cause massive spikes.</div>
        </div>
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">Minimum</span></div>
          <div class="feat-formula">np.min(window)</div>
          <div class="feat-desc">The lowest negative peak.</div>
        </div>
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">Mean</span></div>
          <div class="feat-formula">np.mean(window)</div>
          <div class="feat-desc">The average acceleration. Usually near zero for bearings.</div>
        </div>
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">Standard Deviation</span></div>
          <div class="feat-formula">np.std(window)</div>
          <div class="feat-desc">Measures the spread/energy of the signal.</div>
        </div>
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">RMS (Root Mean Square)</span></div>
          <div class="feat-formula">np.sqrt(np.mean(window**2))</div>
          <div class="feat-desc">The overall energy of the vibration. Excellent indicator of overall wear.</div>
        </div>
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">Skewness</span></div>
          <div class="feat-formula">scipy.stats.skew(window)</div>
          <div class="feat-desc">Measures asymmetry of the signal around the mean.</div>
        </div>
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">Kurtosis</span></div>
          <div class="feat-formula">scipy.stats.kurtosis(window)</div>
          <div class="feat-desc">Measures the "tailedness". A healthy bearing has Kurtosis ≈ 3. Faulty bearings > 3 due to spikes.</div>
        </div>
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">Crest Factor</span></div>
          <div class="feat-formula">Max / RMS</div>
          <div class="feat-desc">Ratio of peak amplitude to RMS. High crest factor means sharp impacts.</div>
        </div>
        <div class="feat-card">
          <div class="feat-header"><span class="feat-title">Form Factor</span></div>
          <div class="feat-formula">RMS / Mean(Abs)</div>
          <div class="feat-desc">Ratio of RMS to the mean of absolute values.</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="sci-row full">
    <div class="sci-panel">
      <div class="sci-tag" style="background:#FEF9C3;color:#a16207">🤖 4. Rebuilding and Training</div>
      <div class="sci-h2">Creating the Final CSV for Machine Learning</div>
      <p class="sci-p">By applying the above pipeline to every MATLAB file, we compress millions of data points into a tidy CSV file. Each row in the CSV represents one window (2048 samples) and has 10 columns (9 features + 1 label).</p>
      
      <div class="sig-code">
<span class="comment"># Output CSV Structure</span>
Label,      Max,   Min,   Mean,  Std,   RMS,   Skew,  Kurt,  Crest, Form
Inner_007,  2.14, -1.98,  0.01,  0.45,  0.45,  0.05,  4.12,  4.75,  1.21
Outer_014,  4.88, -4.51,  0.02,  0.89,  0.89,  0.11,  5.80,  5.48,  1.34
Normal,     0.21, -0.22,  0.00,  0.07,  0.07,  0.01,  2.95,  3.00,  1.25
      </div>
      
      <p class="sci-p" style="margin-top:1rem">This final CSV is then split into Training and Testing sets, scaled using a StandardScaler, and fed into the classification model (e.g. Random Forest, SVM, or Centroid). Because we engineered specific time-domain features, the model easily learns the differences between a normal bearing and faulty ones.</p>
    </div>
  </div>

</div>
</div>
"""

# Let's read the full file, replace everything between <div class="page" id="page-science"> and <div class="page" id="page-dashboard">
with open("c:/BearingDataSet/app/frontend/BearingIQ_complete.html", "r", encoding="utf-8") as f:
    content = f.read()

import re
start_marker = '<div class="page" id="page-science">'
end_marker = '<!-- \n     PAGE: DASHBOARD\n -->'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + html1 + "\n" + html2 + "\n" + content[end_idx:]
    with open("c:/BearingDataSet/app/frontend/BearingIQ_complete.html", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully replaced.")
else:
    print("Could not find markers.")
