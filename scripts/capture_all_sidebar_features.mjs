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
    throw new Error(`Failed to login for ${email}: ${resp.status}`);
  }
  return await resp.json();
}

async function captureAll() {
  console.log('Logging in all accounts...');
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

  async function visitAndShot(url, filename, viewport, authData = null, waitTime = 1500) {
    try {
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

      // Extra DOM cleanup to ensure zero modals / toasts
      await page.evaluate(() => {
        document.querySelectorAll('div').forEach(el => {
          const text = el.innerText || '';
          if (text.includes('Aktifkan Notifikasi Web') || text.includes('Pasang Aplikasi Nebeng') || text.includes('Pembaruan')) {
            const modal = el.closest('div.fixed') || el;
            modal.remove();
          }
        });
        document.querySelectorAll('.backdrop-blur-sm, .bg-black\\/60').forEach(el => el.remove());
      });

      const filePath = path.join(outDir, filename);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`[Captured] ${filename}`);
    } catch (err) {
      console.warn(`[Skip/Error] ${filename}:`, err.message);
    }
  }

  const desktop = { width: 1440, height: 900 };
  const mobile = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

  console.log('\n--- 1. AUTH & PUBLIC PAGES ---');
  await visitAndShot('http://localhost:5173/login', '01_login_desktop.png', desktop);
  await visitAndShot('http://localhost:5173/login', '01_login_mobile.png', mobile);
  await visitAndShot('http://localhost:5173/register', '02_register_desktop.png', desktop);
  await visitAndShot('http://localhost:5173/register', '02_register_mobile.png', mobile);

  if (tokens.admin) {
    console.log('\n--- 2. SUPERADMIN ALL SIDEBAR PAGES (DESKTOP) ---');
    await visitAndShot('http://localhost:5173/admin/dashboard', '03_superadmin_dashboard.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/wilayah', '04_superadmin_manajemen_wilayah.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/admin-wilayah', '05_superadmin_admin_wilayah.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/pos-mitra', '06_superadmin_pos_mitra.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/driver', '07_superadmin_driver.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/verifikasi-kyc', '08_superadmin_verifikasi_kyc.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/tarif', '09_superadmin_konfigurasi_tarif.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/sanksi', '10_superadmin_konfigurasi_sanksi.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/bank-pencairan', '11_superadmin_bank_pencairan.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/reports', '12_superadmin_laporan_pelanggaran.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/konfigurasi-aplikasi', '13_superadmin_konfigurasi_logo_nama.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/merchandise', '14_superadmin_merchandise.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/banner', '15_superadmin_banner.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/voucher', '16_superadmin_voucher.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/sosial-link', '17_superadmin_sosial_link.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/audit', '18_superadmin_audit_ledger.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/governance', '19_superadmin_user_governance.png', desktop, tokens.admin);
    await visitAndShot('http://localhost:5173/admin/profile/pengaturan', '20_superadmin_pengaturan_akun.png', desktop, tokens.admin);
  }

  if (tokens.regional) {
    console.log('\n--- 3. REGIONAL ADMIN ALL SIDEBAR PAGES (DESKTOP) ---');
    await visitAndShot('http://localhost:5173/regional/dashboard', '21_regional_dashboard.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/pos-mitra', '22_regional_pos_mitra.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/armada-kurir', '23_regional_armada_kurir.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/verifikasi', '24_regional_verifikasi_id_face.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/trip-order', '25_regional_pemantauan_trip.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/reports', '26_regional_laporan_pelanggaran.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/laporan', '27_regional_laporan_keuangan.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/bantuan-chat', '28_regional_bantuan_chat.png', desktop, tokens.regional);
    await visitAndShot('http://localhost:5173/regional/profile/pengaturan', '29_regional_pengaturan_akun.png', desktop, tokens.regional);
  }

  if (tokens.operator) {
    console.log('\n--- 4. MITRA POS (OPERATOR) ALL SIDEBAR PAGES (DESKTOP) ---');
    await visitAndShot('http://localhost:5173/operator-pos/dashboard', '30_mitra_pos_dashboard.png', desktop, tokens.operator);
    await visitAndShot('http://localhost:5173/operator-pos/manifest', '31_mitra_pos_kehadiran.png', desktop, tokens.operator);
    await visitAndShot('http://localhost:5173/operator-pos/scanner', 'gambar_4_4_mitra_pos_scanner.png', desktop, tokens.operator);
    await visitAndShot('http://localhost:5173/operator-pos/guide', '32_mitra_pos_panduan.png', desktop, tokens.operator);
    await visitAndShot('http://localhost:5173/operator-pos/profile/pengaturan', '33_mitra_pos_pengaturan.png', desktop, tokens.operator);
  }

  if (tokens.mitra) {
    console.log('\n--- 5. MITRA DRIVER ALL SIDEBAR PAGES (MOBILE RESPONSIVE & DESKTOP) ---');
    await visitAndShot('http://localhost:5173/mitra/dashboard', '34_mitra_driver_dashboard_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/onboarding', '35_mitra_driver_onboarding_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/trip', '36_mitra_driver_trip_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/qr', '37_mitra_driver_qr_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/saldo', '38_mitra_driver_saldo_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/chat', '39_mitra_driver_chat_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/bantuan', '40_mitra_driver_bantuan_mobile.png', mobile, tokens.mitra);
    await visitAndShot('http://localhost:5173/mitra/profile/pengaturan', '41_mitra_driver_pengaturan_mobile.png', mobile, tokens.mitra);
  }

  if (tokens.customer) {
    console.log('\n--- 6. CUSTOMER ALL SIDEBAR PAGES (MOBILE RESPONSIVE & DESKTOP) ---');
    await visitAndShot('http://localhost:5173/customer/booking', '42_customer_cari_trip_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/booking', '43_customer_cari_trip_desktop.png', desktop, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/tickets', '44_customer_tiket_saya_mobile.png', mobile, tokens.customer);

    // Live GPS tracking modal
    try {
      console.log('Capturing customer live GPS tracking modal...');
      await page.setViewport(mobile);
      await page.goto('http://localhost:5173/customer/tickets', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1500));
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const gpsBtn = buttons.find(b => b.innerText && b.innerText.includes('GPS')) ||
                       buttons.find(b => b.title && b.title.includes('GPS'));
        if (gpsBtn) gpsBtn.click();
      });
      await page.waitForSelector('#customer-tracking-map', { timeout: 6000 });
      await new Promise(r => setTimeout(r, 2500));
      await page.screenshot({ path: path.join(outDir, 'gambar_4_5_customer_tracking.png') });
      console.log('[Captured] gambar_4_5_customer_tracking.png (GPS Realtime Map)');
    } catch (e) {
      console.warn('Note on tracking modal:', e.message);
    }

    await visitAndShot('http://localhost:5173/customer/qr', '45_customer_digital_qr_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/wallet', '46_customer_dompet_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/vouchers', '47_customer_voucher_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/rewards', '48_customer_rewards_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/chat', '49_customer_chat_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/bantuan', '50_customer_bantuan_mobile.png', mobile, tokens.customer);
    await visitAndShot('http://localhost:5173/customer/profile/pengaturan', '51_customer_profil_mobile.png', mobile, tokens.customer);
  }

  console.log('\n--- 7. SWAGGER REST API DOCS ---');
  try {
    await page.setViewport(desktop);
    await page.goto('http://localhost:3000/api/docs', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(outDir, '52_swagger_api_docs.png') });
    console.log('[Captured] 52_swagger_api_docs.png');
  } catch (e) {
    console.warn('Swagger error:', e.message);
  }

  await browser.close();
  console.log('\n🎉 ALL SIDEBAR FEATURES CAPTURED SUCCESSFULLY in:', outDir);
}

captureAll().catch(console.error);
