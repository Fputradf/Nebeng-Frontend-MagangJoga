import apiClient from './apiClient';

export const FALLBACK_SUPPORTED_BANKS = [
  { id: '1', code: 'BCA', bankCode: 'BCA', name: 'Bank Central Asia (BCA)', bankName: 'Bank Central Asia (BCA)', isActive: true, notes: 'Kliring instan' },
  { id: '2', code: 'BNI', bankCode: 'BNI', name: 'Bank Negara Indonesia (BNI)', bankName: 'Bank Negara Indonesia (BNI)', isActive: true, notes: 'Kliring instan' },
  { id: '3', code: 'BRI', bankCode: 'BRI', name: 'Bank Rakyat Indonesia (BRI)', bankName: 'Bank Rakyat Indonesia (BRI)', isActive: true, notes: 'Kliring instan' },
  { id: '4', code: 'MANDIRI', bankCode: 'MANDIRI', name: 'Bank Mandiri', bankName: 'Bank Mandiri', isActive: true, notes: 'Kliring instan' },
  { id: '5', code: 'PERMATA', bankCode: 'PERMATA', name: 'Bank Permata', bankName: 'Bank Permata', isActive: true, notes: 'Kliring instan' },
  { id: '6', code: 'CIMB', bankCode: 'CIMB', name: 'CIMB Niaga', bankName: 'CIMB Niaga', isActive: true, notes: 'Kliring instan' },
  { id: '7', code: 'BSI', bankCode: 'BSI', name: 'Bank Syariah Indonesia (BSI)', bankName: 'Bank Syariah Indonesia (BSI)', isActive: true, notes: 'Kliring instan' },
  { id: '8', code: 'DANAMON', bankCode: 'DANAMON', name: 'Bank Danamon', bankName: 'Bank Danamon', isActive: true, notes: 'Kliring instan' },
  { id: '9', code: 'BTPN', bankCode: 'BTPN', name: 'Bank BTPN / Jenius', bankName: 'Bank BTPN / Jenius', isActive: true, notes: 'Kliring instan' },
];

export const disbursementBankService = {
  // Ambil daftar bank pencairan yang aktif untuk Customer & Mitra
  getActiveBanks: async () => {
    try {
      const response = await apiClient.get('/disbursement-banks');
      const data = response.data?.data || response.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map((b) => ({
          ...b,
          code: b.bankCode,
          name: b.bankName,
        }));
      }
      return FALLBACK_SUPPORTED_BANKS;
    } catch (error) {
      console.warn('Gagal memuat bank dari server, menggunakan fallback:', error);
      return FALLBACK_SUPPORTED_BANKS;
    }
  },

  // Ambil semua bank untuk manajemen Superadmin (aktif & nonaktif)
  getAllBanksAdmin: async () => {
    const response = await apiClient.get('/disbursement-banks/admin');
    return response.data?.data || response.data || [];
  },

  // Ambil detail satu bank
  getBankById: async (id) => {
    const response = await apiClient.get(`/disbursement-banks/${id}`);
    return response.data?.data || response.data;
  },

  // Buat konfigurasi bank baru
  createBank: async (data) => {
    const response = await apiClient.post('/disbursement-banks', data);
    return response.data?.data || response.data;
  },

  // Perbarui konfigurasi bank
  updateBank: async (id, data) => {
    const response = await apiClient.patch(`/disbursement-banks/${id}`, data);
    return response.data?.data || response.data;
  },

  // Toggle status aktif/nonaktif
  toggleActive: async (id) => {
    const response = await apiClient.patch(`/disbursement-banks/${id}/toggle`);
    return response.data?.data || response.data;
  },

  // Hapus bank
  deleteBank: async (id) => {
    const response = await apiClient.delete(`/disbursement-banks/${id}`);
    return response.data?.data || response.data;
  },
};

export default disbursementBankService;

