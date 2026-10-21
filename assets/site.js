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

function md(text) {
  if (window.marked && window.marked.parse) return window.marked.parse(text || "");
  return "<pre>" + (text || "") + "</pre>";
}

function esc(s) {
  return String(s == null ? "" : s);
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
  list.innerHTML = posts.map(function (p) {
    const tags = (p.tags || []).map(function (t) {
      return '<span class="tag">' + esc(t) + "</span>";
    }).join("");
    return '<a class="post-card" href="post.html?p=' + encodeURIComponent(p.slug) + '">' +
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
  const p = posts.find(function (x) { return x.slug === slug; });
  const el = document.getElementById("post");
  if (!p) {
    el.innerHTML = '<p>文章不存在或已被删除。</p><a class="back-link" href="index.html">← 返回首页</a>';
    return;
  }
  document.title = p.title;
  const tags = (p.tags || []).join(" ");
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
