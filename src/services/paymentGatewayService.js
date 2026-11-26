import apiClient from './apiClient';

export const paymentGatewayService = {
  // Ambil konfigurasi metode pembayaran publik (untuk Customer Checkout)
  getPaymentConfig: async () => {
    const res = await apiClient.get('/payments/config');
    return res.data;
  },

  // Ambil konfigurasi lengkap Superadmin
  getAdminPaymentConfig: async () => {
    const res = await apiClient.get('/payments/admin/config');
    return res.data;
  },

  // Perbarui konfigurasi Superadmin (Mutually Exclusive: Gateway vs Manual)
  updateAdminPaymentConfig: async (payload) => {
    const res = await apiClient.patch('/payments/admin/config', payload);
    return res.data;
  },

  // Upload foto struk bukti transfer ke server sebagai multipart file
  uploadPaymentProof: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/uploads/payment-proof', formData);
    return res.data?.filePath || res.data?.url || res.data?.data?.filePath;
  },

  // Customer mengunggah struk bukti transfer manual / QRIS
  submitManualPayment: async ({ orderId, proofUrl, senderName, bankName, senderAccount, notes }) => {
    const res = await apiClient.post('/payments/manual/submit', {
      orderId: String(orderId),
      proofUrl,
      senderName,
      bankName,
      senderAccount,
      notes,
    });
    return res.data;
  },

  // Superadmin melihat daftar bukti transfer manual
  getManualPayments: async (params = {}) => {
    const res = await apiClient.get('/payments/admin/manual-payments', { params });
    return res.data;
  },

  // Superadmin verifikasi atau tolak bukti transfer manual
  verifyManualPayment: async (paymentId, { approved, reviewNotes }) => {
    const res = await apiClient.patch(`/payments/admin/manual-payments/${paymentId}/verify`, {
      approved,
      reviewNotes,
    });
    return res.data;
  },

  // Auto-polling status pembayaran
  checkPaymentStatus: async (orderId) => {
    const res = await apiClient.get(`/payments/check-status/${orderId}`);
    return res.data;
  },

  // Buat Xendit invoice jika Mode Gateway aktif
  createXenditInvoice: async (orderId) => {
    const res = await apiClient.post('/payments/xendit/create-invoice', {
      orderId: String(orderId),
    });
    return res.data;
  },

  // Simulasi checkout PIN (Wallet/Internal)
  checkoutWithPin: async (orderId, paymentGateway, pin) => {
    const res = await apiClient.post('/payments/checkout', {
      orderId: String(orderId),
      paymentGateway,
      pin,
    });
    return res.data;
  },

  // Ambil semua pesanan customer
  getMyOrders: async () => {
    const res = await apiClient.get('/orders/me');
    return res.data;
  },

  // Batalkan pesanan pending
  cancelOrder: async (orderId) => {
    const res = await apiClient.patch(`/orders/${orderId}/cancel`);
    return res.data;
  },
};

export default paymentGatewayService;
