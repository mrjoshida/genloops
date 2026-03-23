const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
        console.log("Loading GenLoops Music Edition...");
        await page.goto('http://localhost:5173/music.html');
        await page.waitForSelector('#sketch-select');
        
        // Wait for dynamic Vite glob loading
        await page.waitForFunction(() => document.querySelectorAll('#sketch-select option').length > 1);
        
        console.log("Selecting music_01_beat.js sketch...");
        const sketches = await page.$$eval('#sketch-select option', opts => opts.map(o => o.value));
        const targetSketch = sketches.find(s => s.includes('music_01_beat'));
        
        if (!targetSketch) {
            console.error("music_01_beat.js not found in sketch list!");
            process.exit(1);
        }
        
        await page.select('#sketch-select', targetSketch);
        
        // Wait 500ms for draw loop to settle
        await new Promise(r => setTimeout(r, 500));
        
        // 1. Verify JSDoc Parsing
        const bpmVal = await page.$eval('#bpm-input', el => el.value);
        const numVal = await page.$eval('#time-sig-num', el => el.value);
        
        if (bpmVal !== "135" || numVal !== "3") {
            console.error(`❌ JSDoc Metadata Parse Failed! Expected 135 BPM & 3/4 Time, got ${bpmVal} BPM and ${numVal} Time.`);
            hasError = true;
        } else {
            console.log(`✅ JSDoc Frontend Parsed Correctly: ${bpmVal} BPM, ${numVal}/4 Time.`);
        }
        
        // 2. Audio Upload & ID3 Tag Extraction Verify
        console.log("Uploading Audio Track...");
        const inputUploadHandle = await page.$('#upload-audio-input');
        
        // Reference the absolute file path
        const audioPath = path.resolve(__dirname, 'local/135bpm 3_4.mp3');
        await inputUploadHandle.uploadFile(audioPath);
        
        // Wait for File Processing to vanish
        await page.waitForFunction(() => {
            const label = document.getElementById('audio-status-label');
            return label && label.innerText.includes('3_4.mp3') && !label.innerText.includes('Processing');
        }, { timeout: 10000 });
        console.log("✅ Audio Parsed & Loaded!");
        
        // 3. Modulator UI Mapping Mapping 
        console.log("Mapping UI Modulators...");
        await page.evaluate(() => {
            const selects = Array.from(document.querySelectorAll('select'));
            const modeSelects = selects.filter(s => s.id.includes('-lfo-mode'));
            
            if (modeSelects.length >= 2) {
                // Set the first parameter to audio_beat
                modeSelects[0].value = 'audio_beat';
                modeSelects[0].dispatchEvent(new Event('change'));
                
                // Set the second parameter to audio_freq
                modeSelects[1].value = 'audio_freq';
                modeSelects[1].dispatchEvent(new Event('change'));
            }
        });
            
        // 4. WebCodecs Muxing Export Testing
        console.log("Triggering Hardware Video Encode...");
        // Wait 1 second to ensure draw loop accepts new lfo mappings
        await new Promise(r => setTimeout(r, 1000));
        
        await page.evaluate(() => {
            console.log(`[RECEIPT] Track overrides duration to: ${window.audioAnalysisDurationOverride} seconds`);
        });
        
        await page.click('#btn-export');
        
        // Wait for Recording to finish
        // The render takes time natively simulating 60fps across the audio length.
        await page.waitForFunction(() => {
            const btn = document.getElementById('btn-export');
            return btn && btn.innerText.includes('Complete');
        }, { timeout: 240000 });
        
        if (hasError) {
             console.log(`❌ Test FAILED with an underlying DOM error!`);
             process.exit(1);
        } else {
             console.log(`✅ Headless Video/Audio Encode completed cleanly! Engine is stable.`);
             process.exit(0);
        }
    } catch (e) {
        console.error("Test Harness Failed:", e);
        process.exit(1);
    }
    
    await browser.close();
})();
