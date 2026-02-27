'use client';

import { ReactNode, useEffect } from 'react';
import axios from 'axios';

export default function AuthContext({ children }: { children: ReactNode }) {
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    const responseInterceptor = axios.interceptors.response.use(
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

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  return <>{children}</>;
}
