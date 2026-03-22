/**
 * @name "06 - Intro to 3D"
 * @description "Step into the 3rd dimension! Setting up the camera and manipulating 3D primitives."
 * @mode "WEBGL"
 *
 * @param {toggle} autoRotate "Auto Rotate" true
 * @param {slider} boxSize "Cube Size" [100, 500, 10] 200
 */

// Note: WEBGL mode inherently places the (0,0) origin in the center, so no translation is needed here.

function setup() { }

function draw() {
    background(ctx.palette[0] || '#000000');

    let shouldRotate = ctx.params.autoRotate;
    let size = ctx.params.boxSize;

    strokeWeight(3);
    stroke(ctx.palette[2] || ctx.palette[1]);
    fill(ctx.palette[1]);

    push();

    let rotationAngle = ctx.progress * TWO_PI;

    if (shouldRotate) {
        rotateX(rotationAngle);
        rotateY(rotationAngle * 2); // Make the Y spin twice as fast!
    }

    // Draw the 3D cube. 
    // It draws from the center (0,0,0) by default in WebGL.
    box(size);
    pop();

    // Let's add a planetary orbit around the cube!
    push();
    rotateY(-rotationAngle);
    translate(size * 1.5, 0, 0);
    rotateX(rotationAngle * 4);

    fill(ctx.palette[3] || '#FFFFFF');
    noStroke();

    // Second argument is the detail level. Lower numbers make cool polygons!
    sphere(size / 4, 12, 12);
    pop();
}
