'use client';

import { ReactNode } from 'react';
import axios from 'axios';

if (typeof window !== 'undefined') {
  axios.defaults.withCredentials = true;

  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (typeof window !== 'undefined' && axios.isAxiosError(error)) {
        const status = error.response?.status;
        const url = error.config?.url || '';
        const isLoginRequest = url.includes('/api/auth/login');

        if (status === 401 && !isLoginRequest) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }
      }

      return Promise.reject(error);
    }
  );
}

export default function AuthContext({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
