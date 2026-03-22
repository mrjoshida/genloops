import os, json, re

sketches_dir = './.local/sketches'

for file in sorted(os.listdir(sketches_dir)):
    if file == 'cyclones.js' or not file.endswith('.js'): continue
    
    with open(os.path.join(sketches_dir, file), 'r') as f:
        content = f.read()
        
        # Regex to extract the const obj
        # Note: this is tricky if the object has functions. Let's just dump the top 25 lines
        print(f"--- {file} ---")
        lines = content.split('\n')
        for i in range(min(25, len(lines))):
            print(lines[i])
