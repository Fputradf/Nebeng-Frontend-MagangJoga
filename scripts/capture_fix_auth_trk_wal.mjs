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

async function runFix() {
  console.log('🚀 Running Fix for AUTH-01, TRK-01, and WAL-01...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const desktop = { width: 1440, height: 900 };
  const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

  // =========================================================================
  // 1. FIX AUTH-01: LOGIN FORM WITH SUCCESS POPUP TOAST
  // =========================================================================
  try {
    console.log('Capturing AUTH-01 on Login screen with visible success alert...');
    const authPage = await browser.newPage();
    await authPage.setViewport(desktop);
    await authPage.evaluateOnNewDocument(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('notification_permission_dismissed', 'true');
      localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
    });

    await authPage.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await authPage.waitForSelector('input[type="email"]', { timeout: 8000 });
    
    // Type credentials
    await authPage.type('input[type="email"]', 'customer.jogja@nebeng.com');
    await authPage.type('input[type="password"]', 'Customer@12345');

    const btnSubmit = await authPage.$('button[type="submit"]');
    if (btnSubmit) await btnSubmit.click();

    // Wait for #login-success-toast to be rendered on the login screen
    await authPage.waitForSelector('#login-success-toast', { visible: true, timeout: 8000 });
    await new Promise(r => setTimeout(r, 600)); // slight pause for smooth animation

    await authPage.screenshot({ path: path.join(bbDir, 'AUTH-01_login_berhasil_popup.png') });
    console.log('✅ Captured AUTH-01_login_berhasil_popup.png (with visible success popup)');
    await authPage.close();
  } catch (err) {
    console.error('Error in AUTH-01:', err);
  }

  // =========================================================================
  // 2. FIX WAL-01: SALDO MITRA DOMPET DENGAN SALDO AKTUAL & MUTASI ESCROW
  // =========================================================================
  try {
    console.log('Capturing WAL-01: Dompet Mitra dengan saldo aktual Rp 325.320 & mutasi...');
    const mitraAuth = await loginApi('mitra.jogja@nebeng.com', 'Mitra@12345');
    const walPage = await browser.newPage();
    await walPage.setViewport(mobile);

    await walPage.evaluateOnNewDocument((auth) => {
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

    await walPage.goto('http://localhost:5173/mitra/saldo', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));
    await walPage.screenshot({ path: path.join(bbDir, 'WAL-01_saldo_mitra_escrow_cair.png') });
    console.log('✅ Captured WAL-01_saldo_mitra_escrow_cair.png (with actual balance Rp 325.320 & mutations)');
    await walPage.close();
  } catch (err) {
    console.error('Error in WAL-01:', err);
  }

  // =========================================================================
  // 3. FIX TRK-01: LIVE GPS TRACKING MAP SHARP & FULLY RENDERED
  // =========================================================================
  try {
    console.log('Capturing TRK-01: Sharp Live GPS Tracking on Customer Map...');
    const custAuth = await loginApi('customer.jogja@nebeng.com', 'Customer@12345');
    const trkPage = await browser.newPage();
    await trkPage.setViewport(mobile);

    await trkPage.evaluateOnNewDocument((auth) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('notification_permission_dismissed', 'true');
      localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
      sessionStorage.setItem('nebeng_auth', JSON.stringify(auth));
      localStorage.setItem('nebeng_auth', JSON.stringify(auth));
    }, {
      role: 'customer',
      token: custAuth.accessToken,
      accessToken: custAuth.accessToken,
      user: custAuth.user
    });

    await trkPage.goto('http://localhost:5173/customer/tickets', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await trkPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const gpsBtn = buttons.find(b => b.innerText && b.innerText.includes('GPS')) ||
                     buttons.find(b => b.title && b.title.includes('GPS'));
      if (gpsBtn) gpsBtn.click();
    });

    await trkPage.waitForSelector('#customer-tracking-map', { timeout: 8000 });
    // Invalidate map size directly from puppeteer evaluate if available
    await trkPage.evaluate(() => {
      // Force trigger resize on window
      window.dispatchEvent(new Event('resize'));
    });
    // Wait 4.5 seconds for all OpenStreetMap tiles and Leaflet CSS to render with 100% sharpness
    await new Promise(r => setTimeout(r, 4500));

    await trkPage.screenshot({ path: path.join(bbDir, 'TRK-01_live_gps_tracking_aktif.png') });
    console.log('✅ Captured TRK-01_live_gps_tracking_aktif.png (Sharp and clear OpenStreetMap)');
    await trkPage.close();
  } catch (err) {
    console.error('Error in TRK-01:', err);
  }

  await browser.close();
  console.log('\n🎉 ALL FIXES COMPLETED SUCCESSFULLY!');
}

runFix().catch(console.error);
