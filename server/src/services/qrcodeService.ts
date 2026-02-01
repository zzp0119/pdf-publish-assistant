import * as QRCode from 'qrcode';

/**
 * 二维码生成服务
 */
class QRCodeService {
  /**
   * 生成二维码的 Base64 编码（PNG 格式）
   * @param url 访问链接
   * @returns Base64 编码的 PNG 图片（不带 data:image/png;base64, 前缀）
   */
  async generateQRCodeBase64(url: string): Promise<string> {
    try {
      // 生成 PNG 格式的二维码
      const pngBuffer = await QRCode.toBuffer(url, {
        type: 'png',
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      // 转换为 Base64（去掉 data URL 前缀）
      const base64 = pngBuffer.toString('base64');

      console.log('二维码生成成功:', { url, size: base64.length });

      return base64;
    } catch (error: any) {
      console.error('二维码生成失败:', error);
      throw new Error(`二维码生成失败: ${error.message}`);
    }
  }

  /**
   * 生成二维码的 Data URL（用于前端直接显示）
   * @param url 访问链接
   * @returns Data URL（data:image/png;base64,...）
   */
  async generateQRCodeDataURL(url: string): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        type: 'image/png',
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
      });

      return dataUrl;
    } catch (error: any) {
      console.error('二维码 Data URL 生成失败:', error);
      throw new Error(`二维码生成失败: ${error.message}`);
    }
  }
}

export const qrcodeService = new QRCodeService();
