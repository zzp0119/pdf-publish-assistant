import { AuditLog } from '../types';
import { logger } from '../utils/logger';

// 审计日志服务（简化版，生产环境建议存储到数据库）
class AuditService {
  private logs: AuditLog[] = [];

  async log(params: {
    action: AuditLog['action'];
    pdfId?: string;
    username?: string;
    ip: string;
    userAgent?: string;
  }): Promise<void> {
    const logEntry: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      ...params,
      timestamp: new Date(),
    };

    this.logs.push(logEntry);

    // 使用logger记录审计日志
    logger.info('审计日志', {
      action: logEntry.action,
      pdfId: logEntry.pdfId,
      username: logEntry.username,
      ip: logEntry.ip,
      timestamp: logEntry.timestamp,
    });
  }

  // 获取最近的审计日志
  async getRecentLogs(limit: number = 100): Promise<AuditLog[]> {
    return this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // 清理旧日志（定时任务调用）
  async cleanup(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const beforeCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    const afterCount = this.logs.length;

    logger.info(`审计日志清理完成`, {
      deleted: beforeCount - afterCount,
      remaining: afterCount,
    });
  }
}

export const auditLogger = new AuditService();
