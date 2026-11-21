import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = 'C:\\Users\\Fput\\Downloads\\Magang\\screenshots';
fs.mkdirSync(outDir, { recursive: true });

const credentials = {
  admin: { email: 'admin@nebeng.com', password: 'Admin@12345', role: 'admin' },
  regional: { email: 'regional.jogja@nebeng.com', password: 'Regional@12345', role: 'regional' },
  operator: { email: 'operator.jogja@nebeng.com', password: 'Operator@12345', role: 'operator' },
  mitra: { email: 'mitra.jogja@nebeng.com', password: 'Mitra@12345', role: 'mitra' },
  customer: { email: 'customer.jogja@nebeng.com', password: 'Customer@12345', role: 'customer' }
};

async function loginApi(email, password) {
  const resp = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!resp.ok) {
    throw new Error(`Failed to login for ${email}: ${resp.status} ${await resp.text()}`);
  }
  return await resp.json();
}

async function capture() {
  console.log('Logging in all accounts via API...');
  const tokens = {};
  for (const [key, cred] of Object.entries(credentials)) {
    try {
      const data = await loginApi(cred.email, cred.password);
      tokens[key] = {
        role: cred.role,
        token: data.accessToken,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        email: data.user.email,
        name: data.user.name,
        user: data.user,
        loggedInAt: Date.now()
      };
      console.log(`✓ Logged in as ${key}`);
    } catch (e) {
      console.error(`✗ Error logging in ${key}:`, e.message);
    }
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Helper to set auth and navigate
  async function visitAndShot(url, filename, viewport, authData = null, waitTime = 2000) {
    await page.setViewport(viewport);
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    
    await page.evaluate((auth) => {
      localStorage.setItem('notification_permission_dismissed', 'true');
      localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
      if (auth) {
        const json = JSON.stringify(auth);
        sessionStorage.setItem('nebeng_auth', json);
        localStorage.setItem('nebeng_auth', json);
      } else {
        sessionStorage.removeItem('nebeng_auth');
        localStorage.removeItem('nebeng_auth');
      }
    }, authData);

    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, waitTime));

    // Ekstra pembersihan: Hapus elemen modal/backdrop/toast jika ada
    await page.evaluate(() => {
      document.querySelectorAll('div.fixed.inset-0, div[aria-label*="Notifikasi"], div:has(h4)').forEach(el => {
        const text = el.innerText || '';
        if (text.includes('Notifikasi') || text.includes('Pasang Aplikasi') || text.includes('Pembaruan')) {
          el.remove();
        }
      });
      // Sembunyikan elemen apapun dengan backdrop
      document.querySelectorAll('.backdrop-blur-sm, .bg-black\\/60').forEach(el => el.remove());
    });
    
    const filePath = path.join(outDir, filename);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[Captured] ${filename} (${viewport.width}x${viewport.height})`);
  }

  const desktop = { width: 1440, height: 900 };
  const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

  console.log('\n--- CAPTURING AUTH & PUBLIC PAGES ---');
  await visitAndShot('http://localhost:5173/login', '01_login_desktop.png', desktop);
  await visitAndShot('http://localhost:5173/login', '01_login_mobile.png', mobile);
  await visitAndShot('http://localhost:5173/register', '02_register_desktop.png', desktop);
  await visitAndShot('http://localhost:5173/register', '02_register_mobile.png', mobile);

  if (tokens.admin) {
    console.log('\n--- CAPTURING SUPERADMIN PAGES (DESKTOP) ---');
    await visitAndShot('http://localhost:5173/admin/dashboard', '03_superadmin_dashboard.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/wilayah', '04_superadmin_manajemen_wilayah.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/pos-mitra', '05_superadmin_pos_mitra.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/driver', '06_superadmin_manajemen_driver.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/tarif', '07_superadmin_manajemen_tarif.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/voucher', '08_superadmin_manajemen_voucher.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/audit', '09_superadmin_audit_ledger.png', desktop, tokens.admin);
  }

  if (tokens.regional) {
    console.log('\n--- CAPTURING REGIONAL ADMIN PAGES (DESKTOP) ---');
    await visitAndShot('http://localhost:5173/regional/dashboard', '10_regional_dashboard.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/pos-mitra', '11_regional_pos_mitra.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/verifikasi', '12_regional_verifikasi_kyc.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/armada-kurir', '13_regional_armada_mitra.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/laporan', '14_regional_laporan_keuangan.png', desktop, tokens.regional);
  }

  if (tokens.operator) {
    console.log('\n--- CAPTURING MITRA POS (OPERATOR) PAGES (DESKTOP) ---');
    await visitAndShot('http://localhost:5173/operator-pos/dashboard', '15_mitra_pos_dashboard.png', desktop, tokens.operator);
    // Gambar 4.4 Wajib
    await visitAndShot('http://localhost:5173/operator-pos/scanner', 'gambar_4_4_mitra_pos_scanner.png', desktop, tokens.operator);
    await visitAndShot('http://localhost:5173/operator-pos/manifest', '16_mitra_pos_kehadiran_manifest.png', desktop, tokens.operator);
    await visitAndShot('http://localhost:5173/operator-pos/guide', '17_mitra_pos_panduan.png', desktop, tokens.operator);
  }

  if (tokens.mitra) {
    console.log('\n--- CAPTURING MITRA DRIVER PAGES (MOBILE RESPONSIVE) ---');
    await visitAndShot('http://localhost:5173/mitra/dashboard', '18_mitra_driver_dashboard_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/trip', '19_mitra_driver_trip_management_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/qr', '20_mitra_driver_qr_code_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/saldo', '21_mitra_driver_wallet_saldo_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/chat', '22_mitra_driver_chat_mobile.png', mobile, tokens.mitra);
  }

  if (tokens.customer) {
    console.log('\n--- CAPTURING CUSTOMER PAGES (MOBILE RESPONSIVE & DESKTOP) ---');
    await visitAndShot('http://localhost:5173/customer/booking', '23_customer_cari_tumpangan_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/tickets', '24_customer_tiket_saya_mobile.png', mobile, tokens.customer);
    // Gambar 4.5 Wajib
    await visitAndShot('http://localhost:5173/customer/booking', 'gambar_4_5_customer_tracking.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/wallet', '25_customer_dompet_digital_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/vouchers', '26_customer_vouchers_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/chat', '27_customer_chat_mobile.png', mobile, tokens.customer);

    // Also desktop view for customer
    await visitAndShot('http://localhost:5173/customer/booking', '28_customer_booking_desktop.png', desktop, tokens.customer);
  }

  console.log('\n--- CAPTURING SWAGGER API DOCS ---');
  try {
    await page.setViewport(desktop);
    await page.goto('http://localhost:3000/api/docs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(outDir, '29_swagger_api_docs.png') });
    console.log('[Captured] 29_swagger_api_docs.png');
  } catch (e) {
    console.warn('Swagger capture note:', e.message);
  }

  await browser.close();
  console.log('\n✅ All screenshots captured successfully in:', outDir);
}

capture().catch(console.error);
