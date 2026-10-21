# 明月的小站 · 纯静态个人博客（带在线后台）

一个**零依赖、零构建、零数据库**的纯静态个人博客。
特色：**所有内容存在 JSON 里，可在浏览器 `/admin` 后台直接编辑，保存后自动重新部署**——
不用每次手动上传，也不需要服务器。将来有服务器 / 装了 1Panel，整套文件夹原样搬过去也能跑。

```
.
├── index.html            # 首页（文章列表，由 site.js 读取 JSON 渲染）
├── post.html             # 文章页（?p=slug 读取对应文章）
├── about.html            # 关于页
├── admin/                # Decap CMS 在线后台
│   ├── index.html
│   └── config.yml        # ← 上线前需填 GitHub 仓库和 OAuth 地址
├── content/
│   ├── site.json         # 站点信息（站名、首页简介、关于页）
│   └── posts.json        # 所有文章（标题/日期/摘要/标签/正文 Markdown）
├── assets/
│   ├── style.css         # 样式（改配色看 :root 变量）
│   └── site.js           # 读取 JSON 渲染首页/文章/关于
├── assets/uploads/       # 后台上传的图片存放处
├── serve.py              # 本地预览服务器（跨平台）
├── start.bat / start.sh  # 一键启动脚本
└── .gitignore
```

---

## 一、本地预览（一键启动）

项目自带启动脚本，**因为页面靠 `fetch` 读取 JSON，必须用本地服务器预览**（不能直接双击 `file://` 打开）：

- **Windows**：双击 `start.bat`（自动开浏览器）。
- **macOS / Linux / Git Bash**：运行 `./start.sh`。
- **手动**：`python serve.py`（默认 8080，可加端口号 `python serve.py 9000`）。

`serve.py`：绑定 `0.0.0.0`（同 WiFi 手机可访问）、自动开浏览器、关闭缓存，纯 Python 标准库，3.7+ 即可。

---

## 二、上线（用 Git 仓库部署，因为在线后台需要 Git 作为后台）

> ⚠️ 在线编辑（Decap CMS）依赖 GitHub 作为内容后台，所以**必须用「连接 Git 仓库」的方式部署**，
> 不能用之前的「直接上传（Direct Upload）」。Cloudflare Pages **不支持把直接上传的项目改成连 Git**，
> 请**新建一个 Pages 项目并选「连接 Git 仓库」**，然后到新项目的 **Custom domains** 把 `1eafrin.icu` 绑过来
> （绑定时旧项目会自动让出域名），旧的直接上传项目可删。

### 方案 A：Cloudflare Pages + GitHub（推荐）
1. 把本项目推到 GitHub 仓库（见下方「推到 GitHub」）。
2. 登录 Cloudflare → **Workers & Pages** → **Create** → **Pages** → **连接 Git 仓库**。
3. 构建设置：**Build command 留空**，**Build output directory 填 `/`**。
4. 部署完得到 `xxx.pages.dev`，立即可访问；再去 **Custom domains** 绑你的域名。

### 方案 B：GitHub Pages
仓库设置 → **Pages** → 选 `main` 分支根目录 → 访问 `https://用户名.github.io/仓库名`。
（自定义域名在仓库根建 `CNAME` 文件写域名，再配 DNS。）

### 方案 C：Netlify / Vercel
导入 GitHub 仓库，Framework 选 `Other`，Output 默认根目录即可。

### 推到 GitHub
```bash
git add -A
git commit -m "更新"
git remote add origin https://github.com/你的用户名/你的仓库.git
git push -u origin main
```

---

## 三、绑定自己的域名（以 Cloudflare 为例）

1. Cloudflare Pages 项目 → **Custom domains** → 输入域名（如 `blog.example.com`）。
2. 按提示去域名 DNS 加一条 **CNAME**：名称 `blog`（或 `@`），目标 `你的项目.pages.dev`，代理橙色。
3. 几分钟自动签发免费 SSL，HTTPS 直接可用。

---

## 四、在线编辑（Decap CMS，核心功能）

部署到 GitHub 后，访问 `你的域名/admin`（或 `xxx.pages.dev/admin`）即可在浏览器里改内容，
保存 → 自动提交到 GitHub → Cloudflare 自动重新部署，全程不用手动上传。

后台分两块：
- **站点设置**：改站名、导航品牌名、首页简介、关于页内容。
- **文章**：增删改文章（标题/日期/摘要/标签/正文 Markdown），正文里可直接插图。

### 首次使用前要配两样东西（都在你自己的账号里操作）：

#### 1) 改 `admin/config.yml` 里的两处占位符
```yaml
backend:
  repo: 你的GitHub用户名/你的仓库名      # ← 改成真实仓库
  base_url: https://你的站点域名          # ← OAuth 接口走站点同域名（Worker 路由实现，见下）
```

> 💡 **为什么不用独立 Worker 的 `workers.dev` 域名**：Cloudflare 默认给 Worker 的 `xxx.workers.dev`
> 域名**在中国大陆被屏蔽**，国内浏览器打开会一直转圈最后 `ERR_CONNECTION_TIMED_OUT`，导致 Decap 登录不了。
> 本仓库的方案是：保留一个 Cloudflare Worker 做 OAuth 中转，但**用「路由(Route)」把它挂到站点自己的
> 域名 `你的站点域名/auth` 上**（而不是用 `workers.dev` 或另开子域名），既不会被墙，也不需要跨域。

> ⚠️ **两个容易踩的坑**（改配置时注意）：
> 1. Decap 的 collection **不支持顶层写 `file:`**。要么用 `files:`（单文件也这么写），要么用 `folder:` + `fields:`。
> 2. `list` 控件里，**单个**子项用 `field:`，**多个**子项用 `fields:`（复数）。写错会报 `must be object`。
>
> 想先验证配置对不对再部署？把 config.yml 丢到在线 JSON Schema 校验器，或本地起服务后打开
> `/admin` 看是否还报错——改完记得 **Ctrl+F5 强制刷新**。

#### 2) 配 GitHub 登录（OAuth）—— 用 Cloudflare Worker + 路由做中转

Decap 要拿你的 GitHub 令牌，需要一个 OAuth 接口做中转。本仓库用 **Cloudflare Worker**（代码 `worker/decap-oauth.js`）
实现，并通过**路由(Route)**把它挂到站点自己的域名 `你的站点域名/auth` 上（不用 `workers.dev`、不用另开子域名）。

**这套已经在线上配好了**（见下方「线上已就绪」），你通常只需确认 GitHub 那边回调地址对得上。

**线上已就绪（本仓库的 `decap-oauth` Worker）：**
- Worker 代码 `worker/decap-oauth.js` 已部署，`CLIENT_ID` / `CLIENT_SECRET` 两个机密已通过 Cloudflare 后台绑定（不在代码里）。
- 路由 `1eafrin.icu/auth → decap-oauth` 已建好：访问 `https://1eafrin.icu/auth` 会跳 GitHub 授权页，即代表正常。
- `config.yml` 的 `base_url: https://1eafrin.icu` + `auth_endpoint: /auth` 已配好，无需改动。
- 若以后要自己重部署 Worker，必须带上这两个机密绑定，否则登录失效。

> 🔧 **将来重做这一步（换账号/重装时）**：Cloudflare 后台 → **Workers 和 Pages** → 点进 `decap-oauth`
> → **Settings** → **Domains & Routes** → **Add** → 选 **Route** → Zone 选 `你的站点域名`、Path 填 `auth`；
> 再到 Worker 的 **Settings → Variables** 里把 `CLIENT_ID`/`CLIENT_SECRET` 设为 Secret。

**在 GitHub 建/改 OAuth App（Settings → Developer settings → OAuth Apps）：**
- Homepage URL：`https://1eafrin.icu`
- ⚠️ **Authorization callback URL 必须一字不差填**：`https://1eafrin.icu/auth`
  （这是最常见的登录失败原因：结尾不要多 `/`，必须是 `https`、域名完全一致）
- 创建后得到 Client ID 和 Client Secret —— 填进上面 Worker 的 Variables（机密）。

配置好后，打开 `/admin` → 用 GitHub 登录 → 开始编辑。

---

## 五、以后有服务器了 / 用 1Panel 怎么迁移

纯静态站点的终极优势：**原样复制，零改动**。

### 用 1Panel（最省心）
1. 1Panel → **网站** → **创建网站** → 类型选 **静态网站** → 填域名。
2. 进网站**根目录**，把本项目全部文件上传 / 复制进去。
3. 网站设置里 **一键申请 SSL** 并开启 **强制 HTTPS**。

### 用裸 nginx
放到 `/var/www/html/`，加配置：
```nginx
server {
    listen 80;
    server_name blog.example.com;
    root /var/www/html;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```
证书：`certbot --nginx -d blog.example.com`。

### 用 Apache
放到 `htdocs/` 或 DocumentRoot，默认读 `index.html`，无需额外配置。

> 注意：若迁移到自己的服务器，在线后台（Decap）仍依赖 GitHub，功能不变；
> 也可以不接后台，直接改 `content/*.json` 再部署。

---

## 六、换风格

所有配色在 `assets/style.css` 顶部 `:root` 变量：`--accent`（主题色）、`--bg`、`--text` 等，改几行即换肤。

---

## 七、安全收尾（重要）

本次搭建用到了两个高权限令牌（GitHub PAT、Cloudflare API Token），**用完后建议吊销**：

- **GitHub**：Settings → Developer settings → **Personal access tokens** → 删掉当时给的 PAT。
- **Cloudflare**：官网右上角头像 → **My Profile → API Tokens** → 删掉当时的 Token。

> 吊销令牌**不影响**线上运行：Worker 已部署、密钥已绑定、站点已上线，只是以后不能再拿这两个令牌改 Cloudflare/GitHub 配置。
> 日常改内容走 `/admin` 后台（用你自己的 GitHub 账号登录）即可，不需要这两个令牌。
