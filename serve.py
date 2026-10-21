#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
个人博客 · 本地启动脚本（跨平台，无需任何第三方依赖）

用法：
    python serve.py            # 默认 8080 端口
    python serve.py 9000       # 自定义端口

特点：
    - 绑定 0.0.0.0，手机/其他设备连同一 WiFi 也能访问（方便真机预览）
    - 自动打开默认浏览器
    - 关闭缓存，改完文章刷新即见效
    - 纯标准库实现，Python 3.7+ 即可
"""

import http.server
import socketserver
import webbrowser
import socket
import os
import sys

# 站点根目录 = 本脚本所在目录
ROOT = os.path.dirname(os.path.abspath(__file__))

# 端口：命令行参数 > 默认
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # 关缓存，改完刷新就能看到
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 简化日志，不打每请求一行
        pass


def get_lan_ip():
    """获取局域网 IP，方便手机等设备访问。"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main():
    os.chdir(ROOT)
    lan = get_lan_ip()

    # ThreadingHTTPServer 支持并发，预览更顺
    with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
        print("=" * 52)
        print("  明月的小站 · 本地预览已启动")
        print("  本机访问 : http://localhost:%d" % PORT)
        print("  局域网   : http://%s:%d  (同 WiFi 手机/其他设备可访问)" % (lan, PORT))
        print("  按 Ctrl+C 停止")
        print("=" * 52)

        # 自动开浏览器（失败也不影响服务）
        try:
            webbrowser.open("http://localhost:%d" % PORT)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止。bye~")


if __name__ == "__main__":
    main()
