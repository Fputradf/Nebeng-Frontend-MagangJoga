import apiClient from './apiClient';

export async function loginRequest({ email, password }) {
  if (!email || !password) {
    throw new Error('Email dan password wajib diisi');
  }

  const response = await apiClient.post('/auth/login', {
    email: email.trim(),
    password,
  });

  const responseData = response.data;

  // Mendukung berbagai struktur respons nested dari backend NestJS
  const userObj = responseData?.data?.user || responseData?.user || responseData?.data || responseData;
  const role = userObj?.role || responseData?.role || 'customer';
  
  // Memastikan pencarian token mencakup standar umum REST API
  const accessToken = 
    responseData?.accessToken || 
    responseData?.token || 
    responseData?.data?.accessToken || 
    responseData?.data?.token || 
    userObj?.token;

  const refreshToken = 
    responseData?.refreshToken || 
    responseData?.refresh_token || 
    responseData?.data?.refreshToken || 
    userObj?.refreshToken;

  if (!accessToken) {
    throw new Error('Token otentikasi tidak ditemukan dari server');
  }

  return {
    role: role.toLowerCase(),
    token: accessToken,
    refreshToken: refreshToken,
    email: userObj?.email || email,
    name: userObj?.name,
  };
}

export async function registerRequest(payload) {
  if (!payload?.email || !payload?.password || !payload?.name) {
    throw new Error('Data pendaftaran tidak lengkap');
  }

  // Hanya mengirim properti yang diizinkan oleh RegisterDto backend
  const backendPayload = {
    name: payload.name.trim(),
    email: payload.email.trim(),
    phone: payload.phone,
    password: payload.password,
    role: payload.role ? payload.role.toLowerCase() : 'customer',
    regionId: payload.regionId ? String(payload.regionId) : undefined,
  };

  const response = await apiClient.post('/auth/register', backendPayload);

  return {
    success: true,
    data: response.data,
  };
}

export async function forgotPasswordRequest(email) {
  if (!email) {
    throw new Error('Email wajib diisi');
  }

  const response = await apiClient.post('/auth/forgot-password', {
    email: email.trim(),
  });

  return {
    success: true,
    data: response.data,
  };
}

export async function verifyOtpRequest({ email, otp }) {
  if (!email || !otp) {
    throw new Error('Email dan kode OTP wajib diisi');
  }

  const response = await apiClient.post('/auth/verify-otp', {
    email: email.trim(),
    otp: otp.trim(),
  });

  return {
    success: true,
    data: response.data,
  };
}

export async function resetPasswordRequest({ email, otp, newPassword }) {
  if (!email || !newPassword) {
    throw new Error('Data reset password tidak lengkap');
  }

  const response = await apiClient.post('/auth/reset-password', {
    email: email.trim(),
    otp: otp ? otp.trim() : undefined,
    newPassword,
  });

  return {
    success: true,
    data: response.data,
  };
}
