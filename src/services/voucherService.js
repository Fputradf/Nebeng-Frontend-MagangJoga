import apiClient from './apiClient';

export const voucherService = {
  /**
   * Validate voucher code before order creation (Customer)
   * @param {{ code: string, orderType: 'passenger' | 'parcel', subtotal: number }} payload
   * @returns {Promise<{ discountAmount: number, totalPrice: number }>}
   */
  async validateVoucher({ code, orderType, subtotal }) {
    const response = await apiClient.post('/vouchers/validate', {
      code,
      orderType,
      subtotal,
    });
    return response.data;
  },

  /**
   * Redeem/claim a voucher code for customer
   * @param {string} code
   * @returns {Promise<Object>}
   */
  async redeemVoucher(code) {
    const response = await apiClient.post('/vouchers/redeem', { code });
    return response.data;
  },

  /**
   * Get available vouchers for customer
   * @returns {Promise<Array>}
   */
  async getMyVouchers() {
    const response = await apiClient.get('/vouchers');
    return response.data;
  },

  /**
   * Get all vouchers with redemption counts (Superadmin)
   * @returns {Promise<Array>}
   */
  async getAllAdminVouchers() {
    const response = await apiClient.get('/admin/vouchers');
    return response.data;
  },

  /**
   * Create a new voucher (Superadmin)
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async createVoucher(payload) {
    const response = await apiClient.post('/admin/vouchers', payload);
    return response.data;
  },

  /**
   * Update an existing voucher (Superadmin)
   * @param {string} id
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async updateVoucher(id, payload) {
    const response = await apiClient.put(`/admin/vouchers/${id}`, payload);
    return response.data;
  },

  /**
   * Update voucher active status (Superadmin)
   * @param {string} id
   * @param {boolean} isActive
   * @returns {Promise<Object>}
   */
  async updateVoucherStatus(id, isActive) {
    const response = await apiClient.patch(`/admin/vouchers/${id}/status`, { isActive });
    return response.data;
  },

  /**
   * Delete a voucher (Superadmin)
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async deleteVoucher(id) {
    const response = await apiClient.delete(`/admin/vouchers/${id}`);
    return response.data;
  },
};

export default voucherService;
