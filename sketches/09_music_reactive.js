/**
 * @name 09 Music Reactive
 * @mode "WEBGL"
 * @bpm 135
 * @timeSignature 3/4
 * @param {slider} radius "Ring Radius" [50, 400, 1] 100
 * @param {slider} rotationX "Rotation Speed X" [0.0, 5.0, 0.1] 1.0
 * @param {slider} pulse "Beat Pulse" [0.0, 200.0, 1] 0
 * @param {slider} depth "Geometry Depth" [0, 500, 1] 250
 */

function setup() {
    smooth();
}

function draw() {
    background(ctx.palette[0] || 0);

    // Dynamic camera that sweeps using macroProgress (evolves over the entire video length)
    const camRadius = 800;
    const camX = cos(ctx.macroProgress * TWO_PI) * camRadius;
    const camZ = sin(ctx.macroProgress * TWO_PI) * camRadius;
    camera(camX, -200, camZ, 0, 0, 0, 0, 1, 0);
    
    ambientLight(150);
    directionalLight(red(ctx.palette[2]), green(ctx.palette[2]), blue(ctx.palette[2]), 1, 1, -1);
    directionalLight(red(ctx.palette[3]), green(ctx.palette[3]), blue(ctx.palette[3]), -1, -1, 1);

    const baseRadius = ctx.params.radius;
    const pulseOffset = ctx.params.pulse; // Excellent candidate for -> Audio: Beat
    const rotSpeedX = ctx.params.rotationX; // Excellent candidate for -> Audio: EQ Range
    const depth = ctx.params.depth;
    
    // The core geometry follows the strict measure grid via ctx.progress
    const tightRotation = ctx.progress * TWO_PI * rotSpeedX;
    
    rotateY(ctx.progress * TWO_PI);
    rotateX(tightRotation);

    specularMaterial(250);
    shininess(50);
    
    // Draw central reactive core
    push();
    fill(ctx.palette[1]);
    noStroke();
    sphere(40 + pulseOffset * 0.3);
    pop();

    // Draw concentric rings driving outwards
    strokeWeight(1);
    for (let i = 0; i < 5; i++) {
        push();
        rotateY((i * PI) / 5 + ctx.progress * TWO_PI);
        rotateX(i * 0.1);
        
        let c = color(ctx.palette[i % ctx.palette.length]);
        c.setAlpha(180);
        stroke(c);
        noFill();
        
        // Ring radius expands heavily on beat pulse
        torus(baseRadius + (i * 30) + pulseOffset, 3 + (pulseOffset * 0.05), 48, 4);
        pop();
    }
    
    // Drifting particles decoupled from the fast grid, synced to macroProgress
    noStroke();
    fill(ctx.palette[2]);
    for(let i = 0; i < 40; i++) {
        push();
        // Spreads out into a galaxy formation over macroProgress
        const pAngle = (i / 40) * TWO_PI + (ctx.macroProgress * TWO_PI);
        const pR = baseRadius * 1.5 + (ctx.loopNoise(i * 0.1, 0, ctx.progress) * 150);
        const px = cos(pAngle) * pR;
        const pz = sin(pAngle) * pR;
        const py = (ctx.loopNoise(0, i * 0.1, ctx.macroProgress) - 0.5) * depth;
        
        translate(px, py, pz);
        sphere(5 + (pulseOffset * 0.1));
        pop();
    }
}
