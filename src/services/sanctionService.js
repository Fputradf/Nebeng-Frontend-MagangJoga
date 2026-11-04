import apiClient from './apiClient';

export const DEFAULT_SANCTION_SETTINGS = {
  lateToleranceMinutes: 15, // batas toleransi telat dalam menit sebelum trip & tiket otomatis batal
  baseScore: 100,
  warningThreshold: 80,
  suspensionThreshold: 50,
  earlyCancelHours: 4, // pembatalan dini jika >= 4 jam sebelum keberangkatan
  policies: {
    mitraCancelEarly: {
      label: 'Pembatalan Dini (Mitra)',
      description: 'Mitra membatalkan perjalanan lebih dari batas waktu awal sebelum berangkat',
      tier1ScoreDeduction: 5,
      tier1SuspensionDays: 0,
      tier2ScoreDeduction: 10,
      tier2SuspensionDays: 0,
      autoSuspendOnTier2: false,
    },
    mitraCancelLate: {
      label: 'Pembatalan Mendadak (Mitra)',
      description: 'Mitra membatalkan perjalanan mendekati waktu keberangkatan',
      tier1ScoreDeduction: 15,
      tier1SuspensionDays: 0,
      tier2ScoreDeduction: 25,
      tier2SuspensionDays: 3,
      autoSuspendOnTier2: true,
    },
    mitraNoShow: {
      label: 'Mitra Tidak Hadir (No-Show)',
      description: 'Mitra tidak hadir di titik jemput pada waktu keberangkatan',
      tier1ScoreDeduction: 30,
      tier1SuspensionDays: 1,
      tier2ScoreDeduction: 40,
      tier2SuspensionDays: 7,
      autoSuspendOnTier2: true,
    },
    userReportViolation: {
      label: 'Laporan Pelanggaran Pengguna',
      description: 'Pelanggaran etika, pelecehan, atau pelanggaran keselamatan yang terverifikasi',
      tier1ScoreDeduction: 40,
      tier1SuspensionDays: 3,
      tier2ScoreDeduction: 60,
      tier2SuspensionDays: 14,
      autoSuspendOnTier2: true,
    },
  },
};

const STORAGE_KEY = 'nebeng_sanction_settings';

/**
 * Mendapatkan konfigurasi aturan sanksi saat ini
 */
export async function getSanctionSettings() {
  try {
    const res = await apiClient.get('/admin/settings/sanctions');
    if (res?.data?.data) {
      return res.data.data;
    }
  } catch (err) {
    // Fallback ke localStorage jika endpoint belum di-deploy
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {
    console.warn('Gagal membaca sanction settings dari localStorage:', e);
  }

  return DEFAULT_SANCTION_SETTINGS;
}

/**
 * Memperbarui konfigurasi aturan sanksi
 */
export async function updateSanctionSettings(settings) {
  try {
    const res = await apiClient.patch('/admin/settings/sanctions', settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return res.data?.data || settings;
  } catch (err) {
    // Simpan di local storage sebagai persistence jika backend endpoint belum aktif
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return settings;
  }
}

/**
 * Mengambil riwayat sanksi mitra tertentu
 */
export async function getMitraSanctions(mitraId) {
  const res = await apiClient.get(`/admin/mitra/${mitraId}/sanctions`);
  return res.data;
}

/**
 * Mengambil seluruh daftar permohonan banding sanksi mitra
 */
export async function getSanctionAppeals(status) {
  const params = status && status !== 'ALL' ? { status } : {};
  const res = await apiClient.get('/admin/sanctions/appeals', { params });
  return res.data?.data || res.data || [];
}

/**
 * Meninjau banding sanksi mitra (Setujui / Tolak)
 */
export async function reviewMitraAppeal(appealId, { approved, reviewNotes }) {
  const res = await apiClient.patch(`/admin/sanctions/appeals/${appealId}/review`, {
    approved,
    reviewNotes,
  });
  return res.data;
}

export default {
  DEFAULT_SANCTION_SETTINGS,
  getSanctionSettings,
  updateSanctionSettings,
  getMitraSanctions,
  getSanctionAppeals,
  reviewMitraAppeal,
};
