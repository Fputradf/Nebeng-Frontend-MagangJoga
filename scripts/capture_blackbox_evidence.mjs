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

async function runBlackboxCapture() {
  console.log('Starting Blackbox Test Scenario Screen Captures...');
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const desktop = { width: 1440, height: 900 };
  const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

  // Setup dismissal for PWA & Notification popups
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('notification_permission_dismissed', 'true');
    localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
  });

  // =========================================================================
  // SCENARIO 1: AUTH-02 (Negatif: Login dengan Kata Sandi Salah)
  // =========================================================================
  console.log('Testing AUTH-02: Login dengan kata sandi salah...');
  await page.setViewport(desktop);
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem('notification_permission_dismissed', 'true');
    localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
  });
  
  // Fill wrong credentials
  await page.type('input[type="email"]', 'customer.jogja@nebeng.com');
  await page.type('input[type="password"]', 'PasswordSalah123!');
  
  // Click login
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();
  
  // Wait for error text to appear
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(bbDir, 'AUTH-02_login_gagal_password_salah.png') });
  console.log('✓ Captured AUTH-02_login_gagal_password_salah.png');

  // =========================================================================
  // SCENARIO 2: AUTH-01 (Positif: Login Berhasil & Redirect ke Dasbor)
  // =========================================================================
  console.log('Testing AUTH-01: Login dengan kredensial benar...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'customer.jogja@nebeng.com');
  await page.type('input[type="password"]', 'Customer@12345');
  const submitBtn2 = await page.$('button[type="submit"]');
  if (submitBtn2) await submitBtn2.click();
  
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(bbDir, 'AUTH-01_login_berhasil_masuk_dasbor.png') });
  console.log('✓ Captured AUTH-01_login_berhasil_masuk_dasbor.png');

  // =========================================================================
  // SCENARIO 3: AUTH-03 (Negatif: Customer Mengakses Endpoint Superadmin / RBAC)
  // =========================================================================
  console.log('Testing AUTH-03: RBAC Customer coba akses /admin/dashboard...');
  const custAuth = await loginApi('customer.jogja@nebeng.com', 'Customer@12345');
  await page.evaluate((token, user) => {
    const auth = {
      role: 'customer',
      token: token,
      accessToken: token,
      user: user,
      email: user.email,
      name: user.name,
      loggedInAt: Date.now()
    };
    sessionStorage.setItem('nebeng_auth', JSON.stringify(auth));
    localStorage.setItem('nebeng_auth', JSON.stringify(auth));
  }, custAuth.accessToken, custAuth.user);

  // Attempt to navigate to admin dashboard
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  // ProtectedRoute rejects and redirects to /customer/booking
  await page.screenshot({ path: path.join(bbDir, 'AUTH-03_rbac_customer_ditolak_akses_admin.png') });
  console.log('✓ Captured AUTH-03_rbac_customer_ditolak_akses_admin.png');

  // =========================================================================
  // SCENARIO 4: CHK-01 (Positif: Check-in Pos Asal pada Mitra Pos)
  // =========================================================================
  console.log('Testing CHK-01: Antarmuka Scanner Check-in Pos Asal...');
  const opAuth = await loginApi('operator.jogja@nebeng.com', 'Operator@12345');
  await page.evaluate((token, user) => {
    const auth = {
      role: 'operator',
      token: token,
      accessToken: token,
      user: user,
      email: user.email,
      name: user.name,
      loggedInAt: Date.now()
    };
    sessionStorage.setItem('nebeng_auth', JSON.stringify(auth));
    localStorage.setItem('nebeng_auth', JSON.stringify(auth));
  }, opAuth.accessToken, opAuth.user);

  await page.goto('http://localhost:5173/operator-pos/scanner', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(bbDir, 'CHK-01_pemindai_checkin_pos_asal.png') });
  console.log('✓ Captured CHK-01_pemindai_checkin_pos_asal.png');

  // =========================================================================
  // SCENARIO 5: CHK-02 & CHK-03 (Positif: Manifest Kehadiran & Status Validasi)
  // =========================================================================
  console.log('Testing CHK-02/03: Manifest Kehadiran & Validasi Armada...');
  await page.goto('http://localhost:5173/operator-pos/manifest', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(bbDir, 'CHK-03_manifest_kehadiran_tervalidasi.png') });
  console.log('✓ Captured CHK-03_manifest_kehadiran_tervalidasi.png');

  // =========================================================================
  // SCENARIO 6: WAL-01 (Positif: Saldo Mitra Dompet & Pencairan Escrow)
  // =========================================================================
  console.log('Testing WAL-01: Dompet Mitra & Saldo Tersedia...');
  const mitraAuth = await loginApi('mitra.jogja@nebeng.com', 'Mitra@12345');
  await page.setViewport(mobile);
  await page.evaluate((token, user) => {
    const auth = {
      role: 'mitra',
      token: token,
      accessToken: token,
      user: user,
      email: user.email,
      name: user.name,
      loggedInAt: Date.now()
    };
    sessionStorage.setItem('nebeng_auth', JSON.stringify(auth));
    localStorage.setItem('nebeng_auth', JSON.stringify(auth));
  }, mitraAuth.accessToken, mitraAuth.user);

  await page.goto('http://localhost:5173/mitra/saldo', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(bbDir, 'WAL-01_saldo_mitra_tersedia.png') });
  console.log('✓ Captured WAL-01_saldo_mitra_tersedia.png');

  // =========================================================================
  // SCENARIO 7: TRK-01 (Positif: Pelacakan Live GPS Tracking Peta Leaflet)
  // =========================================================================
  console.log('Testing TRK-01: Modal Live GPS Tracking Customer...');
  await page.evaluate((token, user) => {
    const auth = {
      role: 'customer',
      token: token,
      accessToken: token,
      user: user,
      email: user.email,
      name: user.name,
      loggedInAt: Date.now()
    };
    sessionStorage.setItem('nebeng_auth', JSON.stringify(auth));
    localStorage.setItem('nebeng_auth', JSON.stringify(auth));
  }, custAuth.accessToken, custAuth.user);

  await page.goto('http://localhost:5173/customer/tickets', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const gpsBtn = buttons.find(b => b.innerText && b.innerText.includes('GPS')) ||
                   buttons.find(b => b.title && b.title.includes('GPS'));
    if (gpsBtn) gpsBtn.click();
  });
  await page.waitForSelector('#customer-tracking-map', { timeout: 6000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(bbDir, 'TRK-01_pelacakan_gps_realtime_customer.png') });
  console.log('✓ Captured TRK-01_pelacakan_gps_realtime_customer.png');

  await browser.close();
  console.log('\n🎉 ALL BLACK BOX TEST EVIDENCE CAPTURED SUCCESSFULLY in:', bbDir);
}

runBlackboxCapture().catch(console.error);
