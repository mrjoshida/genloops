import esprima
try:
    code = open('engine.js').read()
    esprima.parseScript(code)
    print("Syntax OK!")
except Exception as e:
    print(f"Error: {e}")
