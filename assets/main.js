/* ===========================================================
   首页文章列表渲染（纯前端，无后端）
   =========================================================== */
(function () {
  var list = document.getElementById("post-list");
  if (!list || !window.POSTS) return;

  // 按日期从新到旧排序
  var posts = window.POSTS.slice().sort(function (a, b) {
    return a.date < b.date ? 1 : -1;
  });

  var html = "";
  posts.forEach(function (p) {
    var tags = (p.tags || [])
      .map(function (t) {
        return '<span class="tag">' + t + "</span>";
      })
      .join("");

    html +=
      '<a class="post-card" href="' + p.url + '">' +
      "<h2>" + p.title + tags + "</h2>" +
      '<div class="meta">' + p.date + "</div>" +
      '<p class="excerpt">' + p.excerpt + "</p>" +
      "</a>";
  });

  list.innerHTML = html;
})();
