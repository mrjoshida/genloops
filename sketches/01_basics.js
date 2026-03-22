/**
 * @name "01 - The Basics"
 * @description "Welcome to GenLoops! Learn how we draw to the canvas and use the color palette."
 * @mode "P2D"
 */

// The setup function runs exactly once when the sketch is first selected.
// It's a great place to set up properties that won't change, like text alignment or smoothing.
function setup() {
    // Antialiasing is on by default in 2D mode.
    rectMode(CENTER); // Draw rectangles from their center, not their top-left corner
}

// The draw function runs 30 times every second (30 FPS).
// The engine provides two objects implicitly: 
// `ctx`: The GenLoops context containing progression data and color palettes.
function draw() {
    // Replicate the former 'origin: center' engine behavior
    translate(width/2, height/2);

    // [ Clearing the Canvas ]
    // First, we paint the entire background to erase the previous frame. 
    // ctx.palette is an array of colors chosen by the user in the UI. 
    // Index 0 is typically the darkest color (the background).
    background(ctx.palette[0] || '#000000');

    // [ Coordinate System ]
    // We translated to the middle to make math easier.
    // So, drawing at (0, 0) places the shape exactly in the middle of the screen!

    // Let's draw a spinning square.
    // push() saves the current drawing state (like our 0,0 center position).
    push();

    // [ Animation with ctx.progress ]
    // ctx.progress goes from 0.0 to 1.0 continuously and flawlessly over the duration of the loop.
    // We can multiply that by TWO_PI (a full circle in radians) to rotate something exactly 1 full spin!
    let rotationAngle = ctx.progress * TWO_PI;
    rotate(rotationAngle);

    // Set the fill color to the second color in our palette (index 1)
    fill(ctx.palette[1]);

    // Remove the outline (stroke)
    noStroke();

    // Draw the square at x=0, y=0, with a width and height of 200 pixels
    rect(0, 0, 200, 200);

    // pop() restores our drawing state so the rotation doesn't affect other things we draw later.
    pop();

    // Let's add an unmoving circle behind it to show layering.
    // Code written first gets drawn FIRST (in the back). Code written last gets drawn ON TOP.
    // So wait, I'm writing this after the square... it will draw on top! Let's see.
    push();
    stroke(ctx.palette[2] || '#FFFFFF'); // Try index 2 for an outline
    strokeWeight(5); // 5 pixels thick
    noFill(); // Transparent inside

    // Try tweaking this size value from 300 to 500!
    let circleSize = 300;
    circle(0, 0, circleSize);
    pop();
}
