import { createNoise4D } from 'simplex-noise';

console.log("Initializing simplex-noise...");
try {
    const noise4D = createNoise4D();
    console.log("Success! Testing a 4D noise call...");
    const val = noise4D(0.1, 0.2, 0.3, 0.4);
    console.log("Noise value:", val);
} catch (err) {
    console.error("CRITICAL ERROR:", err);
}
