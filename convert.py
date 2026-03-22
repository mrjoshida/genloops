import os, re, json

sketches_dir = './.local/sketches'

for file in os.listdir(sketches_dir):
    if file == 'cyclones.js' or not file.endswith('.js'): continue
    path = os.path.join(sketches_dir, file)
    
    with open(path, 'r') as f:
        content = f.read()
        
    # Extract metadata blocks using crude regex
    name_match = re.search(r'name:\s*"([^"]+)"', content)
    desc_match = re.search(r'description:\s*"([^"]+)"', content)
    mode_match = re.search(r'mode:\s*"([^"]+)"', content)
    
    name = name_match.group(1) if name_match else "Sketch"
    desc = desc_match.group(1) if desc_match else ""
    mode = mode_match.group(1) if mode_match else "P2D"
    
    # Extract parameters array string
    param_block = re.search(r'parameters:\s*\[([\s\S]*?)\]\s*,', content)
    
    params_jsdoc = ""
    if param_block:
        param_str = param_block.group(1)
        # Parse each object { id: "intensity", name: "Density", type: "slider", min: 0, max: 3, step: 1, default: 2 }
        objs = re.findall(r'\{([^}]+)\}', param_str)
        for obj in objs:
            id_val = re.search(r'id:\s*"([^"]+)"', obj)
            name_val = re.search(r'name:\s*"([^"]+)"', obj)
            type_val = re.search(r'type:\s*"([^"]+)"', obj)
            min_val = re.search(r'min:\s*([0-9.-]+)', obj)
            max_val = re.search(r'max:\s*([0-9.-]+)', obj)
            step_val = re.search(r'step:\s*([0-9.-]+)', obj)
            def_val = re.search(r'default:\s*([a-zA-Z0-9.-]+)', obj)
            
            if id_val and name_val:
                p_id = id_val.group(1)
                p_name = name_val.group(1)
                p_type = type_val.group(1) if type_val else "slider"
                p_def = def_val.group(1) if def_val else "0"
                
                if p_type == 'slider' and min_val and max_val and step_val:
                    params_jsdoc += f" * @param {{{p_type}}} {p_id} \"{p_name}\" [{min_val.group(1)}, {max_val.group(1)}, {step_val.group(1)}] {p_def}\n"
                else:
                    params_jsdoc += f" * @param {{{p_type}}} {p_id} \"{p_name}\" {p_def}\n"

    jsdoc = f"/**\n * @name \"{name}\"\n * @description \"{desc}\"\n * @mode \"{mode}\"\n *\n{params_jsdoc} */\n\n"
    
    # Extract setup and draw bodies
    setup_match = re.search(r'setup:\s*function\s*\([^\)]*\)\s*\{([\s\S]*?)\},\s*draw:\s*function', content)
    draw_match = re.search(r'draw:\s*function\s*\([^\)]*\)\s*\{([\s\S]*)\}\s*};', content)
    
    setup_body = setup_match.group(1) if setup_match else ""
    draw_body = draw_match.group(1) if draw_match else ""
    
    # Remove final export default if present in draw body by accident (though bounded by '};')
    
    # Strip p. occurrences safely
    setup_body = re.sub(r'\bp\.([a-zA-Z_]\w*)', r'\1', setup_body)
    draw_body = re.sub(r'\bp\.([a-zA-Z_]\w*)', r'\1', draw_body)
    
    final_output = jsdoc + "function setup() {" + setup_body + "}\n\nfunction draw() {" + draw_body + "}\n"
    
    with open(path, 'w') as f:
        f.write(final_output)
    print(f"Converted {file}")

