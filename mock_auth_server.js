// Mock auth server for testing Nebeng frontend UI (ES module version).
// Run: node mock_auth_server.mjs
// Starts on port 3000, intercepts /api/auth/* routes so the frontend can log
// in without a real backend. Logs every request to stdout.

import http from 'http';
import url from 'url';

const PORT = 3000;

const users = {
  'customer@test.com': {
    id: 'c1',
    name: 'Andi Surya',
    email: 'customer@test.com',
    role: 'customer',
    statusVerification: 'approved',
    phone: '0812-3344-5566',
    regionId: 'r1',
  },
  'mitra@test.com': {
    id: 'm1',
    name: 'Budi Aman',
    email: 'mitra@test.com',
    role: 'mitra',
    statusVerification: 'approved',
    phone: '0813-5566-7788',
    regionId: 'r2',
  },
  'operator@test.com': {
    id: 'op1',
    name: 'Citra Jaya',
    email: 'operator@test.com',
    role: 'operator',
    statusVerification: 'approved',
  },
  'regional@test.com': {
    id: 'reg1',
    name: 'Dewi Lestari',
    email: 'regional@test.com',
    role: 'regional',
    statusVerification: 'approved',
  },
  'admin@test.com': {
    id: 'adm1',
    name: 'Super Admin',
    email: 'admin@test.com',
    role: 'admin',
    statusVerification: 'approved',
  },
};

const sessions = new Map();

function send(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  if (req.method === 'OPTIONS') return send(res, 200, {});

  // Auth routes
  if (path.startsWith('/api/auth/')) {
    const action = path.replace('/api/auth', '').toLowerCase();

    if (action === '/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body || {};
      const u = email ? users[email.toLowerCase()] : null;
      if (!u) return send(res, 401, { message: 'Email atau kata sandi salah.' });
      if (password !== 'password123') return send(res, 401, { message: 'Email atau kata sandi salah.' });
      const token = 'mock-jwt-' + u.email.replace(/[@.]/g, '-');
      const session = {
        role: u.role,
        loggedInAt: Date.now(),
        token,
        refreshToken: token + '-rt',
        email: u.email,
        user: { name: u.name, email: u.email, role: u.role },
      };
      sessions.set(token, session);
      return send(res, 200, {
        accessToken: token,
        token,
        refreshToken: token + '-rt',
        user: session.user,
        data: { user: session.user },
        statusVerification: u.statusVerification,
      });
    }

    if (action === '/me' && req.method === 'GET') {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      const session = sessions.get(token) || null;
      if (!session) return send(res, 401, { message: 'Tidak ada sesi' });
      const email = session.email || session.user?.email;
      const user = users[email.toLowerCase()] || session.user || session;
      return send(res, 200, {
        ...session.user,
        ...user,
        statusVerification: user?.statusVerification || 'approved',
      });
    }

    if (action === '/logout' && req.method === 'POST') {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (token) sessions.delete(token);
      return send(res, 204, {});
    }

    if (action === '/refresh' && req.method === 'POST') {
      const body = await parseBody(req);
      const { refreshToken } = body || {};
      if (!refreshToken) return send(res, 401, { message: 'Refresh token tidak ditemukan' });
      for (const [t, s] of sessions) {
        if (s.refreshToken === refreshToken) {
          const newToken = 'mock-jwt-' + (s.email || 'unknown').replace(/[@.]/g, '-');
          s.token = newToken;
          s.refreshToken = newToken + '-rt';
          return send(res, 200, { accessToken: newToken, token: newToken });
        }
      }
      return send(res, 401, { message: 'Refresh token tidak valid' });
    }

    return send(res, 404, { message: 'Not found' });
  }

  // Notification routes (mocked)
  if (path.startsWith('/api/notifications/')) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const session = sessions.get(token) || null;

    if (!session) return send(res, 401, { message: 'Unauthorized' });

    const action = path.replace('/api/notifications', '').toLowerCase();

    if (action === '/unread-count' && req.method === 'GET') {
      return send(res, 200, { total: 0, chat_message: 0 });
    }

    if (action === '/register-device' && req.method === 'POST') {
      const body = await parseBody(req);
      console.log('[MOCK] Device token registered:', body.token);
      return send(res, 200, { success: true });
    }

    if (action === '/unregister-device' && req.method === 'POST') {
      return send(res, 200, { success: true });
    }

    if (action === '/preferences' && req.method === 'GET') {
      return send(res, 200, { push: true, email: true, sms: false });
    }

    if (action === '/preferences' && req.method === 'PUT') {
      const body = await parseBody(req);
      return send(res, 200, { ...body });
    }

    if (action === '/history' && req.method === 'GET') {
      return send(res, 200, []);
    }

    if (action === '' && req.method === 'GET') {
      return send(res, 200, []);
    }

    if (action.match(/\/\d+\/read/) && req.method === 'PATCH') {
      return send(res, 200, { success: true });
    }

    if (action === '/read-all' && req.method === 'PATCH') {
      return send(res, 200, { success: true });
    }

    if (action.startsWith('/read-by-conversation/') && req.method === 'PATCH') {
      return send(res, 200, { success: true });
    }

    return send(res, 200, { success: true });
  }

  if (path === '/health') return send(res, 200, { ok: true, port: PORT });

  send(res, 404, { message: 'Not found' });
});

server.listen(PORT, () => {
  console.log('[MOCK] Nebeng mock auth server running at http://localhost:3000');
  console.log('[MOCK] Intercepts /api/auth/login, /auth/me, /auth/refresh, /auth/logout');
});
