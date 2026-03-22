/**
 * @name "02 - Variable Control"
 * @description "Learn how to let the user control your art with UI sliders."
 * @mode "P2D"
 *
 * @param {slider} numShapes "Number of Rings" [3, 20, 1] 8
 * @param {slider} spread "Ring Spacing" [10, 100, 5] 40
 * @param {toggle} pulseSync "Sync Pulsing" true
 */

function setup() { }

function draw() {
    translate(width/2, height/2);

    // Clear background
    background(ctx.palette[0] || '#000000');
    noFill();
    strokeWeight(3);

    // [ Using ctx.params ]
    // To use the slider values, we call ctx.params.[id].
    // If the user moves the slider, this number updates automatically every single frame!
    let rings = ctx.params.numShapes;
    let spacing = ctx.params.spread;
    let isSynced = ctx.params.pulseSync;

    // We use a "for loop" to draw multiple rings based on the user's slider choice.
    for (let i = 1; i <= rings; i++) {

        // Basic math: the radius gets bigger as 'i' gets bigger.
        // We multiply by the user's spacing choice.
        let baseRadius = i * spacing;

        // [ Pulsing Animation ]
        // We can use sin() (sine wave) with our ctx.progress to make things pulse in and out smoothly.
        // A sine wave goes from -1 to 1. 
        // The angle progresses from 0 to TWO_PI (a full circle) to create a perfect seamless loop.

        let pulseOffset = 0;
        if (isSynced) {
            // If the toggle is checked, everything pulses together
            pulseOffset = sin(ctx.progress * TWO_PI) * 20;
        } else {
            // If unchecked, each ring pulses slightly offset from the others based on its index 'i'.
            pulseOffset = sin((ctx.progress * TWO_PI) + (i * 0.5)) * 20;
        }

        // Calculate final size
        let finalRadius = baseRadius + pulseOffset;

        // Pick a color from the palette depending on odd vs even ring
        if (i % 2 === 0) {
            stroke(ctx.palette[1]);
        } else {
            // If ctx.palette[2] doesn't exist (some palettes only have 2 colors), fallback to [1]
            stroke(ctx.palette[2] || ctx.palette[1]);
        }

        // Draw the ring!
        circle(0, 0, finalRadius);
    }
}
