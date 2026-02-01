@echo off
echo ========================================
echo   PDF System - 诊断工具
echo ========================================
echo.

echo [1/5] 检查 Node.js 是否安装...
node --version >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Node.js 未安装
    goto :end
)
echo   [OK] Node.js 已安装
echo.

echo [2/5] 检查依赖是否安装...
if not exist node_modules (
    echo   [WARNING] 根目录依赖未安装
    echo   正在安装依赖...
    call npm install
)

if not exist server\node_modules (
    echo   [WARNING] server 依赖未安装
    echo   正在安装 server 依赖...
    cd server
    call npm install
    cd ..
)

if not exist admin\node_modules (
    echo   [WARNING] admin 依赖未安装
    echo   正在安装 admin 依赖...
    cd admin
    call npm install
    cd ..
)

if not exist viewer\node_modules (
    echo   [WARNING] viewer 依赖未安装
    echo   正在安装 viewer 依赖...
    cd viewer
    call npm install
    cd ..
)
echo   [OK] 依赖已安装
echo.

echo [3/5] 检查服务是否运行...
echo   检查端口 3001 (后端)...
netstat -ano | findstr ":3001.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo   [WARNING] 后端服务未运行 (端口 3001)
    set BACKEND_RUNNING=0
) else (
    echo   [OK] 后端服务正在运行 (端口 3001)
    set BACKEND_RUNNING=1
)

echo   检查端口 5173 (管理端)...
netstat -ano | findstr ":5173.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo   [WARNING] 管理端未运行 (端口 5173)
    set ADMIN_RUNNING=0
) else (
    echo   [OK] 管理端正在运行 (端口 5173)
    set ADMIN_RUNNING=1
)

echo   检查端口 5174 (用户端)...
netstat -ano | findstr ":5174.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo   [WARNING] 用户端未运行 (端口 5174)
    set VIEWER_RUNNING=0
) else (
    echo   [OK] 用户端正在运行 (端口 5174)
    set VIEWER_RUNNING=1
)
echo.

echo [4/5] 测试后端 API...
curl -s http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] 后端 API 无响应
    echo   请检查后端服务是否正常启动
) else (
    echo   [OK] 后端 API 响应正常
)
echo.

echo [5/5] 检查环境变量文件...
if not exist server\.env (
    echo   [WARNING] server/.env 文件不存在
    echo   正在创建默认配置...
    copy server\.env.example server\.env
) else (
    echo   [OK] server/.env 存在
)

if not exist admin\.env (
    echo   [WARNING] admin/.env 文件不存在
    echo   正在创建默认配置...
    copy admin\.env.example admin\.env
) else (
    echo   [OK] admin/.env 存在
)

if not exist viewer\.env (
    echo   [WARNING] viewer/.env 文件不存在
    echo   正在创建默认配置...
    copy viewer\.env.example viewer\.env
) else (
    echo   [OK] viewer/.env 存在
)
echo.

echo ========================================
echo   诊断结果
echo ========================================
echo.

if %BACKEND_RUNNING%==0 (
    echo [问题] 后端服务未运行
    echo.
    echo 解决方案：
    echo 1. 运行 start.bat 启动所有服务
    echo 2. 或手动启动后端: cd server ^&^& npm run dev
    echo.
)

if %ADMIN_RUNNING%==0 (
    echo [问题] 管理端未运行
    echo.
    echo 解决方案：
    echo 1. 运行 start.bat 启动所有服务
    echo 2. 或手动启动管理端: cd admin ^&^& npm run dev
    echo.
)

echo ========================================
echo   登录信息
echo ========================================
echo.
echo 管理端地址: http://localhost:5173
echo 默认用户名: Admin
echo 默认密码: Admin123
echo.
echo 注意: 密码必须包含数字和字母，至少8位
echo.

:end
pause
