/**
 * @name Music 03: Reactive Terrain
 * @mode "WEBGL"
 * @bpm 120
 * @timeSignature 4/4
 * @param {slider} speed "Travel Speed" [0, 0.1, 0.001] 0.05
 * @param {slider} heightMlt "Height Multiplier" [10, 300, 1] 150
 */
function setup() {
    createCanvas(800, 800, WEBGL);
    noStroke();
}

function draw() {
    background(ctx.palette[0] || '#000000');
    rotateX(PI / 3);
    translate(-width / 2, -height / 1.5, -200);
    
    let scl = 40;
    let cols = floor(width / scl) + 4;
    let rows = floor(height / scl) + 4;
    
    let pSpeed = ctx.params.speed !== undefined ? ctx.params.speed : 0.05;
    let pHeight = ctx.params.heightMlt !== undefined ? ctx.params.heightMlt : 150;
    
    // Aggregate global displacement based purely on the low mid EQ slice
    let audioOffset = 0;
    let strokeCol = ctx.palette[2] || '#FFFFFF';

    if (ctx.music && ctx.music.lowMid !== undefined) {
        audioOffset = ctx.music.lowMid * pHeight;
        
        // Flash color based on treble peaks
        if (ctx.music.beat || ctx.music.treble > 0.5) {
            strokeCol = ctx.palette[3] || ctx.palette[1] || '#FFFFFF';
        }
    }
    
    noFill();
    stroke(strokeCol);
    strokeWeight(1.5);
    
    let fly = frameCount * pSpeed;
    
    for (let y = 0; y < rows - 1; y++) {
        beginShape(TRIANGLE_STRIP);
        for (let x = 0; x < cols; x++) {
            // Build the standard perlin noise terrain
            let z1 = noise(x * 0.1, (y * 0.1) - fly) * 100;
            // Introduce the audio displacement dynamically on the vertices using audioOffset
            z1 += noise(x * 0.2, y * 0.2, frameCount * 0.05) * audioOffset;
            
            let z2 = noise(x * 0.1, ((y + 1) * 0.1) - fly) * 100;
            z2 += noise(x * 0.2, (y + 1) * 0.2, frameCount * 0.05) * audioOffset;
            
            vertex(x * scl, y * scl, z1);
            vertex(x * scl, (y + 1) * scl, z2);
        }
        endShape();
    }
}
