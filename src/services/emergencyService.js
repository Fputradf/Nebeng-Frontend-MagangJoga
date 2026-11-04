import apiClient from './apiClient';

export const emergencyService = {
  /**
   * Pemicu sinyal SOS darurat dari Customer
   * @param {{ orderId: string|number, tripId: string|number, latitude: number, longitude: number, category?: string, notes?: string }} payload
   */
  async triggerSos(payload) {
    const response = await apiClient.post('/emergency/sos', payload);
    return response.data;
  },

  /**
   * Mengambil daftar insiden SOS aktif di wilayah kerja Admin Regional
   */
  async getActiveSosAlerts() {
    const response = await apiClient.get('/emergency/sos/active');
    return response.data;
  },

  /**
   * Menyelesaikan / menutup laporan SOS oleh Admin Regional
   * @param {string|number} sosId
   * @param {{ status: 'RESOLVED'|'FALSE_ALARM', notes?: string }} payload
   */
  async resolveSosAlert(sosId, payload) {
    const response = await apiClient.patch(`/emergency/sos/${sosId}/resolve`, payload);
    return response.data;
  },
};

export default emergencyService;

