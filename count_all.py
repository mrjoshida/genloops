import sys
code = open('engine.js').read()
# extremely safe javascript bracket counter!
lines = code.split('\n')
bal = 0
in_block_comment = False
for i, line in enumerate(lines):
    if in_block_comment:
        if '*/' in line:
            in_block_comment = False
            line = line.split('*/')[1]
        else: continue
    
    if '/*' in line:
        in_block_comment = True
        line = line.split('/*')[0]
        
    line = line.split('//')[0]
    
    # skip single/double quote string literals and regex literals naively
    if '"' in line or "'" in line or "`" in line or 'match' in line or 'paramRegex' in line:
        continue

    for c in line:
        if c == '{': bal += 1
        elif c == '}': bal -= 1
        
    if bal < 0:
        print(f"Negative balance at {i+1} : {line}")
        bal = 0

print("Global balance at EOF:", bal)
