import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'Admin123';

bcrypt.hash(password, 10).then((hash) => {
  console.log(`\n密码: ${password}`);
  console.log(`bcrypt hash: ${hash}\n`);
  console.log('请将此hash复制到 .env 文件的 ADMIN_PASSWORD_HASH 中\n');
});
