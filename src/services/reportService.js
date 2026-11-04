import apiClient from './apiClient';

export const reportService = {
  /**
   * Buat laporan pelanggaran baru (Customer, Driver, Pos Operator)
   */
  async createReport(payload) {
    const response = await apiClient.post('/reports', payload);
    return response.data;
  },

  /**
   * Ambil riwayat laporan yang dibuat oleh pengguna saat ini
   */
  async getMySubmittedReports() {
    const response = await apiClient.get('/reports/my-reports');
    return response.data;
  },

  /**
   * Ambil laporan yang menargetkan akun pengguna saat ini (Blind / terlindung)
   */
  async getReportsTargetingMe() {
    const response = await apiClient.get('/reports/against-me');
    return response.data;
  },

  /**
   * Ambil daftar laporan untuk panel Admin / Regional
   */
  async getAllReportsForAdmin(params = {}) {
    const response = await apiClient.get('/reports/admin', { params });
    return response.data;
  },

  /**
   * Detail laporan spesifik
   */
  async getReportDetail(id) {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },

  /**
   * Tindak lanjut / resolusi laporan oleh Admin / Regional
   */
  async resolveReport(id, payload) {
    const response = await apiClient.patch(`/reports/${id}/resolve`, payload);
    return response.data;
  },

  /**
   * Upload file bukti gambar/screenshot
   */
  async uploadEvidence(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/uploads/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default reportService;

