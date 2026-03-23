const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER:', msg.text()));

    try {
        await page.goto('http://localhost:5173/music.html');
        await page.waitForSelector('#upload-audio-input');

        const inputUploadHandle = await page.$('#upload-audio-input');
        const audioPath = path.resolve(__dirname, 'local/135bpm 3_4.mp3');
        await inputUploadHandle.uploadFile(audioPath);

        await page.waitForFunction(() => {
            const label = document.getElementById('audio-status-label');
            return label && label.innerText.includes('135bpm 3_4.mp3') && !label.innerText.includes('Processing');
        }, { timeout: 10000 });

        await new Promise(r => setTimeout(r, 1000));

        await page.evaluate(() => {
            if (!window.audioAnalysisData) {
                console.log("audioAnalysisData is undefined");
                return;
            }
            
            for(let i=0; i<30; i++) {
                const f = window.audioAnalysisData[i];
                if (!f) continue;
                console.log(`[Frame ${i}] beat = ${f.beat}, bins[0] = ${f.bins ? f.bins[0] : 'null'}`);
            }
        });

    } catch (e) {
        console.error(e);
    }
    
    await browser.close();
    process.exit(0);
})();
