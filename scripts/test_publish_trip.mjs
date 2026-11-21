import puppeteer from 'puppeteer-core';
import fs from 'fs';

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

async function testPublish() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });

  const mitraAuth = await loginApi('mitra.jogja@nebeng.com', 'Mitra@12345');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument((auth) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('notification_permission_dismissed', 'true');
    localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
    sessionStorage.setItem('nebeng_auth', JSON.stringify(auth));
    localStorage.setItem('nebeng_auth', JSON.stringify(auth));
  }, {
    role: 'mitra',
    token: mitraAuth.accessToken,
    accessToken: mitraAuth.accessToken,
    user: mitraAuth.user
  });

  await page.goto('http://localhost:5173/mitra/trip', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Let's inspect options in Pos Asal and Pos Tujuan
  const options = await page.evaluate(() => {
    const originSelect = document.querySelector('select[name="originPointId"]');
    const destSelect = document.querySelector('select[name="destinationPointId"]');
    const vehSelect = document.querySelector('select[name="vehicleId"]');
    return {
      origins: Array.from(originSelect?.options || []).map(o => ({ value: o.value, text: o.text })),
      dests: Array.from(destSelect?.options || []).map(o => ({ value: o.value, text: o.text })),
      vehs: Array.from(vehSelect?.options || []).map(o => ({ value: o.value, text: o.text })),
    };
  });

  console.log('Options available:', JSON.stringify(options, null, 2));
  await browser.close();
}

testPublish().catch(console.error);
