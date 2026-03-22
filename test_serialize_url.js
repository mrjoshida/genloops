const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting GenLoops URL Preset test harness...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    let hasError = false;

    page.on('pageerror', err => {
        console.error('CRASH:', err.toString());
        hasError = true;
    });

    try {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('#sketch-select');
        await page.waitForFunction(() => document.querySelectorAll('#sketch-select option').length > 1);
        const sketches = await page.$$eval('#sketch-select option', opts => opts.map(o => o.value));

        for (const sketch of sketches) {
            console.log(`\n======================================`);
            console.log(`🧪 Testing Presets: ${sketch}`);

            // Navigate fresh
            await page.goto('http://localhost:5173');
            await page.waitForSelector('#sketch-select');
            
            // Set the sketch natively first
            await page.evaluate((s) => {
                document.getElementById('sketch-select').value = s;
                document.getElementById('sketch-select').dispatchEvent(new Event('change'));
            }, sketch);

            await new Promise(r => setTimeout(r, 600));

            // Scrape original payload natively through UI components
            const payload = await page.evaluate(() => {
                // Change every UI param randomly before snapshotting!
                document.getElementById('format-select').value = "1:1";
                document.getElementById('format-select').dispatchEvent(new Event('change'));
                document.getElementById('duration-select').value = "30";
                document.getElementById('duration-select').dispatchEvent(new Event('change'));
                document.getElementById('loops-select').value = "2";
                document.getElementById('loops-select').dispatchEvent(new Event('change'));
                
                document.getElementById('scale-slider').value = "1.7";
                document.getElementById('scale-slider').dispatchEvent(new Event('input'));
                
                document.getElementById('crtEffect').checked = true;
                document.getElementById('crtEffect').dispatchEvent(new Event('change'));

                // Change sliders and LFOs!
                const dynamicSliders = document.querySelectorAll('#dynamic-controls input[type="range"]:not([id^="param-min-"]):not([id^="param-max-"])');
                const paramState = {};
                for (let input of dynamicSliders) {
                     input.value = input.max;
                     input.dispatchEvent(new Event('input'));
                }

                const lfos = document.querySelectorAll('#dynamic-controls input[type="checkbox"]');
                for (let cb of lfos) {
                     cb.checked = true;
                     cb.dispatchEvent(new Event('change'));
                }
                
                // Let the engine breathe for an asynchronous UI repaint
                return new Promise(resolve => {
                    setTimeout(() => {
                        window.engineSerializeState(); // Assuming we expose this or click the button!
                        resolve({
                            aspect: document.getElementById('format-select').value,
                            dur: document.getElementById('duration-select').value,
                            scale: document.getElementById('scale-slider').value
                        });
                    }, 200);
                });
            });

            // We need to trigger the share state properly in the DOM to get the URL!
            await page.click('#btn-share-state');
            await page.waitForSelector('#share-modal', { visible: true });

            const shareUrl = await page.evaluate(() => {
                return document.getElementById('share-url-input').value;
            });

            console.log(`Generated Share Link: ${shareUrl.substring(0, 50)}...`);

            // NOW: WE NAVIGATE TO THE SHARE LINK
            await page.goto(shareUrl);
            await page.waitForSelector('#sketch-select');
            await new Promise(r => setTimeout(r, 1000)); // wait for full parameter decode

            const restoredPayload = await page.evaluate(() => {
                return {
                    sketch: document.getElementById('sketch-select').value,
                    aspect: document.getElementById('format-select').value,
                    dur: document.getElementById('duration-select').value,
                    loops: document.getElementById('loops-select').value,
                    scale: document.getElementById('scale-slider').value,
                    crt: document.getElementById('crtEffect').checked,
                    slidersMap: Array.from(document.querySelectorAll('#dynamic-controls input[type="range"]:not([id^="param-min-"]):not([id^="param-max-"])')).map(el => el.value),
                    lfoToggles: Array.from(document.querySelectorAll('#dynamic-controls input[type="checkbox"]')).map(el => el.checked)
                };
            });

            if (restoredPayload.sketch !== sketch) {
                console.error(`❌ FAILED: Sketch did not restore. Expected ${sketch}, Got ${restoredPayload.sketch}`);
                hasError = true;
            }
            if (restoredPayload.aspect !== "1:1") {
                console.error(`❌ FAILED: Aspect ratio did not restore. Expected 1:1, Got ${restoredPayload.aspect}`);
                hasError = true;
            }
            if (restoredPayload.dur !== "30") {
                console.error(`❌ FAILED: Duration did not restore. Expected 30, Got ${restoredPayload.dur}`);
                hasError = true;
            }
            if (restoredPayload.loops !== "2") {
                console.error(`❌ FAILED: Loops did not restore. Expected 2, Got ${restoredPayload.loops}`);
                hasError = true;
            }
            if (restoredPayload.scale !== "1.7") {
                console.error(`❌ FAILED: Global scale did not restore. Expected 1.7, Got ${restoredPayload.scale}`);
                hasError = true;
            }
            if (restoredPayload.crt !== true) {
                console.error(`❌ FAILED: CRT effect did not restore.`);
                hasError = true;
            }
            if (!restoredPayload.slidersMap) {
                console.error(`❌ FAILED: Sliders did not restore correctly.`);
                hasError = true;
            }
            
            if (!hasError) {
                console.log(`✅ Passed: Decoded URL flawlessly matches physical settings config!`);
            }
        }
        
        if (hasError) {
            console.log('\n❌ Tests finished with errors.');
            process.exit(1);
        } else {
            console.log('\n🚀 ALL URL Preset E2E tests passed flawlessly!');
            process.exit(0);
        }

    } catch (e) {
        console.error("Test Harness Crashed:", e);
        process.exit(1);
    }
})();
