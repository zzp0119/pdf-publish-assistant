@echo off
echo ========================================
echo   修复 OSS 文件权限
echo ========================================
echo.
echo 此工具将批量更新 OSS 中所有 PDF 文件的权限为公共读
echo.
echo 正在执行...
echo.

cd server
npx tsx src/scripts/fixOssAcl.ts

echo.
pause
