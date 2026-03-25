# 小说阅读器项目开发手册

## 从0到部署的完整指南

---

## 目录

1. [项目概述与技术栈](#1-项目概述与技术栈)
2. [本地开发环境搭建](#2-本地开发环境搭建)
3. [项目结构详解](#3-项目结构详解)
4. [数据库设计](#4-数据库设计)
5. [后端开发](#5-后端开发)
6. [前端开发](#6-前端开发)
7. [Git版本控制](#7-git版本控制)
8. [阿里云服务器部署](#8-阿里云服务器部署)
9. [常见问题与解决方案](#9-常见问题与解决方案)

---

## 1. 项目概述与技术栈

### 1.1 项目简介

这是一个**前后端分离**的小说阅读器Web应用，具有以下功能：
- 用户注册/登录
- 上传TXT小说文件
- 自动解析章节
- 阅读进度保存
- 云端数据同步

### 1.2 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | Vue 3 | 3.x | 渐进式JavaScript框架 |
| **构建工具** | Vite | 8.x | 现代化的前端构建工具 |
| **语言** | TypeScript | 5.9.x | 带类型的JavaScript |
| **路由** | Vue Router | 4.x | Vue官方路由库 |
| **HTTP客户端** | Axios | 1.6.x | HTTP请求库 |
| **本地存储** | IndexedDB (idb) | 8.x | 浏览器本地数据库 |
| **后端框架** | Express | 4.18.x | Node.js Web框架 |
| **数据库** | MySQL | 8.0 | 关系型数据库 |
| **ORM** | mysql2 | 3.6.x | MySQL Node.js驱动 |
| **认证** | JWT (jsonwebtoken) | 9.0.x | JSON Web Token认证 |
| **密码加密** | bcryptjs | 2.4.x | 密码哈希加密 |
| **文件上传** | multer | 1.4.x | Node.js文件上传中间件 |
| **跨域** | cors | 2.8.x | CORS中间件 |

### 1.3 系统架构

```
┌─────────────────────┐      ┌─────────────────────┐
│      前端 (Vite)    │ ──▶  │    后端 (Express)    │
│   Vue 3 + TS        │      │   Node.js           │
│   http://localhost  │      │   http://localhost  │
│        :5173        │      │        :3000        │
└─────────────────────┘      └─────────────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │   MySQL     │
                                       │   8.0       │
                                       └─────────────┘
```

---

## 2. 本地开发环境搭建

### 2.1 必需软件安装

#### Node.js 安装

**Windows/Mac:**
1. 访问 https://nodejs.org/
2. 下载LTS版本（推荐18.x或20.x）
3. 运行安装程序

**验证安装:**
```bash
node -v    # 应显示 v18.x.x 或 v20.x.x
npm -v     # 应显示 10.x.x
```

#### MySQL 安装

**Windows:**
1. 下载 MySQL Installer: https://dev.mysql.com/downloads/installer/
2. 运行安装程序，选择"Developer Default"
3. 设置root密码为 `root`

**Mac (使用Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**验证安装:**
```bash
mysql -v
```

### 2.2 项目初始化

```bash
# 克隆项目
git clone https://github.com/aiubiwb/read.git
cd read

# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
```

### 2.3 启动项目

**终端1 - 启动后端:**
```bash
cd server
npm start
# 或 node server.js
# 输出: 服务器运行在 http://localhost:3000
```

**终端2 - 启动前端:**
```bash
cd read
npm run dev
# 输出: Local: http://localhost:5173
```

**访问:** 打开浏览器 http://localhost:5173

---

## 3. 项目结构详解

```
read/                          # 项目根目录
├── src/                       # 前端源代码
│   ├── assets/               # 静态资源（图片等）
│   ├── router/              # 路由配置
│   │   └── index.ts
│   ├── types/               # TypeScript类型定义
│   │   └── index.ts
│   ├── utils/               # 工具函数
│   │   ├── api.ts           # API请求封装 ⚠️ 重要：部署时需修改
│   │   ├── db.ts            # IndexedDB本地数据库
│   │   ├── parser.ts         # 小说解析器
│   │   └── storage.ts       # 本地存储
│   ├── views/               # 页面组件
│   │   ├── BookshelfView.vue # 书架页面
│   │   ├── HomeView.vue      # 首页
│   │   └── ReaderView.vue    # 阅读页面
│   ├── App.vue              # 根组件
│   ├── main.ts              # 入口文件
│   └── style.css            # 全局样式
├── server/                   # 后端源代码
│   ├── uploads/             # 上传的小说文件
│   ├── config.json          # 配置文件 ⚠️ 重要：数据库配置
│   ├── package.json
│   └── server.js            # 主服务文件
├── public/                  # 公共静态资源
├── package.json             # 前端依赖配置
├── vite.config.ts          # Vite构建配置
└── tsconfig.json          # TypeScript配置
```

### 3.1 核心配置文件

**server/config.json** - 数据库配置：
```json
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "root",
  "database": "novel_reader"
}
```

**src/utils/api.ts** - API地址配置：
```typescript
const API_URL = 'http://localhost:3000/api'
// ⚠️ 部署时需要改成服务器IP
```

---

## 4. 数据库设计

### 4.1 数据库创建

```sql
CREATE DATABASE novel_reader CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE novel_reader;
```

### 4.2 表结构

#### users 表 - 用户表
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,    -- 加密后的密码
  created_at DATETIME
);
```

#### books 表 - 书籍表
```sql
CREATE TABLE books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,              -- 关联users表
  name VARCHAR(255) NOT NULL,         -- 书名
  filename VARCHAR(255) NOT NULL,     -- 文件名
  created_at DATETIME
);
```

#### chapters 表 - 章节表
```sql
CREATE TABLE chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,              -- 关联books表
  chapter_index INT NOT NULL,        -- 章节序号
  title VARCHAR(255),                 -- 章节标题
  content TEXT,                      -- 章节内容
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

#### progress 表 - 阅读进度表
```sql
CREATE TABLE progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,              -- 关联users表
  book_id INT NOT NULL,              -- 关联books表
  chapter_index INT DEFAULT 0,       -- 当前章节
  scroll_top INT DEFAULT 0,          -- 滚动位置
  updated_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

### 4.3 表关系图

```
users (用户)
  │
  ├── 1:N ──▶ books (书籍)
  │              │
  │              └── 1:N ──▶ chapters (章节)
  │
  └── 1:N ──▶ progress (阅读进度)
              │
              └── N:1 ──▶ books (书籍)
```

---

## 5. 后端开发

### 5.1 技术要点

- **Express框架**: 简洁灵活的Node.js Web框架
- **RESTful API**: 遵循REST规范的API设计
- **JWT认证**: 无状态的身份验证
- **密码加密**: bcryptjs加密存储
- **文件上传**: multer处理TXT文件上传

### 5.2 API接口列表

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/register | 否 | 用户注册 |
| POST | /api/login | 否 | 用户登录 |
| GET | /api/books | 是 | 获取用户书籍列表 |
| GET | /api/book/:id | 是 | 获取书籍详情（含章节） |
| GET | /api/chapter/:id | 是 | 获取章节内容 |
| DELETE | /api/book/:id | 是 | 删除书籍 |
| GET | /api/progress/:bookId | 是 | 获取阅读进度 |
| POST | /api/progress/:bookId | 是 | 保存阅读进度 |
| POST | /api/upload | 是 | 上传小说文件 |

### 5.3 核心代码解析

#### 数据库连接池
```javascript
const pool = mysql.createPool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
  waitForConnections: true,
  connectionLimit: 10
})
```

#### JWT认证中间件
```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: '请先登录' })

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: '登录已过期' })
    req.user = user
    next()
  })
}
```

#### TXT文件解析
```javascript
function parseTxtFile(content, filename) {
  // 识别章节标题：第X章、第X卷
  const chapterRegex = /^第[一二三四五六七八九十百千\d]+[部章卷]/
  // ...解析逻辑
}
```

---

## 6. 前端开发

### 6.1 技术要点

- **Vue 3 Composition API**: 组合式API
- **TypeScript**: 类型安全
- **Vite**: 快速开发服务器
- **IndexedDB**: 浏览器本地存储

### 6.2 核心功能

#### API请求封装 (api.ts)
```typescript
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
})

// 请求拦截器：自动添加Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

#### 本地数据库 (db.ts)
```typescript
import { openDB } from 'idb'

const DB_NAME = 'novel-reader'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建books、chapters、progress对象仓库
    }
  })
}
```

### 6.3 页面组件

- **HomeView.vue**: 首页，包含登录/注册表单
- **BookshelfView.vue**: 书架，展示用户上传的书籍
- **ReaderView.vue**: 阅读器，显示章节内容

---

## 7. Git版本控制

### 7.1 基础命令

```bash
# 初始化仓库
git init

# 克隆仓库
git clone https://github.com/用户名/仓库名.git

# 查看状态
git status

# 添加文件到暂存区
git add .
# 或添加单个文件
git add 文件名

# 提交更改
git commit -m "提交说明"

# 查看历史
git log --oneline

# 查看远程仓库
git remote -v
```

### 7.2 版本回退

```bash
# 回退到上一个版本
git reset --hard HEAD~1

# 回退到指定版本
git reset --hard <commit-hash>

# 撤销某个提交（创建新提交）
git revert <commit-hash>
```

### 7.3 推送到远程

```bash
# 第一次推送，设置上游分支
git push -u origin master

# 之后推送
git push

# 强制推送（⚠️ 谨慎使用，会覆盖远程）
git push --force
```

### 7.4 常见问题

#### 问题1: 远程仓库配置错误

**症状:** push时需要每次手动设置远程仓库地址

**原因:** 项目中配置了多个远程仓库，master分支指向错误的仓库

**解决:**
```bash
# 查看远程仓库
git remote -v

# 删除多余的远程仓库
git remote remove read

# 确保master指向origin
git config branch.master.remote origin
```

#### 问题2: 每次push都需要输入密码

**解决:** 使用SSH方式连接GitHub
```bash
git remote set-url origin git@github.com:aiubiwb/read.git
```

---

## 8. 阿里云服务器部署

### 8.1 服务器配置要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 1核 | 2核 |
| 内存 | 1GB | 2GB |
| 带宽 | 1Mbps | 3-5Mbps |
| 系统盘 | 40GB | 40GB SSD |
| 操作系统 | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### 8.2 部署流程

#### 第一步：重装系统（可选）

如果服务器环境混乱，可在阿里云控制台重置实例：
1. 登录阿里云控制台 https://ecs.console.aliyun.com/
2. 停止实例
3. 更多 → 重置实例
4. 选择 Ubuntu 22.04 LTS

#### 第二步：SSH连接服务器

```bash
ssh root@你的服务器IP
```

#### 第三步：安装基础环境

```bash
# 更新系统
apt update && apt upgrade -y

# 安装Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装MySQL
apt install -y mysql-server
```

#### 第四步：配置MySQL

```bash
# 启动MySQL
systemctl start mysql
systemctl enable mysql

# 进入MySQL
sudo mysql

# 设置root密码
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;
EXIT;
```

#### 第五步：创建数据库

```bash
sudo mysql -u root -p
# 输入密码 root

CREATE DATABASE novel_reader CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### 第六步：导入数据库表结构

```bash
# 方法1: 从本地上传SQL文件后导入
sudo mysql -u root -p novel_reader < /root/novel_reader.sql

# 方法2: 手动创建表（见第4节）
```

#### 第七步：开放服务器端口

在阿里云控制台 → 安全组 → 配置规则：

| 协议 | 端口 | 源地址 | 描述 |
|------|------|--------|------|
| TCP | 3000 | 0.0.0.0/0 | 后端API |
| TCP | 5173 | 0.0.0.0/0 | 前端开发 |
| TCP | 80 | 0.0.0.0/0 | HTTP |

#### 第八步：上传项目代码

**方法A: 从GitHub克隆**
```bash
cd /root
git clone https://github.com/aiubiwb/read.git
```

**方法2: 本地上传**
使用FileZilla等工具上传zip文件，然后解压

#### 第九步：创建uploads目录

```bash
# 创建uploads目录（代码已自动处理，但建议手动创建确保存在）
mkdir -p /root/read/server/uploads
chmod 777 /root/read/server/uploads
```

#### 第十步：安装依赖

```bash
# 前端依赖
cd /root/read
npm install

# 后端依赖
cd /root/read/server
npm install
```

#### 第十一步：修改前端API地址

```bash
nano /root/read/src/utils/api.ts
```

修改第一行为服务器IP：
```typescript
const API_URL = 'http://你的服务器IP:3000/api'
```

#### 第十二步：启动服务

```bash
# 启动后端
cd /root/read/server
npm start &

# 启动前端（新开终端）
cd /root/read
npm run dev -- --host
```

#### 第十三步：访问测试

```
http://你的服务器IP:5173
```

### 8.3 配置PM2开机自启（推荐）

```bash
# 安装PM2
npm install -g pm2

# 用PM2启动后端
cd /root/read/server
pm2 start server.js

# 用PM2启动前端
cd /root/read
pm2 start npm --name "frontend" -- run dev -- --host

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
# 按照输出命令执行
```

---

## 9. 常见问题与解决方案

### 9.1 本地开发问题

#### 问题1: npm install 失败

**原因:** 网络问题或缓存损坏

**解决:**
```bash
# 清除缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules
npm install
```

#### 问题2: MySQL无法连接

**原因:** MySQL服务未启动或密码错误

**解决:**
```bash
# 启动MySQL
systemctl start mysql

# 检查状态
systemctl status mysql

# 测试连接
mysql -u root -p
```

#### 问题3: 端口被占用

**原因:** 端口3000或5173被其他程序占用

**解决:**
```bash
# 查找占用端口的进程
netstat -tlnp | grep :3000

# 结束进程
kill -9 <进程ID>
```

### 9.2 部署问题

#### 问题1: 浏览器显示"network error"

**原因:** 前端API地址指向localhost，未修改为服务器IP

**解决:** 修改 `src/utils/api.ts` 中的API_URL

#### 问题2: 后端无法连接数据库

**原因:** 
1. 数据库配置文件中密码错误
2. 数据库未创建
3. MySQL未启动

**解决:**
```bash
# 检查MySQL状态
systemctl status mysql

# 测试数据库连接
mysql -u root -p

# 检查config.json配置
cat /root/read/server/config.json
```

#### 问题3: 前端无法访问

**原因:** 安全组未开放端口

**解决:** 在阿里云控制台安全组添加5173端口规则

#### 问题4: 服务重启后需要手动启动

**原因:** 未配置PM2或systemd

**解决:** 使用PM2管理进程（见8.3节）

### 9.3 Git问题

#### 问题1: push被拒绝

**原因:** 远程有更新，本地落后

**解决:**
```bash
# 先拉取远程更新
git pull --rebase origin master

# 然后推送
git push
```

**或者强制推送（⚠️谨慎）:**
```bash
git push --force
```

#### 问题2: 忘记密码导致无法push

**解决:** 配置SSH Key或使用Token

#### 问题3: 误删文件想恢复

**解决:**
```bash
# 查看操作历史
git reflog

# 恢复到指定版本
git reset --hard <版本号>
```

### 9.4 部署问题

#### 问题1: 上传小说提示"解析失败"

**原因:** 服务器上没有uploads目录

**解决:**
```bash
# 创建uploads目录
mkdir -p /root/read/server/uploads
chmod 777 /root/read/server/uploads

# 重启后端服务
```

**或升级代码到最新版本（已自动创建目录）**

#### 问题2: 上传重复小说时报错

**原因:** 新版本增加了重复检测逻辑

**解决:** 
- 这是正常行为，表示这本书你已经上传过了
- 如果确实需要重新上传，可以先在书架中删除原有书籍，再上传

---

## 附录

### A. 命令速查表

```bash
# 开发相关
npm run dev          # 启动前端开发服务器
npm run build        # 构建生产版本
npm start            # 启动后端

# Git相关
git status           # 查看状态
git add .            # 添加所有文件
git commit -m ""    # 提交
git push            # 推送
git pull            # 拉取
git reset --hard    # 版本回退

# MySQL相关
sudo mysql          # 进入MySQL
SHOW DATABASES;     # 查看数据库
USE novel_reader;   # 使用数据库
SHOW TABLES;        # 查看表
SELECT * FROM users; # 查询数据

# 进程相关
netstat -tlnp       # 查看监听端口
kill -9 <PID>       # 结束进程

# PM2相关
pm2 list            # 查看进程
pm2 logs            # 查看日志
pm2 restart all    # 重启所有进程
```

### B. 文件路径参考

| 文件 | 说明 |
|------|------|
| 前端入口 | src/main.ts |
| 前端路由 | src/router/index.ts |
| API配置 | src/utils/api.ts |
| 本地数据库 | src/utils/db.ts |
| 后端入口 | server/server.js |
| 数据库配置 | server/config.json |
| 后端依赖 | server/package.json |

### C. 版本信息记录

| 软件 | 本地版本 | 服务器版本 |
|------|----------|------------|
| Node.js | v20.x | v20.20.1 |
| npm | 10.x | 10.8.2 |
| MySQL | 8.0 | 8.0.45 |
| Vue | 3.x | - |
| Vite | 8.x | - |

---

*文档最后更新: 2026年3月*
