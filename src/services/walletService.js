import apiClient from './apiClient';

export const walletService = {
  async getMyWallet() {
    const response = await apiClient.get('/wallets/me');
    return response.data;
  },

  async topUpWallet(amount) {
    const response = await apiClient.post('/wallets/top-up', { amount: Number(amount) });
    return response.data;
  },

  async checkTopUpStatus(invoiceId) {
    const response = await apiClient.get(`/wallets/top-up/check-status/${invoiceId}`);
    return response.data;
  },

  async syncTopUp() {
    const response = await apiClient.post('/wallets/top-up/sync');
    return response.data;
  },

  async withdrawWallet(amount) {
    const response = await apiClient.post('/wallets/withdraw', { amount });
    return response.data;
  },

  async payWithWallet(orderId, pin) {
    const response = await apiClient.post('/payments/checkout', {
      orderId: String(orderId),
      paymentGateway: 'WALLET',
      pin: String(pin),
    });
    return response.data;
  },
};

export default walletService;
