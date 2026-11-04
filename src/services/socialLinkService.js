import apiClient from './apiClient';

export const socialLinkService = {
  // Public - Mengambil max 5 link sosmed aktif untuk halaman login
  getPublicSocialLinks: async () => {
    const response = await apiClient.get('/social-links');
    return response.data;
  },

  // Admin - Mengambil semua link sosmed untuk manajemen Superadmin
  getAllSocialLinks: async () => {
    const response = await apiClient.get('/social-links/admin');
    return response.data;
  },

  getSocialLinkById: async (id) => {
    const response = await apiClient.get(`/social-links/${id}`);
    return response.data;
  },

  createSocialLink: async (data) => {
    const response = await apiClient.post('/social-links', data);
    return response.data;
  },

  updateSocialLink: async (id, data) => {
    const response = await apiClient.patch(`/social-links/${id}`, data);
    return response.data;
  },

  deleteSocialLink: async (id) => {
    const response = await apiClient.delete(`/social-links/${id}`);
    return response.data;
  },

  uploadSocialLogo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/uploads/social-links', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data; // { filePath, fileType }
  },
};
