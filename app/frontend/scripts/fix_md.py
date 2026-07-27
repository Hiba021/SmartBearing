with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We want to replace the broken mdToHtml function. 
# We'll search for 'function mdToHtml(t){' and replace up to '}'
def fix_mdToHtml(match):
    # Just return a clean one-liner
    return "function mdToHtml(t){ return t.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>').replace(/\\*(.+?)\\*/g,'<em>$1</em>').replace(/\\n\\s*\\n•/g,'<br>•').replace(/\\n\\s*\\n/g,'<br>'); }"

content = re.sub(r'function mdToHtml\(t\)\{.*?; \}', fix_mdToHtml, content, flags=re.DOTALL)

with open('c:/BearingDataSet/app/frontend/BearingIQ_complete.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("mdToHtml fixed!")
