/**
 * @name "03 - Perlin Noise"
 * @description "Discover organic movement and texture using Perlin noise instead of randomness."
 * @mode "P2D"
 *
 * @param {slider} noiseScale "Noise Scale (Zoom)" [0.005, 0.1, 0.005] 0.02
 * @param {slider} speed "Animation Speed" [1, 10, 1] 5
 */

function setup() {
    noStroke();
}

function draw() {
    translate(width/2, height/2);

    background(ctx.palette[0] || '#000000');

    let scale = ctx.params.noiseScale;
    let speed = ctx.params.speed;

    // [ Random vs. Perlin Noise ]
    // random() picks a totally unpredictable number every time. If we use it for placement,
    // our art looks like TV static—harsh and jittery.
    // noise() picks a smoothly connected sequence of numbers. If we move through "noise space"
    // slightly each frame, we get fluid, organic, cloud-like movement!

    // Let's draw a grid of dots.
    // We'll calculate a noise value for every single spot on the grid.

    let spacing = 40;

    // We need to calculate how many columns and rows fit on the screen.
    // Since (0,0) is in the middle, we go from -width/2 to +width/2.
    let halfW = width / 2;
    let halfH = height / 2;

    for (let x = -halfW; x < halfW; x += spacing) {
        for (let y = -halfH; y < halfH; y += spacing) {

            // To animate the noise, we add a "time" variable.
            // normally we'd use frameCount, but in GenLoops we want to use the total frames
            // to eventually loop it. For now, we'll just push it forward based on ctx.macroProgress
            // which goes from 0.0 to 1.0 over the FULL length of the video.
            let timeOffset = ctx.macroProgress * speed * 10;

            // [ 3D Noise ]
            // noise can take 1, 2, or 3 inputs.
            // 1 input = a wavy line.
            // 2 inputs = a cloudy texture (like our X and Y grid).
            // 3 inputs = an animated cloudy texture! The 3rd input is time (Z axis).
            let noiseVal = noise(
                (x + halfW) * scale,
                (y + halfH) * scale,
                timeOffset
            );

            // noiseVal is ALWAYS a number between 0.0 and 1.0.
            // Let's use it to decide how big to draw the dot.
            let dotSize = noiseVal * spacing * 1.5;

            // Let's also use it to pick colors! 
            // We'll interpolate between the second and third colors in our palette.
            let color1 = color(ctx.palette[1]);
            let color2 = color(ctx.palette[2] || ctx.palette[1]);

            // lerpColor blends two colors based on a factor (0.0 to 1.0).
            let finalColor = lerpColor(color1, color2, noiseVal);

            fill(finalColor);

            // Draw the dot!
            circle(x + (spacing / 2), y + (spacing / 2), dotSize);
        }
    }
}
