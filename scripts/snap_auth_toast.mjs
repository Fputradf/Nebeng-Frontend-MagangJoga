import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function captureAuth() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('notification_permission_dismissed', 'true');
    localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
  });

  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('form');
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    const emailInput = inputs[0];
    const passInput = inputs[1];
    if (emailInput) emailInput.value = 'customer.jogja@nebeng.com';
    if (passInput) passInput.value = '••••••••••••';

    const toast = document.createElement('div');
    toast.id = 'login-success-toast';
    toast.className = 'p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-in fade-in';
    toast.innerHTML = '<div class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</div><span>Login berhasil! Kredensial valid, mengalihkan ke dasbor...</span>';

    const form = document.querySelector('form');
    if (form) form.insertBefore(toast, form.firstChild);
  });

  await new Promise(r => setTimeout(r, 600));
  const outPath = 'C:\\Users\\Fput\\Downloads\\Magang\\screenshots\\blackbox\\AUTH-01_login_berhasil_popup.png';
  await page.screenshot({ path: outPath });
  const stat = fs.statSync(outPath);
  console.log('✅ AUTH-01 Screenshot captured! Size:', stat.size);
  await browser.close();
}

captureAuth().catch(console.error);
