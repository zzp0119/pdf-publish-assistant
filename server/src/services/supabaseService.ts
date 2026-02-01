import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 获取 Supabase 配置（延迟加载）
const getSupabaseConfig = () => ({
  url: process.env.SUPABASE_URL || '',
  serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
});

// 创建 Supabase 客户端（延迟初始化）
let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    const config = getSupabaseConfig();

    if (!config.url || !config.serviceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables');
    }

    supabaseClient = createClient(config.url, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabaseClient;
};

// PDF 元数据类型定义
export interface PDFMetadata {
  id?: number;
  unique_id: string;
  original_name: string;
  size: number;
  oss_url: string;
  qrcode_base64?: string;
  is_active: boolean;
  created_at?: string; // Supabase 自动创建的时间戳
  deleted_at?: string | null;
}

// 审计日志类型定义
export interface AuditLog {
  id?: number;
  action: 'login' | 'login_failed' | 'upload' | 'delete' | 'view';
  pdf_id?: number;
  username?: string;
  ip?: string;
  user_agent?: string;
  created_at?: string;
}

// Supabase 数据库操作服务
export class SupabaseDatabaseService {
  /**
   * 保存 PDF 元数据
   */
  async savePDFMetadata(metadata: PDFMetadata): Promise<PDFMetadata> {
    const { data, error } = await getSupabaseClient()
      .from('pdfs')
      .insert({
        unique_id: metadata.unique_id,
        original_name: metadata.original_name,
        size: metadata.size,
        oss_url: metadata.oss_url,
        qrcode_base64: metadata.qrcode_base64,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`保存PDF元数据失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 根据 uniqueId 获取 PDF 元数据
   */
  async getPDFByUniqueId(uniqueId: string): Promise<PDFMetadata | null> {
    const { data, error } = await getSupabaseClient()
      .from('pdfs')
      .select('*')
      .eq('unique_id', uniqueId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 未找到记录
        return null;
      }
      throw new Error(`查询PDF元数据失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 获取所有活跃的 PDF 列表
   */
  async getAllActivePDFs(): Promise<PDFMetadata[]> {
    const { data, error } = await getSupabaseClient()
      .from('pdfs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }); // 使用 created_at 排序

    if (error) {
      throw new Error(`获取PDF列表失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 软删除 PDF（标记为不活跃）
   */
  async softDeletePDF(uniqueId: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('pdfs')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('unique_id', uniqueId);

    if (error) {
      throw new Error(`删除PDF失败: ${error.message}`);
    }
  }

  /**
   * 根据 uniqueId 获取 PDF（包含二维码）
   */
  async getPDFWithQRCode(uniqueId: string): Promise<PDFMetadata | null> {
    const { data, error } = await getSupabaseClient()
      .from('pdfs')
      .select('*')
      .eq('unique_id', uniqueId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`查询PDF元数据失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 记录审计日志
   */
  async logAudit(params: AuditLog): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('audit_logs')
      .insert({
        action: params.action,
        pdf_id: params.pdf_id,
        username: params.username,
        ip: params.ip,
        user_agent: params.user_agent,
      });

    if (error) {
      console.error('记录审计日志失败:', error);
      // 审计日志失败不影响主流程，只记录错误
    }
  }

  /**
   * 清理已软删除超过30天的PDF记录
   */
  async cleanupOldDeletedPDFs(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await getSupabaseClient()
      .from('pdfs')
      .delete()
      .lt('deleted_at', thirtyDaysAgo.toISOString())
      .select('id');

    if (error) {
      throw new Error(`清理旧PDF记录失败: ${error.message}`);
    }

    return data?.length || 0;
  }
}

export const supabaseService = new SupabaseDatabaseService();
