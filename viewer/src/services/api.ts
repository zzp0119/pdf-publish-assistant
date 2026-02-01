import axios from 'axios';
import type { PDFData, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

/**
 * 根据 uniqueId 获取 PDF 详情
 * GET /api/pdf/:uniqueId
 */
export const getPDFByUniqueId = async (uniqueId: string): Promise<PDFData> => {
  const response = await api.get<ApiResponse<PDFData>>(`/api/pdf/${uniqueId}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || '获取PDF信息失败');
};

/**
 * 获取 PDF 代理 URL（用于解决 OSS CORS 和权限问题）
 * @param ossUrl 原始 OSS URL
 * @returns 代理 URL
 */
export const getProxyPdfUrl = (ossUrl: string): string => {
  const encodedUrl = encodeURIComponent(ossUrl);
  return `${API_BASE_URL}/api/proxy/pdf?url=${encodedUrl}`;
};

export default api;
