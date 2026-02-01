// PDF 数据类型
export interface PDFData {
  uniqueId: string;
  originalName: string;
  size: number;
  ossUrl: string;
  uploadedAt: string;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
