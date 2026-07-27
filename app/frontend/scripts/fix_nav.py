import re

with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Mobile Layout for 3D Bearing
old_media = '@media(max-width:1000px) { .sci-row, .fault-compare, .freq-formula { grid-template-columns: 1fr; } .sci-hero-inner { grid-template-columns: 1fr; } .bearing-3d-wrap { display: none; } }'
new_media = '@media(max-width:1000px) { .sci-row, .fault-compare, .freq-formula { grid-template-columns: 1fr; } .sci-hero-inner { grid-template-columns: 1fr; justify-items: center; text-align: center; } .bearing-3d-wrap { transform: scale(0.65); margin: -40px 0; } }'
content = content.replace(old_media, new_media)

# Fix 2: Navigation Logic "Next" buttons
# Add Next to Science page
next_science = '''
  <div style="text-align: center; margin-top: 3rem; margin-bottom: 1rem;">
    <button class="btn btn-lg btn-pri" onclick="goto('signals')" style="font-size:1.1rem; padding: 1rem 2rem; border-radius:30px;">
      Next: Signals & Dataset 📡 →
    </button>
  </div>
</div>
</div>
<!-- 
     PAGE: SIGNALS & DATASET
 -->
'''
content = content.replace('</div>\n</div>\n<!-- \n     PAGE: SIGNALS & DATASET\n -->', next_science)

# Add Next to Signals page (after CSV comparison, which we will inject next)
next_signals = '''
  <div style="text-align: center; margin-top: 3rem; margin-bottom: 1rem;">
    <button class="btn btn-lg btn-pri" onclick="goto('dashboard')" style="font-size:1.1rem; padding: 1rem 2rem; border-radius:30px; background:#4F46E5; border-color:#4F46E5;">
      Next: ML Prediction Dashboard 🚀 →
    </button>
  </div>
</div>
</div>
'''
# find the end of page-signals
# page-signals ends with </div>\n</div>\n<div class="page" id="page-dashboard"> (actually it ends with dashboard page start)
page_dash_marker = '<!-- \n     PAGE: DASHBOARD\n -->'
idx = content.find(page_dash_marker)
if idx != -1:
    # Need to find the preceding </div>\n</div>
    before_dash = content[:idx]
    if before_dash.strip().endswith('</div>\n</div>'):
        # replace the last </div>\n</div>
        trimmed = before_dash.rstrip()
        trimmed = trimmed[:-12] # remove '</div></div>'
        content = trimmed + next_signals + '\n' + content[idx:]

with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Basic Layout and Nav Updated')
