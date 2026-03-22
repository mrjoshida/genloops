const palettes = {
    moody: ['#0B0C10', '#1F2833', '#66FCF1', '#45A29E'],
    grayscale: ['#000000', '#FFFFFF', '#888888', '#333333'],
    cyberpunk: ['#09012F', '#FF007F', '#00FFFF', '#FFEA00'],
    earthy: ['#2C1A1D', '#F05D23', '#7A9E7E', '#EBCFB2'],
    lofi: ['#2B2D42', '#FF80A0', '#FDE74C', '#5BC0EB'],
    psychedelic: ['#5C0029', '#39FF14', '#04D9FF', '#FF5A09'],
    custom: ['#000000', '#FFFFFF', '#FF0000', '#0000FF']
};

const fps = 30;
let durationSecs = 8;
let numLoops = 1;
let totalFrames = durationSecs * fps;

import p5 from 'p5';

const localPalettes = import.meta.glob('./.local/palettes/*.json', { eager: true });

const coreSketchesRaw = import.meta.glob('./sketches/*.js', { as: 'raw', eager: true });
const localSketchesRaw = import.meta.glob('./.local/sketches/*.js', { as: 'raw', eager: true });

const sketchRegistry = {};
const sketchRawRegistry = {};

const allPaths = [...Object.keys(coreSketchesRaw), ...Object.keys(localSketchesRaw)];
allPaths.forEach(path => {
    const raw = coreSketchesRaw[path] || localSketchesRaw[path];
    if (raw) {
        sketchRegistry[path] = parseSketchString(raw);
        sketchRawRegistry[path] = raw;
    }
});


let activeSketch = null;
let currentPalette = palettes.moody;
let params = {}; // Dynamically holds values bound to UI

// UI References
const canvasContainer = document.getElementById('canvas-container');
const dynamicControls = document.getElementById('dynamic-controls');
const paletteSelect = document.getElementById('palette-select');

// Parse and Inject dynamically discovered custom color arrays
Object.keys(localPalettes).forEach(path => {
    const filename = path.split('/').pop().replace('.json', '');
    const paletteData = localPalettes[path].default || localPalettes[path];

    if (Array.isArray(paletteData) && paletteData.length >= 2) {
        // Register internally
        palettes[filename] = paletteData;

        // Build and append to UI before the manual 'custom' entry
        const opt = document.createElement('option');
        opt.value = filename;
        opt.innerText = filename.replace(/_/g, ' ') + ' (Local)';
        paletteSelect.insertBefore(opt, paletteSelect.querySelector('option[value="custom"]'));
    }
});
const sketchSelect = document.getElementById('sketch-select');
// Populate Sketch Select dynamically
sketchSelect.innerHTML = '';
allPaths.forEach(path => {
    let name = path.split('/').pop().replace('.js', '');
    if (path.includes('.local')) name += ' (Local)';
    const opt = document.createElement('option');
    opt.value = path;
    opt.innerText = name;
    sketchSelect.appendChild(opt);
});

const formatSelect = document.getElementById('format-select');
const btnPlay = document.getElementById('btn-play');
const btnExport = document.getElementById('btn-export');

// Editor DOM
const editorPanel = document.getElementById('editor-panel');
const btnEditSketch = document.getElementById('btn-edit-sketch');
const btnEditorRun = document.getElementById('btn-editor-run');
const btnEditorSave = document.getElementById('btn-editor-save');
const btnEditorClose = document.getElementById('btn-editor-close');
let editorInstance = null;

// Global Effects Shaders and Configs
const crtVert = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;
void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

const crtFrag = `
precision highp float;
varying vec2 vTexCoord;
uniform sampler2D tex0;
uniform float curvature;

vec2 crtCurve(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs(uv.yx) / vec2(curvature);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

void main() {
    vec2 uv = vTexCoord; 
    
    vec2 curvedUV = crtCurve(uv);
    
    if (curvedUV.x < 0.0 || curvedUV.x > 1.0 || curvedUV.y < 0.0 || curvedUV.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        vec4 texColor = texture2D(tex0, curvedUV);
        
        // Authentic 480i-style Intensity Scanlines (Thicker, more visible)
        float scanline = sin(curvedUV.y * 480.0 * 3.14159);
        // Map sine from [-1, 1] bounds to a brightness multiplier [0.85, 1.0]
        float scanMix = mix(0.85, 1.0, (scanline + 1.0) * 0.5);
        texColor.rgb *= scanMix;
        
        // Deep Vignette
        float vignette = curvedUV.x * curvedUV.y * (1.0 - curvedUV.x) * (1.0 - curvedUV.y);
        vignette = clamp(pow(16.0 * vignette, 0.25), 0.0, 1.0);
        texColor.rgb *= vignette;
        
        gl_FragColor = vec4(texColor.rgb, 1.0);
    }
}
`;

let ppSettings = { bloom: 15, crt: false, flipX: false, flipY: false };

document.getElementById('globalBloom').addEventListener('input', (e) => {
    ppSettings.bloom = parseInt(e.target.value);
    document.getElementById('globalBloom-display').innerText = ppSettings.bloom;
});
document.getElementById('crtEffect').addEventListener('change', (e) => {
    ppSettings.crt = e.target.checked;
});
document.getElementById('flipX').addEventListener('change', (e) => ppSettings.flipX = e.target.checked);
document.getElementById('flipY').addEventListener('change', (e) => ppSettings.flipY = e.target.checked);

const previewModal = document.getElementById('preview-modal');
const previewVideo = document.getElementById('preview-video');
const btnDownload = document.getElementById('btn-download');
const btnClosePreview = document.getElementById('btn-close-preview');

let currentFrame = 0;
let isPlaying = true;
let isRecording = false;
let recordFrameCount = 0;
let mediaRecorder = null;
let recordedChunks = [];
let pInstance = null;

// Update palette on change
const customColorsGroup = document.getElementById('custom-colors-group');
const customColorInputs = [
    document.getElementById('custom-color-1'),
    document.getElementById('custom-color-2'),
    document.getElementById('custom-color-3'),
    document.getElementById('custom-color-4')
];

paletteSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    currentPalette = palettes[val];
    if (val === 'custom') {
        customColorsGroup.style.display = 'block';
    } else {
        customColorsGroup.style.display = 'none';
    }
});

customColorInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        palettes.custom[index] = e.target.value;
        if (paletteSelect.value === 'custom') {
            currentPalette = palettes.custom;
        }
    });
});

// Global scale tracking
let globalScale = 1.0;
const scaleSlider = document.getElementById('scale-slider');
const scaleDisplay = document.getElementById('scale-display');
scaleSlider.addEventListener('input', (e) => {
    globalScale = parseFloat(e.target.value);
    scaleDisplay.innerText = globalScale.toFixed(1);
});

// Global render size tracking
let currentWidth = 1080;
let currentHeight = 1920;
let currentSketchPath = Object.keys(sketchRegistry)[0];

// Update sketch on change
sketchSelect.addEventListener('change', (e) => {
    if (isRecording) return; // Prevent abort mid-render
    currentSketchPath = e.target.value;

    // Sync Editor since it's now persistently loaded
    if (editorInstance) {
        loadDraftOrRawCodeIntoEditor();
    }

    loadAndRunSketch();
});

function loadDraftOrRawCodeIntoEditor() {
    const defaultRaw = sketchRawRegistry[currentSketchPath] || '// Source not found';
    const draftContent = localStorage.getItem('genloops_draft_' + currentSketchPath);

    // Setup flag to indicate modification status
    const isModified = (draftContent && draftContent !== defaultRaw);
    const isUpload = currentSketchPath.startsWith('local_upload_');

    if (isModified) {
        editorInstance.setValue(draftContent);
        document.getElementById('btn-editor-revert').style.display = 'inline-block';
    } else {
        editorInstance.setValue(defaultRaw);
        document.getElementById('btn-editor-revert').style.display = 'none';
    }
    updateSketchSelectName(isModified);
    updateEditorBadge(isModified, isUpload);
}

function updateEditorBadge(isModified, isUpload) {
    const badge = document.getElementById('editor-status-badge');
    if (!badge) return;
    if (isUpload) {
        badge.innerText = 'Local Upload';
        badge.style.background = '#2196F3';
    } else if (isModified) {
        badge.innerText = 'Draft (Unsaved)';
        badge.style.background = '#ff9800';
    } else {
        badge.innerText = 'Built-in';
        badge.style.background = '#666';
    }
}

function updateSketchSelectName(isModified) {
    const selectedOption = sketchSelect.options[sketchSelect.selectedIndex];
    if (!selectedOption) return;
    let baseName = selectedOption.innerText.replace(' *', '');
    if (isModified) {
        selectedOption.innerText = baseName + ' *';
    } else {
        selectedOption.innerText = baseName;
    }
}

let currentBlobUrl = null;

btnClosePreview.addEventListener('click', () => {
    previewModal.style.display = 'none';
    previewVideo.pause();
    previewVideo.src = '';
});

const durationSelect = document.getElementById('duration-select');
const loopsSelect = document.getElementById('loops-select');

durationSelect.addEventListener('change', (e) => {
    durationSecs = parseInt(e.target.value);
    totalFrames = durationSecs * fps;
    currentFrame = 0; // Prevent visual snapping
});

loopsSelect.addEventListener('change', (e) => {
    numLoops = parseInt(e.target.value);
    currentFrame = 0;
});

// Format change
formatSelect.addEventListener('change', (e) => {
    if (isRecording) return;
    const val = e.target.value;
    if (val === '9:16') { currentWidth = 1080; currentHeight = 1920; }
    else if (val === '16:9') { currentWidth = 1920; currentHeight = 1080; }
    else if (val === '1:1') { currentWidth = 1080; currentHeight = 1080; }
    else if (val === '4:5') { currentWidth = 1080; currentHeight = 1350; }

    // Completely rebuild engine and backend buffers on resize
    if (pInstance) loadAndRunSketch();
});

// Play/Pause
btnPlay.addEventListener('click', () => {
    if (!pInstance) return;
    isPlaying = !isPlaying;
    if (isPlaying) {
        pInstance.loop();
        btnPlay.innerText = 'Pause';
    } else {
        pInstance.noLoop();
        btnPlay.innerText = 'Play';
    }
});

let capturer = null;

function handleVideoBlob(blob) {
    currentBlobUrl = URL.createObjectURL(blob);

    // Display Preview Modal
    previewVideo.src = currentBlobUrl;
    previewModal.style.display = 'flex';

    // Re-bind download button actively to ensure fresh link mapping
    btnDownload.onclick = async () => {
        const defaultName = 'genloops_export_' + Date.now() + '.mp4';

        try {
            // Force a 'Save As' native OS dialog using the modern File System Access API
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultName,
                    types: [{
                        description: 'MP4 Video',
                        accept: { 'video/mp4': ['.mp4'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                btnClosePreview.click();
            } else {
                // Fallback
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style = 'display: none';
                a.href = currentBlobUrl;
                a.download = defaultName;
                a.click();
                document.body.removeChild(a);
            }
        } catch (err) {
            console.info('Save dialog cancelled or failed:', err);
        }
    };

    btnExport.innerText = 'Render Complete!';
    setTimeout(() => {
        btnExport.innerText = 'Render (MP4)';
        btnExport.style.backgroundColor = '';
        btnExport.style.color = '';
    }, 2000);
}

// Export (WebMWriter deterministic offline render)
btnExport.addEventListener('click', async () => {
    if (!pInstance || isRecording) return;

    // Pause live playback to take over manually
    isPlaying = false;
    btnPlay.innerText = 'Play';
    pInstance.noLoop();

    // Retrieve the user's desired resolution scale profile
    const exportConfig = document.getElementById('export-scale').value;

    // Default to Standard Web (1080p Web-Optimized)
    let exportScale = 1.0;
    let exportBitrate = 8_000_000; // 8 Mbps Default (~8-15MB constraint)

    if (exportConfig === 'uncompressed') {
        // Uncompressed: 1080p uncompressed equivalent
        exportScale = 1.0;
        exportBitrate = 35_000_000; // 35 Mbps for absolute highest fidelity (~40-60MB)
    } else if (exportConfig === 'small') {
        // Social Fast: 540p compressed
        exportScale = 0.5;
        exportBitrate = 2_500_000; // 2.5 Mbps suitable for 540p mobile HQ (~2-6MB)
    }

    isRecording = true;
    currentFrame = 0;

    btnExport.style.backgroundColor = '#d90000';
    btnExport.style.color = '#fff';

    const expWidth = Math.floor(currentWidth * exportScale);
    const expHeight = Math.floor(currentHeight * exportScale);

    // WebCodecs requires widths/heights to be multiples of 2.
    const safeWidth = expWidth % 2 === 0 ? expWidth : expWidth - 1;
    const safeHeight = expHeight % 2 === 0 ? expHeight : expHeight - 1;

    let muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: {
            codec: 'avc',
            width: safeWidth,
            height: safeHeight
        },
        fastStart: 'in-memory'
    });

    let videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: e => console.error("WebCodecs Encoding Error:", e)
    });

    videoEncoder.configure({
        codec: 'avc1.4d002a', // Main Profile, Level 4.2
        width: safeWidth,
        height: safeHeight,
        hardwareAcceleration: "prefer-hardware",
        bitrate: exportBitrate,
        framerate: fps
    });

    // Set up interceptor canvas if downscaling is requested (e.g. 1080p -> 540p)
    let exportCanvas = pInstance.domCanvas;
    let tempCtx = null;
    if (exportScale < 1.0) {
        exportCanvas = document.createElement('canvas');
        exportCanvas.width = safeWidth;
        exportCanvas.height = safeHeight;
        tempCtx = exportCanvas.getContext('2d', { willReadFrequently: true });
    }

    // Offline deterministic loop
    for (let f = 0; f < totalFrames; f++) {
        currentFrame = f;

        // Setup state for the current frame progression and definitively compose all layers
        pInstance.draw();

        // Force a 0ms yield to allow the browser GPU to definitively flush the drawn pixels 
        // to the canvas before we rip it into the video encoder
        await new Promise(r => setTimeout(r, 0));

        let frameTimeMicroSecs = (f * 1e6) / fps;

        if (exportScale < 1.0) {
            tempCtx.drawImage(pInstance.domCanvas, 0, 0, safeWidth, safeHeight);
            let frame = new VideoFrame(exportCanvas, { timestamp: frameTimeMicroSecs });
            videoEncoder.encode(frame);
            frame.close();
        } else {
            let frame = new VideoFrame(pInstance.domCanvas, { timestamp: frameTimeMicroSecs });
            videoEncoder.encode(frame);
            frame.close();
        }

        const pct = Math.floor((f / totalFrames) * 100);
        btnExport.innerText = `Recording: ${pct}%`;

        // Yield to the browser's main thread to allow the progress UI to paint and the WebCodecs encoder to breathe
        await videoEncoder.flush();
        await new Promise(r => window.requestAnimationFrame(r));
    }

    btnExport.innerText = 'Finalizing MP4 File...';
    await new Promise(r => setTimeout(r, 10)); // Yield for UI update

    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    // Create the Blob from Mp4Muxer Target
    const mp4Blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    handleVideoBlob(mp4Blob);
    isRecording = false;
});

function parseSketchString(rawText) {
    const params = [];
    let name = "Custom Sandbox Sketch";
    let desc = "";
    let mode = "P2D";

    const nameMatch = rawText.match(/@name\s+"([^"]+)"/);
    if (nameMatch) name = nameMatch[1];

    const modeMatch = rawText.match(/@mode\s+"([^"]+)"/i);
    if (modeMatch) mode = modeMatch[1].toUpperCase();

    // Parse params: @param {slider} id "name" [min, max, step] default
    const paramRegex = /@param\s+\{([^}]+)\}\s+(\w+)\s+"([^"]+)"\s*(?:\[([\d.]+),\s*([\d.]+),\s*([\d.]+)\])?\s*([\w.]+)/g;
    let match;
    while ((match = paramRegex.exec(rawText)) !== null) {
        let p = {
            type: match[1], id: match[2], name: match[3],
        };
        if (p.type === 'slider') {
            p.min = parseFloat(match[4]);
            p.max = parseFloat(match[5]);
            p.step = parseFloat(match[6]);
            p.default = parseFloat(match[7]);
        } else if (p.type === 'toggle') {
            p.default = match[7] === 'true';
        }
        params.push(p);
    }

    return {
        isSandboxed: true,
        name: name,
        description: desc,
        mode: mode,
        parameters: params,
        rawCode: rawText,
        setup: () => { },
        draw: () => { }
    };
}

// Build dynamic UI based on sketch parameters
function buildUI(sketchParams) {
    dynamicControls.innerHTML = '';
    params = {}; // Reset params

    sketchParams.forEach(param => {
        // Set default value
        params[param.id] = param.default;

        const row = document.createElement('div');
        row.className = 'control-group';

        const label = document.createElement('label');
        label.innerText = param.name;
        label.setAttribute('for', `param-${param.id}`);
        row.appendChild(label);

        if (param.type === 'slider') {
            const valDisplay = document.createElement('span');
            valDisplay.innerText = param.default;
            valDisplay.style.fontSize = '0.8rem';
            valDisplay.style.marginLeft = '10px';
            label.appendChild(valDisplay);

            const mainGroup = document.createElement('div');
            mainGroup.style.display = 'flex';
            mainGroup.style.flexDirection = 'column';

            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'dual-slider-container';

            const track = document.createElement('div');
            track.className = 'dual-slider-track';
            sliderContainer.appendChild(track);

            const highlight = document.createElement('div');
            highlight.className = 'dual-slider-highlight';
            highlight.style.left = '0%';
            highlight.style.width = '0%';
            highlight.style.display = 'none';
            sliderContainer.appendChild(highlight);

            const input = document.createElement('input');
            input.type = 'range';
            input.id = `param-${param.id}`;
            input.min = param.min;
            input.max = param.max;
            input.step = param.step;
            input.value = param.default;
            sliderContainer.appendChild(input);

            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                params[param.id] = val;
                valDisplay.innerText = val;
            });

            if (param.canModulate !== false) {
                // Initialize internal LFO state attached to param
                param.lfo = {
                    enabled: false,
                    speed: 1, // multiplier of base loop speed
                    min: param.min,
                    max: param.max
                };

                const minInput = document.createElement('input');
                minInput.type = 'range';
                minInput.min = param.min;
                minInput.max = param.max;
                minInput.step = param.step || ((param.max - param.min) / 100);
                minInput.value = param.min;
                minInput.style.display = 'none'; // hidden initially
                minInput.id = `param-min-${param.id}`;
                minInput.style.zIndex = '4';
                sliderContainer.appendChild(minInput);

                const maxInput = document.createElement('input');
                maxInput.type = 'range';
                maxInput.min = param.min;
                maxInput.max = param.max;
                maxInput.step = param.step || ((param.max - param.min) / 100);
                maxInput.value = param.max;
                maxInput.style.display = 'none'; // hidden initially
                maxInput.id = `param-max-${param.id}`;
                maxInput.style.zIndex = '5';
                sliderContainer.appendChild(maxInput);

                const updateHighlight = () => {
                    const range = param.max - param.min;
                    const minP = range === 0 ? 0 : (param.lfo.min - param.min) / range * 100;
                    const maxP = range === 0 ? 0 : (param.lfo.max - param.min) / range * 100;
                    highlight.style.left = minP + '%';
                    highlight.style.width = (maxP - minP) + '%';

                    valDisplay.innerText = `${Number(param.lfo.min).toFixed(2)} ⟷ ${Number(param.lfo.max).toFixed(2)}`;
                };

                minInput.addEventListener('input', (e) => {
                    let val = parseFloat(e.target.value);
                    if (val > param.lfo.max) {
                        val = param.lfo.max;
                        minInput.value = val;
                    }
                    param.lfo.min = val;
                    updateHighlight();
                });

                maxInput.addEventListener('input', (e) => {
                    let val = parseFloat(e.target.value);
                    if (val < param.lfo.min) {
                        val = param.lfo.min;
                        maxInput.value = val;
                    }
                    param.lfo.max = val;
                    updateHighlight();
                });

                const lfoHeader = document.createElement('div');
                lfoHeader.style.display = 'flex';
                lfoHeader.style.alignItems = 'center';
                lfoHeader.style.justifyContent = 'space-between';
                lfoHeader.style.marginTop = '6px';

                const lfoToggleWrapper = document.createElement('label');
                lfoToggleWrapper.style.fontSize = '0.75em';
                lfoToggleWrapper.style.color = '#888';
                lfoToggleWrapper.style.cursor = 'pointer';
                lfoToggleWrapper.style.display = 'flex';
                lfoToggleWrapper.style.alignItems = 'center';

                const lfoInput = document.createElement('input');
                lfoInput.type = 'checkbox';
                lfoInput.style.marginRight = '6px';

                lfoToggleWrapper.appendChild(lfoInput);
                lfoToggleWrapper.appendChild(document.createTextNode('Modulate (LFO)'));
                lfoHeader.appendChild(lfoToggleWrapper);

                const speedWrapper = document.createElement('div');
                speedWrapper.style.fontSize = '0.75em';
                speedWrapper.style.color = '#888';
                speedWrapper.style.display = 'none'; // Hidden by default
                speedWrapper.innerHTML = `<span style="margin-right:4px;">Speed:</span>`;
                const speedSelect = document.createElement('select');
                speedSelect.style.width = '55px';
                speedSelect.style.padding = '0px';
                speedSelect.style.border = '1px solid #333';
                speedSelect.style.background = '#1a1a1a';
                speedSelect.style.color = '#fff';
                speedSelect.style.borderRadius = '3px';
                [0.25, 0.5, 1, 2, 3, 4, 8].forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v;
                    opt.innerText = v + 'x';
                    if (v === 1) opt.selected = true;
                    speedSelect.appendChild(opt);
                });
                speedSelect.addEventListener('change', (e) => param.lfo.speed = parseFloat(e.target.value));
                speedWrapper.appendChild(speedSelect);
                lfoHeader.appendChild(speedWrapper);

                lfoInput.addEventListener('change', (e) => {
                    param.lfo.enabled = e.target.checked;
                    lfoToggleWrapper.style.color = e.target.checked ? '#00ffcc' : '#888';
                    speedWrapper.style.display = e.target.checked ? 'flex' : 'none';
                    if (e.target.checked) {
                        input.style.display = 'none';
                        minInput.style.display = 'block';
                        maxInput.style.display = 'block';
                        highlight.style.display = 'block';
                        updateHighlight();
                    } else {
                        input.style.display = 'block';
                        minInput.style.display = 'none';
                        maxInput.style.display = 'none';
                        highlight.style.display = 'none';
                        valDisplay.innerText = input.value;
                    }
                });

                mainGroup.appendChild(sliderContainer);
                mainGroup.appendChild(lfoHeader);
            } else {
                mainGroup.appendChild(sliderContainer);
            }
            row.appendChild(mainGroup);
        } else if (param.type === 'toggle') {
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `param-${param.id}`;
            input.checked = param.default;

            input.addEventListener('change', (e) => {
                params[param.id] = e.target.checked;
            });
            row.appendChild(input);
        }
        dynamicControls.appendChild(row);
    });
}

let currentP5 = null;

async function loadAndRunSketch() {
    // 1. Teardown existing instance cleanly
    if (currentP5) {
        currentP5.remove();
        currentP5 = null;
    }
    if (window.sandboxIframe) {
        window.sandboxIframe.remove();
        window.sandboxIframe = null;
    }
    canvasContainer.innerHTML = ''; // Ensure canvas element is wiped

    // 2. Load the requested module dynamically
    activeSketch = sketchRegistry[currentSketchPath];

    if (!activeSketch) {
        console.error("CRITICAL: activeSketch is undefined! Path:", currentSketchPath, "Keys:", Object.keys(sketchRegistry));
        activeSketch = { mode: "P2D", rawCode: "function setup(){createCanvas(100,100);} function draw(){background(255,0,0);}", parameters: [] };
    }

    buildUI(activeSketch.parameters);

    // Always use sandbox mode now
    // 3. Determine necessary rendering context mode (default P2D)
    let renderMode = activeSketch.mode === 'WEBGL' ? 'webgl' : 'p2d';

    const initialCtx = JSON.stringify({
        progress: 0,
        palette: currentPalette && currentPalette.length > 0 ? currentPalette : ['#000', '#fff', '#fff', '#fff'],
        params: params || {}
    });

    // 4. If Sandboxed, boot up the hidden Sandbox IFrame environment natively
    window.sandboxIframe = document.createElement('iframe');
    // Critical Fix: Do NOT use display:none or the Chromium GPU culls rendering inside the iframe!
    window.sandboxIframe.style.position = 'absolute';
    window.sandboxIframe.style.left = '-9999px';
    window.sandboxIframe.style.top = '-9999px';
    window.sandboxIframe.style.visibility = 'hidden';
    window.sandboxIframe.style.width = currentWidth + 'px';
    window.sandboxIframe.style.height = currentHeight + 'px';

    const srcdoc = `
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
                <script>
                window.ctx = ${initialCtx};
                window.ctx.loopNoise = function(x, y, p_val) { return 0; };
                </script>
                <style>body { margin: 0; padding: 0; }</style>
            </head>
            <body>
                <script>
                ${activeSketch.rawCode}
                
                // Sandbox Override injected by GenLoops Engine
                const _userSetup_ = window.setup;
                window.setup = function() {
                    // Pre-initialize a safe canvas environment so users can call drawing functions immediately
                    if (window.createCanvas) {
                        window.createCanvas(${currentWidth}, ${currentHeight}, ${renderMode === 'webgl' ? 'WEBGL' : 'P2D'});
                        
                        // Lock down their manual createCanvas to prevent breaking aspect ratios
                        const origCreateCanvas = window.createCanvas;
                        window.createCanvas = function(w, h, renderer) {
                            return origCreateCanvas(${currentWidth}, ${currentHeight}, ${renderMode === 'webgl' ? 'WEBGL' : 'P2D'});
                        };
                    }

                    if (_userSetup_) _userSetup_();
                    noLoop(); // Required for parent engine synchronous control
                };

                const _userDraw_ = window.draw;
                if (_userDraw_) {
                    window.draw = function() {
                        // Prevent additive blendMode bleeding across frames natively
                        if (window.blendMode && window.BLEND !== undefined) {
                            window.blendMode(window.BLEND);
                        }
                        
                        _userDraw_();
                        
                        // Hardware signal back to the parent indicating exactly when a physical draw completes
                        window._genloops_frame_rendered = true;
                    };
                }
                </script>
            </body>
            </html>
        `;
    window.sandboxIframe.srcdoc = srcdoc;
    document.body.appendChild(window.sandboxIframe);
    window.sandboxIframeWindow = window.sandboxIframe.contentWindow;

    // 4. Build the new engine enclosure
    const sketchEngine = (p) => {
        pInstance = p;

        let pgMain, pgBloom, pgCRT, crtShader;

        p.setup = () => {
            p.pixelDensity(1); // Force 1x physical resolution (kills the 44mb 4K render payload on Retina displays)

            // Only P2D is needed for the interception canvas! The WebGL operates in the iframe.
            // DO NOT override p.canvas, p5 must keep its native reference or cleanup memory leak loops fail!
            let renderer = p.createCanvas(currentWidth, currentHeight, p.P2D);
            renderer.parent(canvasContainer);
            renderer.id('active-genloops-canvas');

            p.frameRate(fps);

            // Ensure explicit reference to the DOM element for captureStream
            pInstance.domCanvas = renderer.elt;

            // Initialize Multi-Pass Rendering Framebuffers
            pgMain = p.createGraphics(currentWidth, currentHeight, p.P2D);
            pgBloom = p.createGraphics(currentWidth, currentHeight, p.P2D);
            pgCRT = p.createGraphics(currentWidth, currentHeight, p.WEBGL);
            crtShader = pgCRT.createShader(crtVert, crtFrag);
        };

        p.draw = () => {
            if (!activeSketch) return;

            // Loop math (calculated with fractional offset to support internal looping)
            const macroProgress = currentFrame / totalFrames; // 0.0 -> 1.0 exactly once
            const progress = (macroProgress * numLoops) % 1.0; // 0.0 -> 1.0 N times

            // Polar coordinates for seamless Perlin noise
            // angleFast handles the micro loops, angleSlow handles the overarching video timeframe
            const angleFast = p.TWO_PI * progress;
            const angleSlow = p.TWO_PI * macroProgress;

            const noiseRadius = 1.5;
            const nx = p.cos(angleFast) * noiseRadius + 100;
            const ny = p.sin(angleFast) * noiseRadius + 100;
            const polarNoise = p.noise(nx, ny);

            // A slow, sweeping 1D noise mapping for long-form generic evolutions
            const macroNoise = p.noise(p.cos(angleSlow) * 0.5 + 50, p.sin(angleSlow) * 0.5 + 50);

            // LFO Application wrapper
            let modulatedParams = { ...params };
            if (activeSketch && activeSketch.parameters) {
                activeSketch.parameters.forEach(param => {
                    if (param.lfo && param.lfo.enabled && param.type === 'slider') {
                        // Calculate explicit sine progression based on LFO speed
                        const lfoProgress = (progress * param.lfo.speed) % 1.0;
                        // Normalized sine mapping (0.0 to 1.0)
                        const modPhase = (Math.sin(lfoProgress * Math.PI * 2) + 1) / 2;

                        // Interpolate strictly between user-defined Min and Max bounds
                        let newVal = param.lfo.min + (param.lfo.max - param.lfo.min) * modPhase;

                        // We purposefully bypass `param.step` quantization during LFO modulation
                        // to ensure perfectly smooth organic floating-point transitions!

                        modulatedParams[param.id] = newVal;
                    }
                });
            }

            // Context object that gets passed to the dumb sketch modules
            const ctx = {
                progress: progress,
                macroProgress: macroProgress, // Sweeps only once per full render
                polarNoise: polarNoise,
                macroNoise: macroNoise,       // Seamless slow-evolving value    
                palette: currentPalette,
                params: modulatedParams,
                safeZone: { top: 200, bottom: 200, left: 100, right: 100 },
                loopNoise: (x, y, p_val) => {
                    // Crossfade two 3D noise slices for 4D-like seamless 2D space looping
                    let r = 1.0;
                    let v1 = p.noise(x, y, p_val * r);
                    let v2 = p.noise(x, y, (p_val - 1) * r);
                    let blendVal = 0.5 - 0.5 * p.cos(p_val * p.PI); // Renamed blend to blendVal to prevent p5 FES warnings
                    // Correctly interpolate from v1 -> v2 so that f(0) === f(1) mathematically
                    return p.lerp(v1, v2, blendVal);
                }
            };

            // 1. Let the Organic Sketch logic draw natively to the main Canvas
            // The palette must be dynamically updated internally
            ctx.palette = currentPalette;

            // Fill pgMain globally with the active palette's background so scaling inner sketches leaves a unified background layer!
            pgMain.background(currentPalette[0] || '#000000');

            // Sandboxed execution: force iframe redraw and snapshot its buffer
            if (window.sandboxIframe && window.sandboxIframe.contentWindow) {
                window.sandboxIframe.contentWindow.ctx = ctx;
                if (window.sandboxIframe.contentWindow.redraw) {
                    window.sandboxIframe.contentWindow.redraw();
                }

                const iframeCanvas = window.sandboxIframe.contentWindow.document.querySelector('canvas');
                if (iframeCanvas) {
                    // Apply Global Mirrors and Scale natively BEFORE shaders so shaders (like scanlines) don't get warped or mirrored
                    pgMain.drawingContext.save();

                    let sX = (ppSettings.flipX ? -1 : 1) * globalScale;
                    let sY = (ppSettings.flipY ? -1 : 1) * globalScale;

                    if (sX !== 1.0 || sY !== 1.0) {
                        pgMain.drawingContext.translate(currentWidth / 2, currentHeight / 2);
                        pgMain.drawingContext.scale(sX, sY);
                        pgMain.drawingContext.translate(-currentWidth / 2, -currentHeight / 2);
                    }

                    pgMain.drawingContext.drawImage(iframeCanvas, 0, 0, currentWidth, currentHeight);
                    pgMain.drawingContext.restore();
                }
            }

            // Clear the main Engine output canvas to prepare for final composite drawing
            p.clear();
            p.background(ctx.palette[0] || 0);

            // 2. Cascade through the Hardware-Accelerated Post-Processing Pipeline
            let finalComposite = pgMain;

            if (ppSettings.bloom > 0) {
                pgBloom.clear();
                pgBloom.drawingContext.filter = `blur(${ppSettings.bloom}px)`;
                pgBloom.drawingContext.drawImage(pgMain.canvas, 0, 0, currentWidth, currentHeight);
                pgBloom.drawingContext.filter = 'none';

                pgBloom.blendMode(p.ADD);
                pgBloom.image(pgMain, 0, 0);
                pgBloom.blendMode(p.BLEND);

                finalComposite = pgBloom;
            }

            if (ppSettings.crt) {
                pgCRT.clear();
                pgCRT.shader(crtShader);
                crtShader.setUniform('tex0', finalComposite);
                crtShader.setUniform('curvature', 5.0);
                pgCRT.noStroke();
                // WebGL coordinates are center-origin
                pgCRT.rect(-currentWidth / 2, -currentHeight / 2, currentWidth, currentHeight);

                finalComposite = pgCRT;
            }

            // Flush the final post-processed composite back out to the main WebM export canvas!
            p.image(finalComposite, 0, 0, currentWidth, currentHeight);

            if (!isRecording) {
                currentFrame++;
            }
        };
    };

    // 5. Boot the engine container
    currentP5 = new p5(sketchEngine);
}

// Initial Bootup Sequence
loadAndRunSketch();

// Internal Reference for uploading
const uploadSketchInput = document.getElementById('upload-sketch-input');
const btnUploadSketch = document.getElementById('btn-upload-sketch');
const btnEditorRevert = document.getElementById('btn-editor-revert');

btnUploadSketch.addEventListener('click', () => {
    uploadSketchInput.click();
});
uploadSketchInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const sketchText = await file.text();
    const baseName = file.name.replace('.js', '');
    const newPath = `local_upload_${baseName}`;

    sketchRegistry[newPath] = parseSketchString(sketchText);
    sketchRawRegistry[newPath] = sketchText;

    const opt = document.createElement('option');
    opt.value = newPath;
    opt.innerText = sketchRegistry[newPath].name || baseName;
    sketchSelect.appendChild(opt);

    sketchSelect.value = newPath;
    currentSketchPath = newPath;
    localStorage.setItem('genloops_last_sketch', newPath);
    editorInstance.setValue(sketchText);

    loadAndRunSketch();
});

btnEditorRevert.addEventListener('click', () => {
    const defaultRaw = sketchRawRegistry[currentSketchPath];
    if (defaultRaw) {
        localStorage.removeItem('genloops_draft_' + currentSketchPath);
        editorInstance.setValue(defaultRaw);
        btnEditorRevert.style.display = 'none';
        updateSketchSelectName(false);
        updateEditorBadge(false, currentSketchPath.startsWith('local_upload_'));
        btnEditorRun.click(); // Rerun the reverted default code
    }
});

// Editor Toggle Event Listener
const btnEditorToggle = document.getElementById('btn-editor-toggle');
const iconCollapse = document.getElementById('icon-collapse');
const iconExpand = document.getElementById('icon-expand');

btnEditorToggle.addEventListener('click', () => {
    editorPanel.classList.toggle('collapsed');
    if (editorPanel.classList.contains('collapsed')) {
        iconCollapse.style.display = 'none';
        iconExpand.style.display = 'block';
    } else {
        iconCollapse.style.display = 'block';
        iconExpand.style.display = 'none';
    }
});

const btnInsertJsdoc = document.getElementById('btn-insert-jsdoc');
if (btnInsertJsdoc) {
    btnInsertJsdoc.addEventListener('click', () => {
        const boilerplate = `/**
 * @name "My Custom Sketch"
 * @description "Created in GenLoops Sandbox"
 * @mode "P2D"
 *
 * @param {slider} myRadius "Blob Radius" [10, 400, 1] 150
 * @param {slider} mySpeed "Animation Speed" [0.1, 5.0, 0.1] 1.0
 * @param {toggle} drawStroke "Show Outlines" true
 */

function setup() {
    createCanvas(1080, 1920); // Make sure you match the format select size!
}

function draw() {
    background(ctx.palette[0]);
    
    // Tap into UI variables
    let r = ctx.params.myRadius;
    
    // Use the color palette
    fill(ctx.palette[1]);
    if (ctx.params.drawStroke) {
        stroke(ctx.palette[2]);
        strokeWeight(5);
    } else {
        noStroke();
    }
    
    // Organic, seamless looping via Progress natively integrated
    let osc = sin(ctx.progress * TWO_PI * ctx.params.mySpeed);
    
    ellipse(width/2, height/2, r + (osc * 50));
}
`;
        const currentCode = editorInstance.getValue();
        if (currentCode.trim() === '' || currentCode.includes('// Source not found')) {
            editorInstance.setValue(boilerplate);
        } else {
            editorInstance.setValue(boilerplate + '\\n\\n' + currentCode);
        }
    });
}

// Initialize Editor Immediately on Page Load
editorInstance = CodeMirror(document.getElementById('editor-container'), {
    mode: 'javascript',
    theme: 'monokai',
    lineNumbers: true,
    indentUnit: 4
});

// Auto-save logic
let debounceTimer = null;
editorInstance.on('change', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const sketchCode = editorInstance.getValue();
        const defaultRaw = sketchRawRegistry[currentSketchPath];
        const isUpload = currentSketchPath.startsWith('local_upload_');
        // Prevent infinite loop from generic setValue
        if (sketchCode !== defaultRaw) {
            localStorage.setItem('genloops_draft_' + currentSketchPath, sketchCode);
            btnEditorRevert.style.display = 'inline-block';
            updateSketchSelectName(true);
            updateEditorBadge(true, isUpload);
        } else if (sketchCode === defaultRaw) {
            localStorage.removeItem('genloops_draft_' + currentSketchPath);
            btnEditorRevert.style.display = 'none';
            updateSketchSelectName(false);
            updateEditorBadge(false, isUpload);
        }
    }, 600);
});

// Load the initial actual code
setTimeout(() => {
    loadDraftOrRawCodeIntoEditor();
}, 100);

btnEditorRun.addEventListener('click', async () => {
    const sketchCode = editorInstance.getValue();

    sketchRegistry[currentSketchPath] = parseSketchString(sketchCode);

    // Save to current path in registry
    sketchRawRegistry[currentSketchPath] = sketchCode;
    localStorage.setItem('genloops_draft_' + currentSketchPath, sketchCode);

    // Flash green
    const oldColor = btnEditorRun.style.backgroundColor;
    btnEditorRun.style.backgroundColor = '#4CAF50';
    btnEditorRun.innerText = 'Running...';
    setTimeout(() => {
        btnEditorRun.style.backgroundColor = oldColor;
        btnEditorRun.innerText = '▶ Run Code';
    }, 500);

    // Update name if they changed it in JSDoc
    updateSketchSelectName(true);
    updateEditorBadge(true, currentSketchPath.startsWith('local_upload_'));
    loadAndRunSketch();
});

btnEditorSave.addEventListener('click', async () => {
    const sketchCode = editorInstance.getValue();
    const suggestedName = currentSketchPath.split('/').pop();
    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{ description: 'JavaScript File', accept: { 'text/javascript': ['.js'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(sketchCode);
            await writable.close();
        } else {
            // Fallback to auto-download if API not supported
            const a = document.createElement('a');
            const blob = new Blob([sketchCode], { type: 'text/javascript' });
            a.href = URL.createObjectURL(blob);
            a.download = suggestedName;
            a.click();
        }
    } catch (err) {
        console.info("Save to File cancelled or failed:", err);
    }
});
