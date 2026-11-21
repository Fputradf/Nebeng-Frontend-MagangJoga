import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = 'C:\\Users\\Fput\\.gemini\\antigravity\\brain\\531d8013-e188-4f36-90f6-21156a9a62ec';
fs.mkdirSync(outDir, { recursive: true });

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

async function capture() {
  console.log('Logging in admin & customer...');
  const adminData = await loginApi('admin@nebeng.com', 'Admin@12345');
  const customerData = await loginApi('customer.jogja@nebeng.com', 'Customer@12345');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Capture Superadmin Setting Payment
  console.log('Capturing Superadmin Payment Settings...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((auth) => {
    localStorage.setItem('notification_permission_dismissed', 'true');
    localStorage.setItem('nebeng_pwa_prompt_dismissed_until', '9999999999999');
    const json = JSON.stringify({
      role: 'admin',
      token: auth.accessToken,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      email: auth.user.email,
      name: auth.user.name,
      user: auth.user,
      loggedInAt: Date.now()
    });
    sessionStorage.setItem('nebeng_auth', json);
    localStorage.setItem('nebeng_auth', json);
  }, adminData);

  await page.goto('http://localhost:5173/admin/pembayaran', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(outDir, 'superadmin_payment_settings.png'),
    fullPage: false
  });
  console.log('✅ Captured superadmin_payment_settings.png');

  // 2. Capture Customer Tagihan / Bills
  console.log('Capturing Customer Tagihan / Bills...');
  await page.evaluate((auth) => {
    const json = JSON.stringify({
      role: 'customer',
      token: auth.accessToken,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      email: auth.user.email,
      name: auth.user.name,
      user: auth.user,
      loggedInAt: Date.now()
    });
    sessionStorage.setItem('nebeng_auth', json);
    localStorage.setItem('nebeng_auth', json);
  }, customerData);

  await page.goto('http://localhost:5173/customer/tagihan', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(outDir, 'customer_tagihan_bills.png'),
    fullPage: false
  });
  console.log('✅ Captured customer_tagihan_bills.png');

  // 3. Trigger & Capture In-App Checkout Modal
  console.log('Triggering In-App Checkout Modal...');
  const payButtons = await page.$$('button');
  for (const btn of payButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Bayar Sekarang')) {
      await btn.click();
      console.log('Clicked Bayar Sekarang button');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(outDir, 'inapp_checkout_modal.png'),
    fullPage: false
  });
  console.log('✅ Captured inapp_checkout_modal.png');

  // 4. Capture Customer Dashboard with Pending Banner & Badge
  console.log('Capturing Customer Dashboard with Pending Banner...');
  await page.goto('http://localhost:5173/customer/booking', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({
    path: path.join(outDir, 'customer_dashboard_banner.png'),
    fullPage: false
  });
  console.log('✅ Captured customer_dashboard_banner.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
