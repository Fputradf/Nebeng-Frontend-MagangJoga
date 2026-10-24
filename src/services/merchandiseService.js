import apiClient from './apiClient';

export const merchandiseService = {
  // 1. Endpoint Customer: Katalog & Penukaran
  async getCatalog(includeInactive = false) {
    const res = await apiClient.get('/merchandises', {
      params: { all: includeInactive ? 'true' : 'false' },
    });
    return res.data?.data || res.data || [];
  },

  async getItemDetail(id) {
    const res = await apiClient.get(`/merchandises/item/${id}`);
    return res.data?.data || res.data;
  },

  async redeemMerchandise(payload) {
    const res = await apiClient.post('/merchandises/redeem', payload);
    return res.data;
  },

  async getMyRedemptions() {
    const res = await apiClient.get('/merchandises/my-redemptions');
    return res.data?.data || res.data || [];
  },

  // 2. Endpoint Khusus Superadmin
  async createItem(payload) {
    const res = await apiClient.post('/merchandises', payload);
    return res.data;
  },

  async updateItem(id, payload) {
    const res = await apiClient.patch(`/merchandises/${id}`, payload);
    return res.data;
  },

  async deleteItem(id) {
    const res = await apiClient.delete(`/merchandises/${id}`);
    return res.data;
  },

  async getAllRedemptions() {
    const res = await apiClient.get('/merchandises/admin/redemptions');
    return res.data?.data || res.data || [];
  },

  async updateRedemptionStatus(id, payload) {
    const res = await apiClient.patch(`/merchandises/admin/redemptions/${id}/status`, payload);
    return res.data;
  },

  async uploadMerchandiseImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/uploads/banners', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data; // { filePath, fileType }
  },
};

export default merchandiseService;