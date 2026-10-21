// ===========================================================
// Decap CMS —— GitHub OAuth 中转（Cloudflare Pages Functions 版）
// ---------------------------------------------------------------
// 路由：/auth        （functions/auth.js 会自动对应到 /auth）
// 作用：让 Decap 后台能用你的 GitHub 账号登录（授权码 -> 令牌交换）
//
// 相比独立 Worker 的好处：跑在站点自己的域名 1eafrin.icu 上，
// 不依赖 *.workers.dev（该域名在中国大陆被屏蔽，会导致登录超时）。
//
// ⚠️ 必做：在 Cloudflare Pages 项目里配置两个【加密】环境变量
//      Settings → Environment variables → Add
//        CLIENT_ID      —— GitHub OAuth App 的 Client ID
//        CLIENT_SECRET  —— GitHub OAuth App 的 Client Secret
//    填完必须重新部署一次（重新部署按钮在 Deployments 页面）。
// ===========================================================

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 只处理 /auth，其他路径直接返回，方便自查服务是否存活
  if (url.pathname !== "/auth") {
    return new Response("Decap OAuth Function (Pages) is running.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 自查端点：访问 /auth?debug=1 可确认环境变量有没有配好（不会泄露密钥内容）
  if (url.searchParams.get("debug") === "1") {
    return new Response(
      JSON.stringify(
        {
          ok: true,
          client_id: env.CLIENT_ID ? "已配置" : "缺失",
          client_secret: env.CLIENT_SECRET ? "已配置" : "缺失",
          redirect_uri: url.origin + "/auth",
          hint: "两项都显示「已配置」才可正常登录",
        },
        null,
        2
      ),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const redirectUri = url.origin + "/auth";
  const code = url.searchParams.get("code");

  // ---------- 第一步：还没有授权码 -> 跳转 GitHub 授权页 ----------
  if (!code) {
    if (!env.CLIENT_ID) {
      return new Response(
        "OAuth 未配置：请在 Cloudflare Pages 项目的 Settings → Environment variables 中添加 CLIENT_ID 和 CLIENT_SECRET，然后重新部署。",
        { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
    const gh =
      "https://github.com/login/oauth/authorize?client_id=" +
      env.CLIENT_ID +
      "&redirect_uri=" +
      encodeURIComponent(redirectUri) +
      "&scope=repo";
    return Response.redirect(gh, 302);
  }

  // ---------- 第二步：拿到授权码 -> 换取 access token ----------
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    }),
  });
  const t = await r.json();

  if (t.error) {
    return new Response(
      "GitHub 返回错误：" + t.error + "（" + (t.error_description || "") + "）" +
        "；请检查 GitHub OAuth App 的回调地址是否与 " + redirectUri + " 完全一致。",
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  return new Response(JSON.stringify({ token: t.access_token }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}