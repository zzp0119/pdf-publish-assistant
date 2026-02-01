// PDF文件信息
export interface PDFMetadata {
  id: string;
  uniqueId: string; // 8位UUID，用于访问链接
  originalName: string;
  size: number;
  ossUrl: string;
  qrcodeBase64: string;
  isActive: boolean;
  uploadedAt: Date;
  deletedAt?: Date;
}

// 上传PDF请求
export interface UploadPDFRequest {
  fileName: string;
  fileSize: number;
  ossUrl: string;
  uniqueId: string;
  qrcodeBase64: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录失败记录
export interface LoginAttempt {
  ip: string;
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

// 审计日志
export interface AuditLog {
  id: string;
  action: 'upload' | 'delete' | 'view_qrcode' | 'copy_link' | 'login' | 'login_failed';
  pdfId?: string;
  username?: string;
  ip: string;
  timestamp: Date;
  userAgent?: string;
}

// OSS STS凭证响应
export interface STSTokenResponse {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
