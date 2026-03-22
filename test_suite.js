const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    let hasError = false;
    
    page.on('pageerror', err => {
        console.error('CRASH:', err.toString());
        hasError = true;
    });
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (!text.includes('favicon')) {
                console.error('ERROR:', text);
                hasError = true;
            }
        }
    });

    try {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('#sketch-select');
        
        // Wait for dynamic Vite glob loading
        await page.waitForFunction(() => document.querySelectorAll('#sketch-select option').length > 1);
        
        // Get all sketches
        const sketches = await page.$$eval('#sketch-select option', opts => opts.map(o => o.value));
        console.log('Testing', sketches.length, 'sketches...');
        
        // Test first load
        await new Promise(r => setTimeout(r, 500));
        
        for (const sketch of sketches) {
            console.log(`\n--- Testing ${sketch} ---`);
            await page.select('#sketch-select', sketch);
            
            // Wait 500ms for draw loop to throw
            await new Promise(r => setTimeout(r, 500));
            
            if (hasError) {
                console.log(`❌ ${sketch} FAILED with an error!`);
                process.exit(1);
            } else {
                console.log(`✅ ${sketch} runs clean.`);
            }
        }
        
        // E2E Editor Test
        console.log(`\n--- Testing Editor Integration ---`);
        try {
            await page.waitForSelector('.CodeMirror', { visible: true, timeout: 5000 });
        } catch(e) {
            console.error("Could not find CodeMirror instance. Dumping HTML...");
            const html = await page.content();
            require('fs').writeFileSync('.local/dump.html', html);
            throw e;
        }
        await page.waitForSelector('.CodeMirror', { visible: true });
        
        await page.evaluate(() => {
            const cm = document.querySelector('.CodeMirror').CodeMirror;
            cm.setValue("export default { name: 'E2E Test', parameters: [], draw: (p) => { p.background(0, 255, 0); } };");
            document.getElementById('btn-editor-run').click();
        });
        
        await new Promise(r => setTimeout(r, 500));
        
        if (hasError) {
             console.log(`❌ Editor test FAILED with an error!`);
             process.exit(1);
        } else {
             console.log(`✅ Editor test passed.`);
        }
        
        console.log('\n✅ All sketches passed automatically!');
        process.exit(0);
    } catch (e) {
        console.error("Test Harness Failed:", e);
        process.exit(1);
    }
})();
