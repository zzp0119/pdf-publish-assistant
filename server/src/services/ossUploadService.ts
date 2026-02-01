import OSS, { PutObjectResult } from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

// OSS 配置（延迟加载）
const getOSSConfig = () => ({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  bucket: process.env.OSS_BUCKET || '',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
});

/**
 * OSS 上传服务
 */
class OSSUploadService {
  private client: OSS | null = null;

  /**
   * 获取或初始化 OSS 客户端
   */
  private getOSSClient(): any {
    if (!this.client) {
      const config = getOSSConfig();

      if (!config.accessKeyId || !config.accessKeySecret || !config.bucket) {
        throw new Error('OSS 配置不完整，请检查环境变量');
      }

      this.client = new OSS({
        region: config.region,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
        secure: true, // 使用 HTTPS
      });
    }

    return this.client;
  }

  /**
   * 上传文件到 OSS
   * @param fileBuffer 文件 Buffer
   * @param fileName 文件名
   * @returns OSS 文件 URL 和 objectKey
   */
  async uploadFile(fileBuffer: Buffer, fileName: string): Promise<{ url: string; objectKey: string }> {
    try {
      // 生成唯一 ID 和上传路径
      const uniqueId = uuidv4().substr(0, 8);
      const timestamp = Date.now();
      const objectKey = `pdfs/${uniqueId}/${timestamp}-${fileName}`;

      console.log('开始上传到 OSS:', { objectKey, size: fileBuffer.length });

      // 上传到 OSS，设置公共读权限
      const result = await this.getOSSClient().put(objectKey, fileBuffer, {
        headers: {
          'x-oss-object-acl': 'public-read', // 设置文件为公共读
          'Content-Type': 'application/pdf',
        },
      });

      console.log('OSS 上传成功:', result.url);

      return {
        url: result.url,
        objectKey: objectKey,
      };
    } catch (error: any) {
      console.error('OSS 上传失败:', error);
      throw new Error(`OSS上传失败: ${error.message}`);
    }
  }

  /**
   * 删除 OSS 文件
   * @param objectKey OSS 对象路径
   */
  async deleteFile(objectKey: string): Promise<void> {
    try {
      await this.getOSSClient().delete(objectKey);
      console.log('OSS 文件删除成功:', objectKey);
    } catch (error: any) {
      console.error('OSS 删除失败:', error);
      throw new Error(`OSS删除失败: ${error.message}`);
    }
  }

  /**
   * 构建完整的 OSS 文件 URL
   * @param objectKey OSS 对象路径
   * @returns 完整的访问 URL
   */
  buildOSSUrl(objectKey: string): string {
    const config = getOSSConfig();
    // 正确的 OSS 域名格式: bucket-name.oss-region.aliyuncs.com/object-key
    return `https://${config.bucket}.${config.region}.aliyuncs.com/${objectKey}`;
  }
}

export const ossUploadService = new OSSUploadService();
