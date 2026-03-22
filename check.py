code = open('engine.js').read()
lines = code.split('\n')
bal = 0
for i, line in enumerate(lines):
    # Strip comments
    line = line.split('//')[0]
    for c in line:
        if c == '{': bal += 1
        elif c == '}': bal -= 1
    if bal < 0:
        print(f"Balance went negative at line {i+1}: {line}")
        bal = 0 # reset to find subsequent ones
print("Final balance:", bal)
