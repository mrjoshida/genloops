/**
 * @name "05 - Blend Modes"
 * @description "Create glowing neon effects and optical illusions by changing how colors mix."
 * @mode "P2D"
 *
 * @param {toggle} mode "Use Additive Blending" true
 * @param {slider} density "Shape Density" [5, 50, 5] 20
 */

function setup() { }

function draw() {
    translate(width/2, height/2);

    // We must draw the background BEFORE turning on blend modes!
    blendMode(BLEND); // Reset back to standard drawing
    background(ctx.palette[0] || '#000000');

    // [ WebGL Compatibility ]
    // Not all blend modes work perfectly in WEBGL mode, but in P2D they all work!
    // ADD mode adds the RGB values of overlapping colors together.

    let useAdd = ctx.params.mode;

    if (useAdd) {
        blendMode(ADD);
    } else {
        blendMode(DIFFERENCE);
    }

    let totalShapes = ctx.params.density;
    noStroke();

    for (let i = 0; i < totalShapes; i++) {
        let angleOffset = (TWO_PI / totalShapes) * i;
        let currentAngle = (ctx.progress * TWO_PI) + angleOffset;

        let cx = cos(currentAngle) * 0.5;
        let cy = sin(currentAngle) * 0.5;
        let n = noise(cx + 5, cy + 5);

        let swirlRadius = map(n, 0, 1, 50, 400);
        let x = cos(currentAngle) * swirlRadius;
        let y = sin(currentAngle) * swirlRadius;

        if (i % 3 === 0) {
            fill(ctx.palette[1]);
        } else if (i % 3 === 1) {
            fill(ctx.palette[2] || ctx.palette[1]);
        } else {
            fill(ctx.palette[3] || ctx.palette[1]);
        }

        circle(x, y, 60);
    }
}
