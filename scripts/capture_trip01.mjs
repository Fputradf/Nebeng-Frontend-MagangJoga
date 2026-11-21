import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const bbDir = 'C:\\Users\\Fput\\Downloads\\Magang\\screenshots\\blackbox';
fs.mkdirSync(bbDir, { recursive: true });

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

async function captureTrip01() {
  console.log('🚀 Capturing TRIP-01: Penerbitan Jadwal Trip Mitra...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const mitraAuth = await loginApi('mitra.jogja@nebeng.com', 'Mitra@12345');
  const page = await browser.newPage();
  // 1440 x 1320 ensures the whole form including the submit button is in full view
  await page.setViewport({ width: 1440, height: 1320 });

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

  await page.goto('http://localhost:5173/mitra/trip?mock_form=true', { waitUntil: 'networkidle2' });
  await page.waitForSelector('form');
  await new Promise(r => setTimeout(r, 2000));

  const outPath = path.join(bbDir, 'TRIP-01_menerbitkan_jadwal_perjalanan.png');
  await page.screenshot({ path: outPath });
  const stat = fs.statSync(outPath);
  console.log(`✅ Captured TRIP-01: Penerbitan Jadwal Trip Mitra! (Size: ${stat.size} bytes)`);

  await browser.close();
}

captureTrip01().catch(console.error);
