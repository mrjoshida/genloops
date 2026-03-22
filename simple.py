code = open('engine.js').read().split('\n')
bal = 0
for i in range(684, 933):
    line = code[i].split('//')[0]
    if '`' in line: continue # skip lines with template literals to avoid false parsing
    for c in line:
        if c == '{': bal += 1
        elif c == '}': bal -= 1
        if bal < 0:
            print("Negative at:", i+1, line)
            bal = 0
print("Balance at 933:", bal)
