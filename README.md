# GenLoops: Generative Canvas Framework

GenLoops is an educationally oriented generative art engine built on top of **p5.js** optimized for pefectly looping videos formatted for various social media platforms. 

It is designed to eliminate the boilerplate of building UI controls, managing color palettes, formatting various canvas aspect ratios, and wrestling with video export pipelines. Whether you are generating 8-second repeating Spotify Canvases, 60-second social media posts, or ultra-crisp WebGL animations, GenLoops allows you to focus purely on the creative math and visual logic.

---

## 🎨 Core Philosophy & Features

- **"Ctx" Context Object**: Instead of hardcoding logic, sketches receive a rich context object (`ctx`) containing normalized loop `progress` (0.0 to 1.0), unified `palette` colors, and interactive `params` tied directly to the UI.
- **Dynamic Parameter UI**: Define your variables (sliders, toggles) directly in code or JSDoc comments. The engine instantly builds a Left-Panel UI, complete with dynamic **LFO (Low Frequency Oscillator)** modulation to smoothly automate parameters over time.
- **Hardware-Accelerated Post-Processing**: Natively apply real-time Bloom filters, mirror outputs, and authentic CRT fisheye/scanline shaders to any sketch without impacting the core drawing logic.
- **Deterministic Offline WebM Exports**: When exporting, GenLoops pauses the live browser loop and manually advances frames asynchronously. This guarantees perfect, non-laggy, high-res 60fps renders, even for unimaginably complex WebGL raymarching routines that normally choke browser framerates.

---

## 🔧 Interactions with p5.js (Architecture Quirks)

To achieve the export pipeline and aspect-ratio flipping, GenLoops alters a few standard p5.js conventions that you should be aware of:

### 1. The P2D Center Point Shift (Built-in ES Modules)
By default, native p5.js places `(0,0)` at the top-left corner. 
However, for GenLoops **Native ES Module Sketches** (e.g. `sketches/01_basics.js`), the engine automatically executes `translate(width/2, height/2)` under the hood before calling your `draw()` function. 

Placing `(0,0)` safely in the **exact center of the canvas** significantly cuts down down on boilerplate math for polar coordinates, rotating shapes, and symmetrical WebGL-style centering, making it far more intuitive. 

### 2. Sandbox Canvas Hijacking (Global Mode)
If you paste standard code directly from a tutorial (or click "Insert Boilerplate"), GenLoops spins up a completely isolated **Sandbox**. 
Because GenLoops strictly manages aspect ratios for video formats (e.g., 9:16 Portrait vs 16:9 Widescreen), **the Sandbox silently hijacks the `createCanvas()` command.**
If a student pastes `createCanvas(400, 400)`, GenLoops intercepts it and forces the Canvas to match the exact dimensions of the active drop-down environment format. It protects against warping and scales their coordinates perfectly without them needing to do any relative layout math!

---

## 📚 The 7 Educational Sketches

The framework ships with an escalating series of 7 natively built ES modules to teach users how to tap into the engine's power:

### `01_basics.js`
Your hello-world into GenLoops. It introduces the `ctx` object, showing how to utilize the globally selected color palette (`ctx.palette`) and draw a basic shape using the modified center-origin point.

### `02_variable_control.js`
Introduces the `parameters` block. It demonstrates how configuring min, max, and step values automatically spawns UI sliders and binds their real-time output smoothly into `ctx.params`.

### `03_perlin_noise.js`
Breaks away from static geometry. Here we tap into native p5 Perlin noise to drive organic, random behavior, showing how to safely clamp math without unpredictable jumps.

### `04_seamless_loops.js`
The foundational secret to generative video. It introduces `ctx.progress` and `ctx.polarNoise`, teaching the exact polar math required to make an organic shape warp seamlessly so that the first and last frame of the video are identical.

### `05_blend_modes.js`
A dive into rendering aesthetics, utilizing `blendMode(ADD)` and `SCREEN` to build complex lighting. Best paired with the global Bloom post-processing effect in the UI to create shining neon elements.

### `06_webgl_intro.js`
Steps into 3D. Switches the underlying rendering engine from `P2D` to `WEBGL` to draw spinning primitives, lighting passes, and 3D camera navigation driven sequentially by the UI.

### `07_modulation.js`
The capstone. It combines everything: multiple echoed organic layers driven by 2D Perlin noise wrapped in a 4D loop wrapper. It specifically begs the user to turn on **LFO Modulation** on the shape's wobble sliders in the UI to witness the "buttery smooth" automated interpolation of floating-point mathematics driving the art.
