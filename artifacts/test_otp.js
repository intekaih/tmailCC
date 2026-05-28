const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:3000/otp...');
  await page.goto('http://localhost:3000/otp');
  await page.waitForTimeout(2000);
  
  console.log('Filling login credentials...');
  await page.fill('input[type="text"]', 'kaihgpttest2026@shopcc.app|kaihkey2026|CPEG4FQLJ6B2BZAISJWTZBF2II5KOIDH');
  
  console.log('Clicking Truy cap button...');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for verified state to load...');
  await page.waitForTimeout(3000);
  
  const hasColumns = await page.evaluate(() => {
    const el = document.querySelector('.otp-columns');
    return el ? {
      className: el.className,
      innerHTML: el.innerHTML.substring(0, 500)
    } : null;
  });
  
  console.log('Result for .otp-columns:', hasColumns);
  
  const container = await page.evaluate(() => {
    const el = document.querySelector('.otp-container');
    return el ? {
      className: el.className,
      maxWidth: window.getComputedStyle(el).maxWidth
    } : null;
  });
  
  console.log('Result for .otp-container:', container);
  
  await browser.close();
})();
