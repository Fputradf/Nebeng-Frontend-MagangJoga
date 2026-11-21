import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = 'C:\\Users\\Fput\\Downloads\\Magang\\screenshots';

async function loginApi(email, password) {
  const resp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!resp.ok) {
    throw new Error(`Failed to login: ${resp.status}`);
  }
  return await resp.json();
}

async function captureTracking() {
  const loginData = await loginApi('customer.jogja@nebeng.com', 'Customer@12345');
  const authData = {
    role: 'customer',
    token: loginData.accessToken,
    accessToken: loginData.accessToken,
    refreshToken: loginData.refreshToken,
    email: loginData.user.email,
    name: loginData.user.name,
    user: loginData.user,
    loggedInAt: Date.now()
  };

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  await page.setViewport(mobile);

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((auth) => {
    localStorage.setItem('notification_permission_dismissed', 'true');
    localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
    sessionStorage.setItem('nebeng_auth', JSON.stringify(auth));
    localStorage.setItem('nebeng_auth', JSON.stringify(auth));
  }, authData);

  console.log('Navigating to /customer/tickets...');
  await page.goto('http://localhost:5173/customer/tickets', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Find and click the GPS button
  console.log('Looking for GPS button...');
  const clicked = await page.evaluate(() => {
    // Look for button with text 'GPS' or title 'Pantau lokasi armada'
    const buttons = Array.from(document.querySelectorAll('button'));
    const gpsBtn = buttons.find(b => b.innerText && b.innerText.includes('GPS')) ||
                    buttons.find(b => b.title && b.title.includes('GPS'));
    if (gpsBtn) {
      gpsBtn.click();
      return true;
    }
    return false;
  });

  console.log('GPS button clicked:', clicked);

  // Wait for tracking map container to appear
  await page.waitForSelector('#customer-tracking-map', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 3000)); // wait for Leaflet tiles to render

  // Extra check to ensure popups are removed
  await page.evaluate(() => {
    document.querySelectorAll('div').forEach(el => {
      const text = el.innerText || '';
      if (text.includes('Aktifkan Notifikasi Web') || text.includes('Pasang Aplikasi Nebeng')) {
        const modal = el.closest('div.fixed') || el;
        modal.remove();
      }
    });
  });

  const targetPath = path.join(outDir, 'gambar_4_5_customer_tracking.png');
  await page.screenshot({ path: targetPath, fullPage: false });
  console.log('✅ Captured clean GPS tracking to:', targetPath);

  // Also capture a desktop version just in case
  const desktop = { width: 1440, height: 900 };
  await page.setViewport(desktop);
  await new Promise(r => setTimeout(r, 1000));
  const targetDesktopPath = path.join(outDir, 'gambar_4_5_customer_tracking_desktop.png');
  await page.screenshot({ path: targetDesktopPath, fullPage: false });
  console.log('✅ Captured desktop clean GPS tracking to:', targetDesktopPath);

  await browser.close();
}

captureTracking().catch(console.error);
