import re

with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'r', encoding='utf-8') as f:
    content = f.read()

chatbot_html = '''
  <div class="sci-row full" style="margin-top: 2rem;">
    <div class="sci-panel" style="padding:0; overflow:hidden; display:flex; flex-direction:column; height:500px; border:2px solid #6366F1;">
      <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding:1rem 1.5rem; display:flex; align-items:center; gap:1rem; color:#fff;">
        <div style="font-size:2rem;">🤖</div>
        <div>
          <h3 style="margin:0; font-size:1.1rem; font-weight:800;">BearingIQ Educational AI</h3>
          <div style="font-size:0.75rem; opacity:0.8;">Ask me anything about bearings, frequencies, or the CWRU dataset!</div>
        </div>
      </div>
      
      <div id="ai-chat-body" style="flex:1; background:#F8FAFC; padding:1.5rem; overflow-y:auto; display:flex; flex-direction:column; gap:1rem;">
        <div style="align-self:flex-start; background:#fff; padding:1rem; border-radius:12px; border-bottom-left-radius:2px; box-shadow:0 2px 5px rgba(0,0,0,0.05); max-width:80%; font-size:0.9rem; color:#334155; border:1px solid #E2E8F0;">
          Hello! I'm the BearingIQ AI Adviser. I can help explain the engineering physics, characteristic frequencies, MATLAB data processing, or anything else you've seen on these pages. What would you like to know?
        </div>
      </div>
      
      <div style="background:#fff; border-top:1px solid #E2E8F0; padding:1rem; display:flex; gap:0.5rem;">
        <input type="text" id="ai-chat-input" placeholder="Type your question here (e.g. 'What is RMS?' or 'Explain BPFI')..." style="flex:1; padding:0.75rem 1rem; border:1px solid #CBD5E1; border-radius:30px; font-size:0.9rem; outline:none;" onkeypress="if(event.key==='Enter') sendChatMessage()">
        <button onclick="sendChatMessage()" style="background:#4F46E5; color:#fff; border:none; border-radius:30px; padding:0 1.5rem; font-weight:700; cursor:pointer; transition:all 0.2s;">Send</button>
      </div>
    </div>
  </div>
'''

chatbot_js = '''
<script>
const aiKnowledge = {
    'rms': "RMS (Root Mean Square) is a statistical measure of the magnitude of a varying quantity. In vibration analysis, it represents the overall energy of the vibration signal. A sudden increase in RMS usually indicates severe overall wear or damage in the bearing.",
    'kurtosis': "Kurtosis measures the 'tailedness' of the probability distribution. A perfectly healthy bearing signal is Gaussian noise with a kurtosis of ~3. When impacts from faults occur, they create high-amplitude spikes (fat tails), causing the kurtosis to rise significantly (e.g., >4 or 5).",
    'crest': "Crest factor is the ratio of the peak amplitude to the RMS value. It is highly sensitive to early-stage defects, where a single sharp crack causes a high peak but hasn't yet increased the overall RMS energy.",
    'bpfi': "BPFI stands for Ball Pass Frequency Inner race. It is the frequency at which rolling elements pass over a specific defect on the inner ring. Because the inner ring rotates, the defect moves in and out of the load zone, creating a modulated amplitude.",
    'bpfo': "BPFO stands for Ball Pass Frequency Outer race. It's the frequency at which balls pass a defect on the stationary outer ring. Because the outer ring is fixed and constantly in the load zone, impacts occur at a very steady, unmodulated rate.",
    'ftf': "FTF stands for Fundamental Train Frequency. It represents the rotational speed of the cage that holds the rolling elements together. Faults on the cage itself will produce vibrations at the FTF.",
    'bsf': "BSF is the Ball Spin Frequency. It's the rate at which a defect on a rolling element (ball) strikes the inner and outer races as the ball spins around its own axis.",
    'edm': "EDM stands for Electro-Discharge Machining. It's a highly precise method used by CWRU researchers to intentionally burn tiny, controlled pits (e.g. 0.007 inches) into the bearing races or balls without mechanically stressing the surrounding metal. This provides a perfectly controlled 'ground truth' defect.",
    'cwru': "The Case Western Reserve University (CWRU) dataset is the gold standard benchmark for bearing fault diagnosis in Machine Learning. It provides raw acceleration data for healthy and faulty bearings under various loads (0-3 HP).",
    'mat': ".mat files are standard MATLAB data files. In the CWRU dataset, they contain the raw 1D arrays of accelerometer readings (e.g. X105_DE_time) recorded at 48,000 samples per second.",
    'de': "DE stands for Drive End. It's the accelerometer mounted closest to the motor coupling, directly above the tested bearing. It captures the strongest and clearest vibration signals.",
    'fe': "FE stands for Fan End. It's mounted at the opposite end of the motor. Signals here are heavily damped because the vibration has to travel through the motor shaft and housing.",
    'ba': "BA stands for Base Accelerometer. It measures vibrations transmitted into the mounting structure. These signals are the weakest and most noisy.",
    'window': "We use windowing to chop the massive continuous vibration signal into smaller, manageable chunks (2048 samples). This allows us to extract features rapidly and create thousands of training examples for the ML model from a single recording."
};

function sendChatMessage() {
    const input = document.getElementById('ai-chat-input');
    const text = input.value.trim();
    if(!text) return;
    
    appendMessage(text, 'user');
    input.value = '';
    
    // Simulate thinking
    setTimeout(() => {
        let response = "I'm sorry, I don't have specific information on that. Try asking about RMS, Kurtosis, BPFI, BPFO, EDM, the CWRU dataset, or how we process .mat files into features!";
        const lower = text.toLowerCase();
        
        // Simple keyword matching
        for(let key in aiKnowledge) {
            if(lower.includes(key)) {
                response = aiKnowledge[key];
                break;
            }
        }
        
        appendMessage(response, 'ai');
    }, 600);
}

function appendMessage(text, sender) {
    const body = document.getElementById('ai-chat-body');
    const msg = document.createElement('div');
    
    if(sender === 'user') {
        msg.style.cssText = "align-self:flex-end; background:#4F46E5; color:#fff; padding:0.75rem 1rem; border-radius:12px; border-bottom-right-radius:2px; max-width:80%; font-size:0.9rem;";
    } else {
        msg.style.cssText = "align-self:flex-start; background:#fff; color:#334155; padding:0.75rem 1rem; border-radius:12px; border-bottom-left-radius:2px; box-shadow:0 2px 5px rgba(0,0,0,0.05); border:1px solid #E2E8F0; max-width:80%; font-size:0.9rem; line-height:1.5;";
    }
    
    msg.textContent = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
}
</script>
'''

# Find insertion point: right before the "Next: ML Prediction Dashboard 🚀 →" button
if 'Next: ML Prediction Dashboard' in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'Next: ML Prediction Dashboard' in line:
            # The button is in a div, we want to insert before the div
            for j in range(i, -1, -1):
                if '<div style="text-align: center; margin-top: 3rem;' in lines[j]:
                    lines.insert(j, chatbot_html)
                    break
            break
            
    body_end = len(lines) - 1
    for i in range(len(lines)-1, -1, -1):
        if '</body>' in lines[i]:
            body_end = i
            break
    lines.insert(body_end, chatbot_js)
    
    with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('AI Chatbot successfully injected.')
else:
    print('Could not find injection point.')
