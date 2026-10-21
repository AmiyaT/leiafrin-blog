/* ===========================================================
   站点渲染（纯前端，读取 content/*.json 自动生成页面）
   依赖：marked（Markdown 解析，由页面 <script> 引入）
   =========================================================== */

async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("加载失败: " + url);
  return r.json();
}

async function getSite() {
  try { return await loadJSON("content/site.json"); }
  catch (e) { return { title: "我的博客", brand: "我的博客", intro: "" }; }
}

async function getPosts() {
  try {
    const d = await loadJSON("content/posts.json");
    return d.posts || [];
  } catch (e) { return []; }
}

/* 标签兼容：后台保存后可能是 "随笔" 或 { tag: "随笔" }，统一成字符串数组 */
function normTags(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(function (t) {
    if (typeof t === "string") return t;
    if (t && typeof t === "object") return String(t.tag || t.name || t.title || "");
    return String(t == null ? "" : t);
  }).filter(Boolean);
}

function md(text) {
  if (window.marked && window.marked.parse) return window.marked.parse(text || "");
  return "<pre>" + (text || "") + "</pre>";
}

function esc(s) {
  return String(s == null ? "" : s);
}

/* 链接名兜底：后台若没填 slug，这里现算一个，保证文章链接永远打得开。
   注意：渲染首页和文章页必须用同一个函数算，结果要一致。 */
function resolveSlug(p, i) {
  var s = String((p && p.slug) || "").trim();
  if (s) return s;
  var t = String((p && p.title) || "").trim();
  if (t) return "post-" + (i + 1) + "-" + t;
  return "post-" + (i + 1);
}

async function applySite() {
  const s = await getSite();
  document.querySelectorAll("[data-site-brand]").forEach(function (e) {
    e.textContent = s.brand || s.title || "我的博客";
  });
  const intro = document.querySelector("[data-site-intro]");
  if (intro) intro.textContent = s.intro || "";
  if (s.title) document.title = s.title + " · 个人博客";
}

async function renderHome() {
  await applySite();
  const list = document.getElementById("post-list");
  if (!list) return;
  const posts = (await getPosts()).slice().sort(function (a, b) {
    return a.date < b.date ? 1 : -1;
  });
  if (!posts.length) {
    list.innerHTML = '<p style="color:var(--text-faint)">还没有文章，去后台写第一篇吧。</p>';
    return;
  }
  list.innerHTML = posts.map(function (p, i) {
    const tags = normTags(p.tags).map(function (t) {
      return '<span class="tag">' + esc(t) + "</span>";
    }).join("");
    return '<a class="post-card" href="post.html?p=' +
      encodeURIComponent(resolveSlug(p, i)) + '">' +
      "<h2>" + esc(p.title) + tags + "</h2>" +
      '<div class="meta">' + esc(p.date) + "</div>" +
      '<p class="excerpt">' + esc(p.excerpt) + "</p>" +
      "</a>";
  }).join("");
}

async function renderPost() {
  await applySite();
  const slug = new URLSearchParams(location.search).get("p");
  const posts = await getPosts();
  // 用与首页相同的规则定位文章，slug 缺失时也不会 404
  const found = posts.findIndex(function (x, i) { return resolveSlug(x, i) === slug; });
  const p = found >= 0 ? posts[found] : null;
  const el = document.getElementById("post");
  if (!p) {
    el.innerHTML = '<p>文章不存在或已被删除。</p><a class="back-link" href="index.html">← 返回首页</a>';
    return;
  }
  document.title = p.title;
  const tags = normTags(p.tags).join(" ");
  el.innerHTML =
    '<header class="post-header"><h1>' + esc(p.title) + "</h1>" +
    '<div class="meta">' + esc(p.date) + (tags ? " · " + esc(tags) : "") + "</div></header>" +
    '<div class="post-body">' + md(p.body) + "</div>" +
    '<a class="back-link" href="index.html">← 返回首页</a>';
}

async function renderAbout() {
  await applySite();
  const s = await getSite();
  const el = document.getElementById("about-body");
  if (el && s.about) el.innerHTML = md(s.about);
}
