import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as querystring from 'querystring';

// STS 配置（延迟加载）
const getSTSConfig = () => {
  const region = process.env.OSS_REGION || 'oss-cn-hangzhou';
  const stsRegion = region.replace('oss-', '');
  return {
    region: stsRegion,
    roleArn: process.env.STS_ROLE_ARN || '',
    roleSessionName: process.env.STS_ROLE_SESSION_NAME || 'pdf-upload-session',
    tokenExpireSeconds: parseInt(process.env.STS_TOKEN_EXPIRE_SECONDS || '3600'),
  };
};

// OSS 配置（延迟加载）
const getOSSConfig = () => ({
  bucket: process.env.OSS_BUCKET || '',
  region: process.env.OSS_REGION || '',
  endpoint: process.env.OSS_ENDPOINT || '',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
});

// STS 凭证类型
export interface STSCredentials {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
}

// STS 响应类型
export interface STSResponse {
  credentials: STSCredentials;
  bucket: string;
  region: string;
  endpoint: string;
  objectKey: string;
}

class OSSSTSService {
  /**
   * URL 编码（阿里云规范）
   * 注意：不对已经编码的 %XX 进行再次编码
   */
  private percentEncode(str: string): string {
    // 检查是否已经编码（包含 %XX 格式）
    // 如果已经编码，直接返回
    if (/^%[0-9A-Fa-f]{2}$/.test(str)) {
      return str;
    }

    // 否则进行编码
    let encoded = encodeURIComponent(str);

    // 按照阿里云规范替换某些字符
    encoded = encoded
      .replace(/\+/g, '%20')
      .replace(/\*/g, '%2A')
      .replace(/%7E/g, '~')
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');

    return encoded;
  }

  /**
   * 对整个字符串进行 percentEncode（避免双重编码已编码的部分）
   */
  private percentEncodeAll(str: string): string {
    // 先用正则表达式保护已经编码的 %XX
    // 替换为占位符
    const placeholders: any = {};
    let counter = 0;

    // 匹配 %XX 格式（已编码）
    str = str.replace(/%[0-9A-Fa-f]{2}/g, (match) => {
      const placeholder = `___ENCODED_${counter}___`;
      placeholders[placeholder] = match;
      counter++;
      return placeholder;
    });

    // 对剩余字符进行编码
    str = this.percentEncode(str);

    // 恢复已编码的部分
    for (const placeholder in placeholders) {
      str = str.replace(new RegExp(placeholder, 'g'), placeholders[placeholder]);
    }

    return str;
  }

  /**
   * 生成阿里云 API 签名
   */
  private generateSignature(method: string, params: any, accessKeySecret: string): string {
    // 1. 对每个参数的名和值进行 percentEncode
    const encodedParams: any = {};
    for (const key in params) {
      encodedParams[key] = this.percentEncode(params[key]);
    }

    // 2. 按字典序排序参数
    const sortedKeys = Object.keys(encodedParams).sort();

    // 3. 构造查询字符串（已编码的参数）
    const canonicalizedQueryString = sortedKeys
      .map(key => `${key}=${encodedParams[key]}`)
      .join('&');

    console.log('查询字符串:', canonicalizedQueryString);

    // 4. 构造待签名字符串
    // 按照阿里云规范，需要对 canonicalizedQueryString 进行 percentEncode
    const stringToSign = `${method}&${this.percentEncode('/')}&${this.percentEncodeAll(canonicalizedQueryString)}`;

    console.log('待签名字符串:', stringToSign);

    // 5. 计算签名
    const signature = crypto
      .createHmac('sha1', accessKeySecret + '&')
      .update(stringToSign)
      .digest('base64');

    return signature;
  }

  /**
   * 生成 STS 临时凭证
   */
  async generateSTSToken(fileName: string, uniqueId?: string): Promise<STSResponse> {
    try {
      const stsConfig = getSTSConfig();
      const ossConfig = getOSSConfig();

      // 验证配置
      if (!ossConfig.accessKeyId || !ossConfig.accessKeySecret) {
        throw new Error('OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET must be set');
      }

      if (!stsConfig.roleArn) {
        throw new Error('STS_ROLE_ARN must be set');
      }

      // 生成唯一ID
      const finalUniqueId = uniqueId || uuidv4().substr(0, 8);
      const objectKey = `pdfs/${finalUniqueId}/${Date.now()}-${fileName}`;

      // STS endpoint
      const stsEndpoint = `https://sts.${stsConfig.region}.aliyuncs.com`;

      // 构造 Policy（使用通配符，避免中文名问题）
      const policy = {
        Version: '1',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['oss:PutObject'],
            Resource: [`acs:oss:*:*:${ossConfig.bucket}/*`]
          }
        ]
      };
      const policyBase64 = Buffer.from(JSON.stringify(policy)).toString('base64');

      // 构造请求参数
      const params: any = {
        Action: 'AssumeRole',
        Version: '2015-04-01',
        Format: 'JSON',
        RoleArn: stsConfig.roleArn,
        RoleSessionName: `${stsConfig.roleSessionName}-${finalUniqueId}`,
        DurationSeconds: stsConfig.tokenExpireSeconds,
        Policy: policyBase64,
        SignatureMethod: 'HMAC-SHA1',
        SignatureVersion: '1.0',
        SignatureNonce: uuidv4(),
        Timestamp: new Date().toISOString(),
        AccessKeyId: ossConfig.accessKeyId,
      };

      // 生成签名
      const signature = this.generateSignature('GET', params, ossConfig.accessKeySecret);

      console.log('STS 请求参数:', {
        endpoint: stsEndpoint,
        params: {
          ...params,
          Signature: signature.substring(0, 20) + '...',
        },
      });

      // 发送请求
      const response = await axios.get(stsEndpoint, {
        params: {
          ...params,
          Signature: signature,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: (status) => status < 500,
      });

      console.log('STS 响应状态:', response.status);
      console.log('STS 响应数据:', JSON.stringify(response.data, null, 2));

      // 解析响应
      if (response.data && response.data.Credentials) {
        const credentials = response.data.Credentials;

        return {
          credentials: {
            accessKeyId: credentials.AccessKeyId,
            accessKeySecret: credentials.AccessKeySecret,
            securityToken: credentials.SecurityToken,
            expiration: credentials.Expiration,
          },
          bucket: ossConfig.bucket,
          region: ossConfig.region,
          endpoint: ossConfig.endpoint,
          objectKey,
        };
      } else {
        throw new Error('STS API 返回格式错误: ' + JSON.stringify(response.data));
      }

    } catch (error: any) {
      console.error('生成STS临时凭证失败:', error.response?.data || error.message);

      if (error.response) {
        console.error('STS API 错误:', error.response.status, error.response.data);
      }

      throw new Error(`STS凭证生成失败: ${error.response?.data?.Message || error.message || '未知错误'}`);
    }
  }

  /**
   * 构建完整的 OSS 文件 URL
   */
  buildOSSUrl(objectKey: string): string {
    const config = getOSSConfig();
    return `https://${config.bucket}.${config.endpoint}/${objectKey}`;
  }

  /**
   * 从 OSS URL 中提取 objectKey
   */
  extractObjectKey(ossUrl: string): string {
    const urlWithoutProtocol = ossUrl.replace(/^https?:\/\//, '');
    return urlWithoutProtocol.replace(/^.*?\.(oss-[^/]+)\.aliyuncs\.com\//, '');
  }
}

export const ossStsService = new OSSSTSService();
