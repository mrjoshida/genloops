/**
 * @name Music 02: FFT Spectrum
 * @mode "P2D"
 * @bpm 120
 * @timeSignature 4/4
 * @param {slider} maxBarHeight "Max Bar Height" [10, 400, 1] 200
 * @param {slider} ringSize "Inner Ring Size" [10, 300, 1] 100
 */

function setup() {
    createCanvas(800, 800);
}

function draw() {
    background(ctx.palette[0] || '#000000');
    translate(width / 2, height / 2);
    
    let pHeight = ctx.params.maxBarHeight !== undefined ? ctx.params.maxBarHeight : 200;
    let pRing = ctx.params.ringSize !== undefined ? ctx.params.ringSize : 100;
    
    if (ctx.music && ctx.music.energy) {
        let bins = ctx.music.energy;
        let cCount = bins.length; // 64 Native Bins
        
        for (let i = 0; i < cCount; i++) {
            let angle = map(i, 0, cCount, 0, TWO_PI);
            
            // Map the energy (0.0 - 1.0) into the physical height of the bar
            let h = bins[i] * pHeight;
            
            let x1 = cos(angle) * pRing;
            let y1 = sin(angle) * pRing;
            let x2 = cos(angle) * (pRing + h);
            let y2 = sin(angle) * (pRing + h);
            
            // Select color based on which bin zone it is
            let colIndex = floor(map(i, 0, cCount, 1, ctx.palette.length));
            stroke(ctx.palette[Math.min(colIndex, ctx.palette.length - 1)] || '#FFFFFF');
            strokeWeight(4);
            
            line(x1, y1, x2, y2);
        }
    } else {
        // Fallback for silence
        stroke(ctx.palette[1] || '#FFFFFF');
        noFill();
        circle(0, 0, pRing * 2);
    }
}
