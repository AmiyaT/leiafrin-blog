import os, json, re, subprocess, urllib.request

GH = os.environ.get("GH")
API = "https://api.github.com"
REPO = "leiafrin-blog"

def api(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("Authorization", "Bearer " + GH)
    req.add_header("Accept", "application/vnd.github+json")
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

st, me = api("GET", "/user")
print("GitHub 用户:", st, me.get("login"))
login = me["login"]

st, res = api("POST", "/user/repos", {"name": REPO, "private": False, "auto_init": False})
print("创建仓库:", st, res.get("full_name") or res.get("errors"))

cfg = "admin/config.yml"
s = open(cfg, encoding="utf-8").read()
s = re.sub(r"repo: YOUR_GITHUB_USER/YOUR_REPO", "repo: %s/%s" % (login, REPO), s)
open(cfg, "w", encoding="utf-8").write(s)
print("config.yml repo 已填入:", login + "/" + REPO)

def sh(cmd):
    print("$ " + cmd)
    subprocess.run(cmd, shell=True, check=True, cwd=os.getcwd())

sh("git add -A")
sh('git commit -q -m "填入 GitHub 仓库名"')
sh("git remote remove origin 2>/dev/null || true")
sh("git remote add origin https://%s@github.com/%s/%s.git" % (GH, login, REPO))
sh("git push -u origin main")
# 推送后移除 remote 里的令牌，避免明文残留
sh("git remote set-url origin https://github.com/%s/%s.git" % (login, REPO))
print("DONE: https://github.com/%s/%s" % (login, REPO))
