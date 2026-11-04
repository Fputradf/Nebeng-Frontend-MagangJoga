import apiClient from './apiClient';

export const operatorService = {
  /**
   * Mengambil daftar trip dengan paginasi & filter pos dari Backend NestJS
   * @param {Object} params - Parameter query (page, limit, posId, status, date, dll)
   */
  getTrips: async (params = {}) => {
    const { page = 1, limit = 10, posId, destinationPointId, originPointId, status, date } = params;

    const response = await apiClient.get('/trips', {
      params: {
        page,
        limit,
        ...(posId ? { posId } : {}),
        ...(destinationPointId ? { destinationPointId } : {}),
        ...(originPointId ? { originPointId } : {}),
        ...(status ? { status } : {}),
        ...(date ? { date } : {}),
      },
    });

    const resData = response.data;

    if (resData && Array.isArray(resData.data)) {
      return {
        data: resData.data,
        meta: resData.meta || {
          total: resData.data.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: 1,
        },
      };
    }

    if (Array.isArray(resData)) {
      return {
        data: resData,
        meta: {
          total: resData.length,
          page: 1,
          limit: Number(limit),
          totalPages: 1,
        },
      };
    }

    return {
      data: [],
      meta: { total: 0, page: 1, limit: Number(limit), totalPages: 1 },
    };
  },

  getPayments: async (pageOrParams = 1, limit = 10, month, year) => {
    let params = {};
    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
      params = { ...pageOrParams };
    } else {
      params = { page: pageOrParams, limit, month, year };
    }
    Object.keys(params).forEach((key) => {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        delete params[key];
      }
    });
    const response = await apiClient.get('/payments/operator-summary', { params });
    return response.data;
  },

  scanCheckpoint: async (payload) => {
    const response = await apiClient.post('/checkpoints/scan', payload);
    return response.data;
  },

  manualForceRelease: async (payload) => {
    const response = await apiClient.post('/checkpoints/manual-force-release', payload);
    return response.data;
  },
};
