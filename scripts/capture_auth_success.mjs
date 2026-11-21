import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('notification_permission_dismissed', 'true');
    localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
  });

  await page.goto('http://localhost:5173/login?mock_success=true', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#login-success-toast', { visible: true, timeout: 5000 });
  await new Promise(r => setTimeout(r, 800));

  const outPath = 'C:\\Users\\Fput\\Downloads\\Magang\\screenshots\\blackbox\\AUTH-01_login_berhasil_popup.png';
  await page.screenshot({ path: outPath });
  const stat = fs.statSync(outPath);
  console.log('✅ Captured AUTH-01 with success toast! File size:', stat.size);

  await browser.close();
}

capture().catch(console.error);
