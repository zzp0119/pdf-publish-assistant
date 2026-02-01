/**
 * 批量更新 OSS 文件权限为公共读
 *
 * 使用方法：
 * cd server
 * npx tsx src/scripts/fixOssAcl.ts
 */

import OSS from 'ali-oss';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const config = {
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET || '',
};

if (!config.accessKeyId || !config.accessKeySecret || !config.bucket) {
  console.error('❌ OSS 配置不完整，请检查 .env 文件');
  process.exit(1);
}

const client = new OSS({
  region: config.region,
  accessKeyId: config.accessKeyId,
  accessKeySecret: config.accessKeySecret,
  bucket: config.bucket,
  secure: true,
});

async function fixPDFsACL() {
  try {
    console.log('🔍 开始扫描 OSS 中的 PDF 文件...');
    console.log(`📦 Bucket: ${config.bucket}`);
    console.log(`🌐 区域: ${config.region}`);
    console.log('');

    let count = 0;
    let successCount = 0;
    let errorCount = 0;

    // 列出 pdfs 目录下的所有文件
    const result = await client.list({
      prefix: 'pdfs/',
      'max-keys': 1000,
    });

    if (!result.objects || result.objects.length === 0) {
      console.log('ℹ️  没有找到 PDF 文件');
      return;
    }

    console.log(`📄 找到 ${result.objects.length} 个文件`);
    console.log('');

    for (const object of result.objects) {
      count++;
      const objectKey = object.name;

      try {
        // 设置文件为公共读
        await client.putACL(objectKey, 'public-read');
        successCount++;
        console.log(`✅ [${count}/${result.objects.length}] ${objectKey.split('/').pop()}`);
      } catch (error: any) {
        errorCount++;
        console.error(`❌ [${count}/${result.objects.length}] ${objectKey}: ${error.message}`);
      }
    }

    console.log('');
    console.log('========================================');
    console.log('   处理完成');
    console.log('========================================');
    console.log(`总计: ${count} 个文件`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${errorCount} 个`);
    console.log('');

    if (errorCount > 0) {
      console.log('⚠️  部分文件权限更新失败，请检查 OSS 权限配置');
    } else {
      console.log('✅ 所有文件权限已更新为公共读');
    }

  } catch (error: any) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

// 执行
fixPDFsACL();
