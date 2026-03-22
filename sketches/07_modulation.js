/**
 * @name "07 - Modulation"
 * @description "The capstone! Combining organic 2D Perlin noise, seamless polar loops, and fluid LFO modulation."
 * @mode "P2D"
 *
 * @param {slider} baseRadius "Blob Radius" [50, 400, 1] 150
 * @param {slider} wobbleAmp "Wobble Amplitude" [1, 200, 1] 80
 * @param {slider} noiseScale "Complexity" [0.2, 5.0, 0.1] 1.5
 * @param {slider} layers "Echo Layers" [1, 20, 1] 8
 */

function setup() { }

function draw() {
    translate(width/2, height/2);

    background(ctx.palette[0] || '#000000');

    // Safely extract our modulated parameters
    let baseRadius = parseFloat(ctx.params.baseRadius) || 150;
    let wobbleAmp = parseFloat(ctx.params.wobbleAmp) || 80;
    let noiseScale = parseFloat(ctx.params.noiseScale) || 1.5;
    let layers = parseInt(ctx.params.layers) || 8;

    push();
    noFill();
    strokeWeight(2);

    // A single rotating outer container to gently spin the entire composition
    rotate(ctx.progress * TWO_PI);

    // Draw multiple echoed layers of the blob expanding outward
    for (let j = 0; j < layers; j++) {

        let depthProgress = (j + 1) / layers;
        let colorIndex = floor(map(depthProgress, 0, 1, 1, ctx.palette.length));
        colorIndex = Math.min(ctx.palette.length - 1, Math.max(1, colorIndex));

        stroke(ctx.palette[colorIndex] || '#FFFFFF');
        let currentRadius = baseRadius * depthProgress;

        beginShape();

        let resolution = 100;
        for (let i = 0; i < resolution + 1; i++) { 
            let angle = map(i, 0, resolution, 0, TWO_PI);

            let nx = cos(angle) * noiseScale + 100; 
            let ny = sin(angle) * noiseScale + 100;

            let n = ctx.loopNoise(nx, ny, ctx.progress);

            let rOffset = map(n, 0, 1, -wobbleAmp, wobbleAmp);
            let currentWobble = rOffset * depthProgress;
            let r = currentRadius + currentWobble;

            let x = cos(angle) * r;
            let y = sin(angle) * r;

            vertex(x, y);
        }
        endShape();

        let twist = map(sin(ctx.progress * TWO_PI), -1, 1, -0.5, 0.5);
        rotate((TWO_PI / layers) * twist);
    }
    pop();
}
