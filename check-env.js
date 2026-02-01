// 检查环境变量是否正确加载
// 在浏览器控制台运行此脚本来验证

console.log('=== 环境变量检查 ===');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_DOMAIN:', import.meta.env.VITE_DOMAIN);

// 生成二维码链接测试
const testUniqueId = 'test123';
const testUrl = `${import.meta.env.VITE_DOMAIN || 'http://localhost:5174'}/view/${testUniqueId}`;

console.log('\n=== 测试二维码链接 ===');
console.log('生成的链接:', testUrl);

console.log('\n=== 预期结果 ===');
console.log('VITE_DOMAIN 应该是: http://192.168.31.206:5174');
console.log('测试链接应该是: http://192.168.31.206:5174/view/test123');

console.log('\n=== 如果显示 localhost，说明： ===');
console.log('1. 管理端服务未重启（最可能）');
console.log('2. 浏览器缓存了旧代码');
console.log('3. Vite缓存未清除');
