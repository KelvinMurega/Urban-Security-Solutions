'use client';

import { ReactNode } from 'react';
import axios from 'axios';

if (typeof window !== 'undefined') {
  // Authentication is carried exclusively by the httpOnly `token` cookie set by the API.
  // The token is never readable from JavaScript, so an XSS bug cannot exfiltrate it.
  axios.defaults.withCredentials = true;

  // Remove tokens persisted by older builds of the app.
  localStorage.removeItem('token');

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
