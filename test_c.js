const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    // Connect to the Vite development server or static dist server
    await page.goto('http://localhost:5173');
    
    console.log('Page loaded. Clicking Render...');
    
    // Evaluate in page
    await page.waitForSelector('#btn-export');
    await page.click('#btn-export');
    
    // Check button text repeatedly for 3 seconds
    for(let i=0; i<6; i++) {
        await new Promise(r => setTimeout(r, 500));
        let text = await page.$eval('#btn-export', el => el.innerText);
        console.log(`BUTTON STATE [${i/2}s]: ${text}`);
    }
    
    await browser.close();
})();
