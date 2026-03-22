/**
 * @name "04 - Seamless Loops"
 * @description "The secret sauce: using polar coordinates to make 100% perfect visual loops."
 * @mode "P2D"
 *
 * @param {slider} radius "Loop Pathway Radius" [0.1, 3.0, 0.1] 1.0
 * @param {slider} complexity "Shape Complexity" [10, 300, 10] 100
 */

function setup() { }

function draw() {
    translate(width/2, height/2);

    background(ctx.palette[0] || '#000000');

    let loopRadius = ctx.params.radius;
    let points = ctx.params.complexity;

    // [ The Seamless Loop Secret ]
    // We know ctx.progress goes from 0.0 to 1.0 exactly once per loop.
    // If we map that progress to an angle of a circle (0 to TWO_PI),
    // we start at 0 degrees and end at 360 degrees—back exactly where we started!
    // We use that angle to calculate an X and Y position on that circle using Sine and Cosine.
    // We call this "Polar Coordinates".

    let loopAngle = ctx.progress * TWO_PI;

    // cx and cy represent our current "time" coordinate in 2D noise space.
    // Because they trace a perfect circle, the noise values they fetch will exactly 
    // match up at the end of the loop!
    let cx = cos(loopAngle) * loopRadius;
    let cy = sin(loopAngle) * loopRadius;

    // Let's draw an organic, wobbly shape that loops perfectly.
    fill(ctx.palette[1]);
    stroke(ctx.palette[2] || ctx.palette[1]);
    strokeWeight(3);

    beginShape();

    // We will draw a circle made of `points` vertices.
    for (let i = 0; i < points; i++) {
        // angle for this specific vertex of the shape
        let pointAngle = map(i, 0, points, 0, TWO_PI);

        // Where does this vertex sit in the noise space?
        // We combine the vertex's spatial position (X/Y) with our
        // animated loop position (cx/cy).
        let nx = cos(pointAngle) * 1.5; // the 1.5 is the noise zoom
        let ny = sin(pointAngle) * 1.5;

        // Get the 2D noise value using our animated offsets + the vertex offsets
        // Note: We use 2D noise here! cx and nx are added together.
        let n = noise(nx + cx + 100, ny + cy + 100);

        // Map the noise value (which is 0 to 1) to a physical radius size for the shape
        let r = map(n, 0, 1, 100, 400);

        // Calculate final screen X and Y for this vertex
        let x = r * cos(pointAngle);
        let y = r * sin(pointAngle);

        vertex(x, y);
    }

    // Close the shape so the last point connects to the first
    endShape(CLOSE);
}
