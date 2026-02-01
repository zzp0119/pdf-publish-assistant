import axios from 'axios';
import { message } from 'antd';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30000,
  withCredentials: true, // 发送Cookie
});

// 标记是否正在跳转到登录页，避免重复跳转
let isRedirectingToLogin = false;

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // 只在非登录页面时显示错误和跳转
          if (window.location.pathname !== '/login' && !isRedirectingToLogin) {
            isRedirectingToLogin = true;
            message.error('未登录，请先登录');
            // 跳转到登录页
            window.location.href = '/login';
          }
          break;
        case 403:
          message.error('权限不足');
          break;
        case 429:
          message.error(data.error || '请求过于频繁，请稍后再试');
          break;
        case 500:
          message.error('服务器错误，请稍后重试');
          break;
        default:
          message.error(data.error || '请求失败');
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error('请求失败，请重试');
    }

    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),

  verify: () =>
    api.get('/api/auth/verify'),

  logout: () =>
    api.post('/api/auth/logout'),
};

// 上传API
export const uploadAPI = {
  getSTSToken: (fileName: string, fileSize: number) =>
    api.post('/api/upload/sts-token', { fileName, fileSize }),

  saveMetadata: (data: {
    fileName: string;
    fileSize: number;
    ossUrl: string;
    uniqueId: string;
    qrcodeBase64: string;
  }) =>
    api.post('/api/upload/save-metadata', data),
};

// PDF管理API
export const pdfAPI = {
  getList: () =>
    api.get('/api/pdf/list'),

  getById: (uniqueId: string) =>
    api.get(`/api/pdf/${uniqueId}`),

  delete: (uniqueId: string) =>
    api.delete(`/api/pdf/${uniqueId}`),

  getQRCode: (uniqueId: string) =>
    api.get(`/api/pdf/${uniqueId}/qrcode`),
};

export default api;
