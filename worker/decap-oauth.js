// =============================================================================
// Decap CMS —— GitHub OAuth 中转（Cloudflare Worker）
// -----------------------------------------------------------------------------
// 路由：挂载到自有域名的 /auth（通过 Cloudflare Worker 的「路由 Route」实现，
//       pattern 必须是 你的域名/auth* —— 带不带查询参数都要能匹配上！）
//
// 为什么必须返回「网页」而不是裸 JSON：
//   Decap 用的是 Netlify Auth 协议。登录时后台会开一个弹窗，弹窗最终要通过
//   window.postMessage 把令牌交回后台窗口，协议是：
//     1) 弹窗 → 后台： "authorizing:github"                    （握手：我准备好了）
//     2) 后台 → 弹窗： "authorizing:github"                    （后台确认收到）
//     3) 弹窗 → 后台： "authorization:github:success:{...}"    （交出令牌）
//     4) 后台自动关闭弹窗并登录
//   如果只返回裸 JSON，弹窗不会发 postMessage，后台永远收不到令牌。
//
// 必须配置两个机密（Settings → Variables and Secrets，类型选 Secret）：
//   CLIENT_ID / CLIENT_SECRET   —— 来自 GitHub OAuth App
//
// 注意：部署时不要设置较新的 compatibility_date，否则 Cloudflare 会要求 ES module 格式；
//       本文件用经典 service-worker 格式，部署时保持 metadata 不含 compatibility_date。
// =============================================================================

addEventListener("fetch", function (event) {
  event.respondWith(handle(event.request));
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function handle(request) {
  const url = new URL(request.url);
  const ORIGIN = url.origin;

  // 非 /auth 路径：返回一句话，方便自查服务是否存活
  if (url.pathname !== "/auth") {
    return new Response("Decap OAuth Worker is running.\n", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS },
    });
  }

  const redirectUri = ORIGIN + "/auth";
  const code = url.searchParams.get("code");

  // ---------- 第一步：还没有授权码 → 跳转 GitHub 授权页 ----------
  if (!code) {
    if (typeof CLIENT_ID === "undefined") {
      return new Response(
        "OAuth 未配置：缺少 CLIENT_ID。请在 Worker 的 Settings → Variables and Secrets 中添加。",
        { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
    const gh =
      "https://github.com/login/oauth/authorize?client_id=" +
      CLIENT_ID +
      "&redirect_uri=" +
      encodeURIComponent(redirectUri) +
      "&scope=repo";
    return Response.redirect(gh, 302);
  }

  // ---------- 第二步：用授权码换 access token ----------
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    }),
  });
  const t = await r.json();

  // 换令牌失败：把原因如实显示出来，方便排查
  if (t.error) {
    return new Response(
      page(ORIGIN, null, t.error + "：" + (t.error_description || "") +
        "。请检查 GitHub OAuth App 的回调地址是否与 " + redirectUri + " 完全一致。"),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8", ...CORS } }
    );
  }

  // ---------- 第三步：返回网页，用 postMessage 把令牌交给后台窗口 ----------
  return new Response(page(ORIGIN, t.access_token), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...CORS },
  });
}

// 生成符合 Netlify Auth 协议的交接页面
function page(origin, token, errorMsg) {
  const payload = JSON.stringify({
    origin: origin,
    token: token === null ? null : token,
    error: errorMsg || null,
  });
  // 用 type=application/json 传参，避免任何字符串转义问题
  const dataUrl = "data:application/json;charset=utf-8," + encodeURIComponent(payload);

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>登录中…</title>
<style>
  body{font:15px/1.7 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
       margin:0;display:flex;align-items:center;justify-content:center;height:100vh;
       background:#0f1115;color:#e6e6e6}
  .box{text-align:center;padding:2rem}
  .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#4c8dff;
       animation:p 1s infinite ease-in-out}
  .dot:nth-child(2){animation-delay:.15s}.dot:nth-child(3){animation-delay:.3s}
  @keyframes p{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
  .err{color:#ff8080;max-width:34em;text-align:left;background:#1a1414;
       border:1px solid #4a2626;padding:1rem;border-radius:8px;white-space:pre-wrap}
</style>
</head>
<body>
<div class="box" id="box"><div><span class="dot"></span> <span class="dot"></span> <span class="dot"></span></div>
<p>正在完成登录，请稍候…</p></div>
<script>
(function () {
  var PROVIDER = "github";
  fetch(${JSON.stringify(dataUrl)})
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      var box = document.getElementById("box");

      function send(msg) {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(msg, cfg.origin);
        }
      }

      if (cfg.error) {
        box.innerHTML = '<div class="err"><b>登录失败</b><br>' + cfg.error + '</div>';
        return;
      }

      // 协议第 1 步：先向后台窗口发起握手
      send("authorizing:" + PROVIDER);

      // 协议第 2/3 步：收到后台确认后，交出令牌
      window.addEventListener("message", function (e) {
        if (e.data === "authorizing:" + PROVIDER) {
          send("authorization:" + PROVIDER + ":success:" +
               JSON.stringify({ token: cfg.token }));
          setTimeout(function () { window.close(); }, 1000);
        }
      });

      // 若没有 opener（例如把回调地址直接粘到浏览器打开），给个说明
      setTimeout(function () {
        if (!window.opener || window.opener.closed) {
          box.innerHTML = '<p>此窗口需要由 Decap 后台打开才能完成登录。<br>' +
                          '请回到 <b>/admin</b> 页面重新点击「使用 GitHub 登录」。</p>';
        }
      }, 2500);
    })
    .catch(function (e) {
      document.getElementById("box").innerHTML =
        '<div class="err">页面脚本出错：' + e + '</div>';
    });
})();
</script>
</body>
</html>`;
}