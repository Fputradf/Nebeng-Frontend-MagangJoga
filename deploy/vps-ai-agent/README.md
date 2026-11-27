# Panduan & Spesifikasi Konfigurasi: Landing Page Vercel <-> AI Agent VPS

Dokumen ini dirancang agar **bisa langsung dibaca dan dieksekusi oleh AI Agent apa pun di VPS** (misalnya OpenClaw, Claude Code, Codex, atau ops agent lainnya) maupun oleh Anda secara manual.

---

## Ringkasan Arsitektur

- **Frontend (Vercel):** Landing page **Mitra Driver** & **Mitra Pos** (React + Vite). Menggunakan `vercel.json` di root repo untuk SPA routing, security headers, dan cache control.
- **Backend & AI Agent (VPS):** Melayani API publik pendaftaran mitra, webhook, dan/atau chat AI Agent di balik **Nginx + HTTPS (Let's Encrypt)**.
- **Aturan Wajib:** Karena Vercel berjalan di **HTTPS**, semua endpoint VPS yang dipanggil dari landing page **wajib menggunakan HTTPS** (tidak boleh `http://IP_VPS:3000` karena akan diblokir *Mixed Content* oleh browser).

---

## Daftar File Konfigurasi

| File | Lokasi / Fungsi |
| :--- | :--- |
| `vercel.json` | Root repo — konfigurasi build Vite, SPA rewrite, security headers, dan cache PWA |
| `deploy/vps-ai-agent/agent-config.json` | Spesifikasi JSON terstruktur untuk dibaca otomatis oleh AI Agent di VPS |
| `deploy/vps-ai-agent/nginx-nebeng-api.conf` | Template reverse proxy Nginx (`/api/` -> `:3000`, `/agent/` -> `:8000`) |
| `deploy/vps-ai-agent/.env.vercel.example` | Template Environment Variables untuk dimasukkan ke dashboard Vercel |
| `deploy/vps-ai-agent/.env.vps.example` | Template Environment Variables untuk service backend & AI Agent di VPS |

---

## Instruksi untuk AI Agent di VPS (Copy-Paste Prompt)

Saat Anda sudah masuk ke VPS dan ingin menyuruh AI Agent di VPS menyiapkan servernya, Anda bisa berikan prompt berikut ke AI Agent tersebut:

> Baca file `deploy/vps-ai-agent/agent-config.json` dan `deploy/vps-ai-agent/nginx-nebeng-api.conf`.
> Tolong siapkan VPS ini agar bisa terhubung dengan Landing Page Mitra Driver & Mitra Pos yang di-host di Vercel:
> 1. Setup Nginx reverse proxy menggunakan domain `api.<domain-saya>` (ganti `api.domain-anda.com`) ke port backend dan port AI agent.
> 2. Pasang SSL HTTPS dengan Certbot (`certbot --nginx`).
> 3. Pastikan firewall (UFW) hanya membuka port `22`, `80`, dan `443` (jangan buka port `3000`/`8000` ke publik).
> 4. Konfigurasikan CORS di backend/agent agar mengizinkan origin Vercel produksi saya (`https://<domain-vercel-saya>`) dan preview `*.vercel.app`.
> 5. Verifikasi endpoint `/api/health` dan `/agent/health` merespons `200 OK` lewat HTTPS.

---

## Checklist Setup di Vercel (Saat Upload Landing Page)

1. Pastikan file `vercel.json` ikut ter-upload di root project.
2. Di **Vercel Dashboard -> Settings -> Environment Variables**, tambahkan variabel dari `.env.vercel.example`:
   - `VITE_API_BASE_URL` = `https://api.domain-anda.com/api`
   - `VITE_AGENT_API_URL` = `https://api.domain-anda.com/agent`
3. Deploy ulang (*Redeploy*) agar environment variable `VITE_*` terbaca saat `npm run build`.
