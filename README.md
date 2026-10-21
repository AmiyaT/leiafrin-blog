# 明月的小站 · 纯静态个人博客

一个**零依赖、零构建、零数据库**的纯静态个人博客。
既能托管在免费静态平台（无服务器），也能随时整包迁移到自己的服务器 / 1Panel（无需改动任何代码）。

```
.
├── index.html            # 首页（文章列表，由 JS 自动渲染）
├── about.html            # 关于页
├── assets/
│   ├── style.css         # 样式（改配色看 :root 变量）
│   ├── posts-data.js     # 文章列表数据（手写）
│   └── main.js           # 首页列表渲染
└── posts/
    ├── hello-world/      # 一篇文章 = 一个文件夹
    │   └── index.html
    └── why-static/
        └── index.html
```

---

## 一、本地预览

不需要装任何东西，在项目根目录执行：

```bash
# Python 自带，任选其一
python -m http.server 8080
# 然后浏览器打开 http://localhost:8080
```

> 注意：直接双击 `index.html` 用 `file://` 打开也能看，但部分浏览器会限制本地 JS，
> 用上面的本地服务器方式最稳妥。

---

## 二、上线（无服务器方案，任选一个）

### 方案 A：Cloudflare Pages（推荐，国内访问也快、自带免费 SSL）
1. 把本文件夹推到 GitHub（或 GitLab）。
2. 登录 Cloudflare → **Workers & Pages** → **Create** → **Pages** → 连接仓库。
3. 构建设置：**Build command 留空**，**Build output directory 填 `/`**（根目录）。
4. 部署完成后会得到一个 `xxx.pages.dev` 临时域名，可立即访问。

### 方案 B：GitHub Pages
1. 推到 GitHub 仓库，仓库设置 → **Pages** → 选 `main` 分支根目录。
2. 访问 `https://你的用户名.github.io/仓库名`。
3. 若用自定义域名，仓库里放一个 `CNAME` 文件，内容写你的域名（见第三节）。

### 方案 C：Netlify / Vercel
- Netlify：把文件夹拖到 https://app.netlify.com/drop 即可，秒上线。
- Vercel：导入仓库，Framework 选 `Other`，Output 默认根目录。

---

## 三、绑定你自己的域名（以 Cloudflare 为例）

前提：你的域名 DNS 解析在 Cloudflare（不在的话，去域名注册商把 NS 改成 Cloudflare 的）。

1. Cloudflare Pages 项目 → **Custom domains** → 输入你的域名，如 `blog.example.com`。
2. 按提示去域名 DNS 添加一条 **CNAME** 记录：
   - 名称：`blog`（或 `@` 代表根域名）
   - 目标：`你的项目.pages.dev`
   - 代理状态：Proxied（橙色云）
3. 等几分钟，Cloudflare 会自动签发免费 SSL 证书，HTTPS 直接能用。

> 若是 GitHub Pages 自定义域名：仓库根目录建 `CNAME` 文件，内容仅一行 `blog.example.com`，
> 再到域名 DNS 加 CNAME 指向 `你的用户名.github.io.`。

---

## 四、以后有服务器了 / 用 1Panel 怎么迁移

纯静态站点的终极优势：**原样复制，零改动**。

### 用 1Panel（最省心）
1. 1Panel → **网站** → **创建网站** → 类型选 **静态网站** → 填你的域名。
2. 进入该网站，找到**根目录**（通常是 `/opt/1panel/vhost/www/站点名/`）。
3. 把本项目的**全部文件**（含 `assets/`、`posts/` 等）上传 / 复制到根目录。
4. 在 1Panel 网站设置里 **一键申请 SSL 证书** 并开启 **强制 HTTPS**。
5. 域名 DNS 的 A 记录指向你的服务器 IP 即可。完事。

### 用裸 nginx（如果你自己配）
把文件夹放到 `/var/www/html/`，加一段配置：

```nginx
server {
    listen 80;
    server_name blog.example.com;
    root /var/www/html;
    index index.html;

    # 目录式干净链接：访问 /posts/hello-world/ 自动读 index.html
    location / {
        try_files $uri $uri/ =404;
    }
}
```

证书用 `certbot --nginx -d blog.example.com` 一行搞定。

### 用 Apache
放到 `htdocs/` 或虚拟主机 DocumentRoot，默认就会读目录里的 `index.html`，
`/posts/hello-world/` 这种链接原生可用，无需额外配置。

---

## 五、怎么写新文章

1. 复制 `posts/hello-world/` 文件夹，改个名字（用英文/拼音，如 `posts/my-post/`）。
2. 编辑里面的 `index.html`，改 `<title>`、日期、正文（照着已有结构写即可）。
3. 打开 `assets/posts-data.js`，在数组最前面加一条：

```js
{
  title: "文章标题",
  date: "2026-11-01",
  excerpt: "一句话摘要，会显示在首页卡片上。",
  url: "posts/my-post/",
  tags: ["标签"]
}
```

刷新首页，新文章就出现了。

---

## 六、换风格

所有配色集中在 `assets/style.css` 顶部的 `:root` 变量里：
`--accent`（主题色）、`--bg`（背景）、`--text`（文字）等，改几行就能换肤。
