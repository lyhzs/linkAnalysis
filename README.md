# 抖音视频解析服务

将抖音分享链接（或整段分享文本）解析为可直接播放的视频直链，提供 HTTP API 接口。

## 功能

- 接收抖音分享链接（短链）或整段分享文本，自动提取链接
- 解析出视频直链（`videoUrls`）、封面图、标题、点赞/评论/收藏数
- LRU 缓存，同样的链接短时间内重复请求不会重复解析
- 浏览器连接池，支持并发请求
- 健康检查接口，方便监控

---

## 技术栈

| 组件 | 技术 | 说明 |
|---|---|---|
| 运行环境 | **Node.js 20+** | JavaScript 服务端运行时 |
| Web 框架 | **Fastify 5** | 高性能 HTTP 服务器 |
| 浏览器自动化 | **Puppeteer 21** | 操控 Chrome 浏览器解析页面 |
| 缓存 | **lru-cache** | 内存 LRU 缓存 |
| HTTP 客户端 | **undici** | 内置 HTTP 请求库 |
| 容器化 | **Docker + docker-compose** | 一键部署 |

---

## 环境要求

### 方式一：本机直接运行（开发/轻量使用）

| 软件 | 版本要求 | 下载地址 |
|---|---|---|
| **Node.js** | >= 18, 推荐 20 LTS | [https://nodejs.org/](https://nodejs.org/) → 下载 **20.x LTS** 版本 |
| **Google Chrome** | 最新版即可 | [https://www.google.com/chrome/](https://www.google.com/chrome/) |
| **Git**（选装） | 任意版本 | [https://git-scm.com/](https://git-scm.com/) |

#### Node.js 安装指引

1. 打开 [https://nodejs.org/](https://nodejs.org/)
2. 下载 **20.x LTS** 版本（左侧按钮，带 "Recommended For Most Users" 字样）
3. 双击安装包，一路点 Next，**安装时勾选 "Automatically install the necessary tools"**
4. 安装完成后，打开终端（Win+R → 输入 `cmd` → 回车），输入以下命令验证：

```bash
node -v
# 应该输出 v20.x.x

npm -v
# 应该输出 10.x.x
```

> 如果 `node -v` 提示找不到命令，**重启电脑**后再试。

### 方式二：Docker 部署（生产环境/服务器）

| 软件 | 版本要求 | 下载地址 |
|---|---|---|
| **Docker Desktop** | 最新版 | [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/) |
| **Git** (选装) | 任意版本 | [https://git-scm.com/](https://git-scm.com/) |

#### Docker Desktop 安装指引（Windows）

1. 打开 [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. 点击 **Download for Windows**
3. 双击安装 `Docker Desktop Installer.exe`
4. 安装时勾选 **"Use WSL 2 instead of Hyper-V"**（如果系统支持）
5. 安装完成后**重启电脑**
6. 启动 Docker Desktop（桌面上找鲸鱼图标），等待左下角显示 "Engine running"

---

## 快速开始

### 方式一：本机运行

**第 1 步：获取项目**

```bash
# 方式 A：直接下载 ZIP（推荐给小白）
# 去 GitHub/项目页面下载 ZIP 压缩包 → 解压到 D:\aisoft\linkAnalysis

# 方式 B：已有项目目录，打开终端
cd D:\aisoft\linkAnalysis
```

**第 2 步：安装依赖**

```bash
npm install
```

> 这个过程会下载 Puppeteer 自带的 Chromium 浏览器（约 300MB），**请保持网络通畅**，耐心等待。
> 如果下载太慢或失败，看到下文 **[常见问题](#常见问题)**。

**第 3 步：配置环境变量（可选）**

编辑项目根目录下的 `.env` 文件：

```env
PORT=3000                          # 服务端口
BROWSER_MAX=3                      # 浏览器池最大实例数
PUPPETEER_HEADLESS=true            # 无头模式（不显示浏览器窗口）
CHROMIUM_PATH=                     # 留空自动使用 Puppeteer 自带的浏览器
CACHE_TTL=3600000                  # 缓存过期时间（毫秒）
LOG_LEVEL=info                     # 日志级别
```

如果本机已经安装了 Google Chrome，可以设置 `CHROMIUM_PATH` 指向 Chrome 路径来**跳过 300MB 的 Chromium 下载**：

```env
CHROMIUM_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

> Chrome 默认安装路径：
> - `C:\Program Files\Google\Chrome\Application\chrome.exe`
> - `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

**第 4 步：启动服务**

```bash
npm start
```

看到以下输出说明启动成功：

```
server started: http://0.0.0.0:3000
browser pool: max 3 instances
cache TTL: 3600s
```

按 `Ctrl + C` 可停止服务。

**第 5 步：测试**

同一个终端保持运行，打开浏览器访问：

```
http://127.0.0.1:3000/health
```

返回 `{"status":"ok",...}` 说明服务正常。继续在浏览器输入：

```
http://127.0.0.1:3000/api/parse?url=https://v.douyin.com/eB26jHo28gQ/
```

返回包含 `videoUrls` 字段的 JSON 即解析成功。

> 首次调用 `/api/parse` 会慢一些（约 3-5 秒），因为 Puppeteer 需要启动 Chrome 浏览器。后续请求会复用浏览器，速度会快很多。

### 方式二：Docker 部署

> 确保已安装 Docker Desktop 并启动。

**第 1 步：获取项目**

```bash
cd D:\aisoft\linkAnalysis
```

**第 2 步：启动服务**

```bash
docker compose up -d --build
```

> 首次启动会构建镜像（约 5-10 分钟），以后启动只需 `docker compose up -d` 即可。

**第 3 步：查看日志**

```bash
docker compose logs -f
```

按 `Ctrl + C` 退出日志查看。

**第 4 步：停止服务**

```bash
docker compose down
```

---

## API 文档

### GET /health — 健康检查

请求示例：

```http
GET http://127.0.0.1:3000/health
```

响应示例：

```json
{
  "status": "ok",
  "uptime": 123.45,
  "browserPool": {
    "total": 0,
    "available": 0,
    "pending": 0
  },
  "cacheSize": 0
}
```

### GET /api/parse — 解析视频（推荐方式）

请求示例（直接传抖音链接）：

```http
GET http://127.0.0.1:3000/api/parse?url=https://v.douyin.com/eB26jHo28gQ/
```

请求示例（传整段分享文本，自动提取链接）：

```http
GET http://127.0.0.1:3000/api/parse?text=2.51 02/11 qrr:/ o@D.HI :4pm 财不外露 ... https://v.douyin.com/eB26jHo28gQ/ ... 直接观看视频！
```

### POST /api/parse — 解析视频

请求示例（JSON Body）：

```http
POST http://127.0.0.1:3000/api/parse
Content-Type: application/json

{"url": "https://v.douyin.com/eB26jHo28gQ/"}
```

或者：

```http
POST http://127.0.0.1:3000/api/parse?text=整段分享文本...
```

响应格式：

```json
{
  "status": true,
  "data": {
    "title": "财不外露 #财不外露 #星巴克 #蜜雪冰城 #瑞幸",
    "coverUrls": "https://p26-sign.douyinpic.com/...",
    "videoUrls": "https://www.iesdouyin.com/aweme/v1/playwm/?video_id=...",
    "isVideo": true,
    "like": 70210,
    "comment": 1680,
    "collect": 3218,
    "createTime": "2026-06-22 23:29:27",
    "leftTimes": 7200,
    "usageTimes": 0
  }
}
```

错误响应：

```json
{
  "status": false,
  "error": "missing url or text parameter"
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `status` | boolean | 是否成功 |
| `data.title` | string | 视频标题 |
| `data.coverUrls` | string | 视频封面图 URL |
| `data.videoUrls` | string | **视频直链，可直接播放** |
| `data.isVideo` | boolean | 是否为视频 |
| `data.like` | number | 点赞数 |
| `data.comment` | number | 评论数 |
| `data.collect` | number | 收藏数 |
| `data.createTime` | string | 发布时间 |
| `data.leftTimes` | number | 视频链接剩余有效秒数 |
| `error` | string | 失败时的错误信息 |

> `like` / `comment` / `collect` / `createTime` / `coverUrls` 目前可能为空，取决于抖音页面结构。`videoUrls`（视频直链）是核心返回值，始终可用。

---

## 前端集成示例

### HTML + JavaScript（最简单的播放器）

```html
<!DOCTYPE html>
<html>
<body>
  <input id="urlInput" placeholder="粘贴抖音分享链接" style="width:400px" />
  <button onclick="parse()">解析</button>
  <video id="player" controls style="width:100%;max-width:600px;margin-top:20px;display:none"></video>

  <script>
    async function parse() {
      const url = document.getElementById('urlInput').value;
      const res = await fetch('/api/parse?url=' + encodeURIComponent(url));
      const data = await res.json();
      if (data.status) {
        const video = document.getElementById('player');
        video.src = data.data.videoUrls;
        video.style.display = 'block';
        video.play();
      } else {
        alert('解析失败：' + data.error);
      }
    }
  </script>
</body>
</html>
```

### Vue.js

```js
async function parseDouyin(shareText) {
  const res = await fetch(`/api/parse?text=${encodeURIComponent(shareText)}`);
  return await res.json();
}
```

---

## 项目结构

```
D:\aisoft\linkAnalysis\
├── src/
│   ├── config.js          # 配置：从 .env 读取参数
│   ├── cache.js           # LRU 缓存：避免重复请求
│   ├── browserPool.js     # 浏览器连接池：管理 Chrome 实例
│   ├── parseVideo.js      # 核心解析逻辑
│   └── server.js          # HTTP 服务：路由 + 启动
├── .env                   # 环境变量配置
├── .gitignore
├── Dockerfile             # Docker 镜像构建文件
├── docker-compose.yml     # Docker 编排配置
├── package.json           # Node.js 项目配置
└── README.md              # 本文件
```

---

## 配置参考

修改项目根目录的 `.env` 文件，不需要重启——重启时自动读取。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 服务端口 |
| `HOST` | `0.0.0.0` | 监听地址（0.0.0.0 表示允许所有 IP 访问） |
| `BROWSER_MAX` | `3` | 浏览器池最大实例数（每实例约占用 100MB 内存） |
| `BROWSER_PAGES` | `5` | 每个浏览器最大并发页面数 |
| `PUPPETEER_HEADLESS` | `true` | 是否启用无头模式 |
| `CHROMIUM_PATH` | 空 | 指定 Chrome/Chromium 路径，留空自动用内置浏览器 |
| `NAV_TIMEOUT` | `30000` | 页面加载超时（毫秒） |
| `CACHE_TTL` | `3600000` | 缓存过期时间（毫秒，1 小时） |
| `CACHE_MAX` | `500` | 缓存最大条目数 |
| `RATE_LIMIT` | `15` | 每分钟最多解析次数 |
| `LOG_LEVEL` | `info` | 日志级别：`info` / `debug` / `warn` / `error` |
| `PROXY_URL` | 空 | HTTP 代理地址（可选） |

---

## Docker 部署详情

### docker-compose.yml 说明

```yaml
services:
  douyin-parse:
    build: .                          # 使用当前目录的 Dockerfile
    container_name: douyin-parse      # 容器名称
    ports:
      - "3000:3000"                   # 宿主机 3000 端口 → 容器 3000 端口
    environment:
      - PORT=3000
      - BROWSER_MAX=3
      - PUPPETEER_HEADLESS=true
    restart: unless-stopped           # 自动重启
    deploy:
      resources:
        limits:
          memory: 1.5g                # 内存上限 1.5GB
```

### Docker 常用命令

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看运行状态
docker ps
```

### Docker 镜像大小说明

- 基础镜像 `node:20-slim`：约 200MB
- 安装系统 Chromium 及依赖：约 200MB
- 项目代码 + npm 依赖：约 50MB
- **总镜像大小约 500MB**

---

## 常见问题

### Q：Puppeteer 下载 Chromium 太慢 / 下载失败

**方法 A：使用系统已安装的 Chrome**

编辑 `.env`，添加：

```env
CHROMIUM_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

然后重新安装 Puppeteer（跳过浏览器下载）：

```bash
# 先在终端设置环境变量跳过下载
$env:PUPPETEER_SKIP_DOWNLOAD="true"
npm install puppeteer@21

# 或者直接设置一次后永久生效：
# 打开系统环境变量，新建 PUPPETEER_SKIP_DOWNLOAD=true
```

**方法 B：手动下载 Chromium**

1. 下载 [chrome-win64.zip](https://storage.googleapis.com/chrome-for-testing-public/150.0.7871.24/win64/chrome-win64.zip)
2. 解压到 `C:\Users\你的用户名\.cache\puppeteer\chrome\150.0.7871.24-chrome-win64\`
3. 确保 `chrome.exe` 在该目录下

### Q：启动报错 "Cannot find module"

```bash
# 重新安装所有依赖
cd D:\aisoft\linkAnalysis
rm -rf node_modules package-lock.json
npm install
```

### Q：端口被占用

改 `.env` 里的 `PORT`：

```env
PORT=3001
```

或者直接启动时指定：

```bash
$env:PORT=3001; npm start
```

### Q：解析结果没有点赞/评论/收藏数

抖音页面结构会不定期更新，导致 SSR 数据字段名变化。如果 `like` / `comment` / `collect` 返回 0，不影响 `videoUrls`（视频直链）的使用。后续可以更新 `src/parseVideo.js` 中的数据提取逻辑。

### Q：视频链接播放不了

Docker 部署时如果视频播放失败，可能是容器内网络问题。尝试在 `.env` 设置代理：

```env
PROXY_URL=http://你的代理地址:端口
```

### Q：内存占用太高

调小浏览器池：

```env
BROWSER_MAX=1
```

每个 Chrome 实例约占用 100MB 内存，加上 Node.js 本身约 50MB，总内存约 150MB。

---

## 许可证

MIT
