import apiClient from './apiClient';

// Memperbarui persentase komisi platform global di database
export async function updatePlatformCommission(commissionPercentage) {
  const response = await apiClient.patch('/admin/settings/commission', { commissionPercentage });
  return response.data;
}

// Memperbarui tarif per KM wilayah tertentu
export async function updateRegionRate(regionId, pricePerKm) {
  const response = await apiClient.patch(`/admin/regions/${regionId}/rate`, { pricePerKm });
  return response.data;
}

// Mengambil seluruh data kebijakan tarif global & matriks paket
export async function getPricingPolicy() {
  const response = await apiClient.get('/admin/settings/pricing-policy');
  return response.data;
}

// Memperbarui pengaturan poin reward / fare per kg
export async function updateRewardSetting(pointsMultiplier) {
  const response = await apiClient.patch('/admin/settings/rewards', { pointsMultiplier });
  return response.data;
}

// Memperbarui seluruh kebijakan tarif global, komisi, dan matriks paket
export async function updateCompletePricingPolicy(payload) {
  const response = await apiClient.patch('/admin/settings/pricing-policy', payload);
  return response.data;
}

// Mengambil konfigurasi komisi scan Mitra Pos
export async function getPosCommissionSettings() {
  const response = await apiClient.get('/admin/settings/pos-commission');
  return response.data;
}

// Memperbarui konfigurasi komisi scan Mitra Pos
export async function updatePosCommissionSettings(payload) {
  const response = await apiClient.patch('/admin/settings/pos-commission', payload);
  return response.data;
}