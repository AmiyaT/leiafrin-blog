// Decap CMS 的 GitHub OAuth 中转 Worker（经典 service-worker 格式）
// 作用：让 Decap 后台能用你的 GitHub 账号登录（code -> token 交换）
// 部署后需要在 Cloudflare 后台给这个 Worker 设置两个环境变量（机密）：
//   CLIENT_ID    —— 来自 GitHub OAuth App
//   CLIENT_SECRET —— 来自 GitHub OAuth App
// 并确认已在 Cloudflare 后台设置过 workers.dev 子域名（一次性）。

addEventListener("fetch", function (event) {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const url = new URL(request.url);

  if (url.pathname !== "/auth") {
    return new Response("Decap OAuth Worker", { status: 200 });
  }

  const redirectUri = url.origin + "/auth";
  const code = url.searchParams.get("code");

  if (!code) {
    // 第一步：跳转 GitHub 授权页
    const gh =
      "https://github.com/login/oauth/authorize?client_id=" +
      CLIENT_ID +
      "&redirect_uri=" +
      encodeURIComponent(redirectUri) +
      "&scope=repo";
    return Response.redirect(gh, 302);
  }

  // 第二步：用授权码换取 access token
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

  return new Response(JSON.stringify({ token: t.access_token }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
