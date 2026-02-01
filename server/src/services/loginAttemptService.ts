// 登录失败记录管理服务（使用内存存储，生产环境建议使用Redis）

import { LoginAttempt } from '../types';

interface LoginAttemptRecord extends LoginAttempt {
  lastAttempt: Date;
  lockedUntil?: Date;
}

class LoginAttemptService {
  private attempts: Map<string, LoginAttemptRecord> = new Map();
  private readonly MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
  private readonly LOCKOUT_DURATION = parseInt(
    process.env.LOCKOUT_DURATION || '1800000'
  ); // 30分钟

  async checkAttempt(ip: string): Promise<{
    locked: boolean;
    remainingMinutes?: number;
  }> {
    const record = this.attempts.get(ip);

    if (!record) {
      return { locked: false };
    }

    // 检查是否还在锁定期内
    if (record.lockedUntil && record.lockedUntil > new Date()) {
      const remainingMs = record.lockedUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      return { locked: true, remainingMinutes };
    }

    // 锁定期已过，重置记录
    if (record.lockedUntil && record.lockedUntil <= new Date()) {
      this.attempts.delete(ip);
    }

    return { locked: false };
  }

  async recordFailedAttempt(ip: string): Promise<void> {
    const record = this.attempts.get(ip);
    const now = new Date();

    if (!record) {
      this.attempts.set(ip, {
        ip,
        attempts: 1,
        lastAttempt: now,
      });
    } else {
      record.attempts += 1;
      record.lastAttempt = now;

      // 达到最大尝试次数，锁定账户
      if (record.attempts >= this.MAX_ATTEMPTS) {
        record.lockedUntil = new Date(now.getTime() + this.LOCKOUT_DURATION);
      }

      this.attempts.set(ip, record);
    }
  }

  async resetAttempts(ip: string): Promise<void> {
    this.attempts.delete(ip);
  }

  async getRemainingAttempts(ip: string): Promise<number> {
    const record = this.attempts.get(ip);
    const attempts = record?.attempts || 0;
    return Math.max(0, this.MAX_ATTEMPTS - attempts);
  }

  // 清理过期记录（定时任务调用）
  async cleanup(): Promise<void> {
    const now = new Date();
    for (const [ip, record] of this.attempts.entries()) {
      if (record.lockedUntil && record.lockedUntil <= now) {
        this.attempts.delete(ip);
      }
    }
  }
}

export const loginAttemptManager = new LoginAttemptService();
