/**
 * @name Music 01: Beat Trigger
 * @mode "WEBGL"
 * @bpm 135
 * @timeSignature 3/4
 * @param {slider} radius "Base Radius" [50, 400, 1] 100
 * @param {slider} kickJump "Kick Jump Size" [10, 200, 1] 50
 */
let currentSize = 100;

function setup() {
    createCanvas(800, 800, WEBGL);
    noStroke();
}

function draw() {
    background(ctx.palette[0] || '#000000');
    
    // Ensure the params exist safely
    let pRadius = ctx.params.radius !== undefined ? ctx.params.radius : 100;
    let pJump = ctx.params.kickJump !== undefined ? ctx.params.kickJump : 50;
    
    // Trigger logic organically evaluates the hardware extraction algorithm
    if (ctx.music && ctx.music.beat) {
        currentSize = pRadius + pJump;
    } else {
        // Decay smoothly back to base radius
        currentSize = lerp(currentSize, pRadius, 0.1);
    }
    
    // Draw the geometry
    fill(ctx.palette[1] || '#FFFFFF');
    rotateX(frameCount * 0.01);
    rotateY(frameCount * 0.015);
    box(currentSize);
}
