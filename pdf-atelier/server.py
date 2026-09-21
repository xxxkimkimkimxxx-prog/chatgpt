"""Production HTTP server for PDF Atelier (API and built frontend)."""
from collections import defaultdict, deque
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from pathlib import Path
import shutil
import time
from urllib.parse import urlparse

from engine_cli import handle


ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "dist" / "client"
MAX_REQUEST = 75 * 1024 * 1024
RATE_WINDOW = 60
RATE_LIMIT = 30
requests_by_ip = defaultdict(deque)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def log_message(self, _format, *_args):
        return

    def client_ip(self):
        return self.headers.get("x-forwarded-for", self.client_address[0]).split(",")[0].strip()

    def limited(self):
        now = time.time()
        bucket = requests_by_ip[self.client_ip()]
        while bucket and bucket[0] < now - RATE_WINDOW:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT:
            return True
        bucket.append(now)
        return False

    def send_json(self, status, value):
        payload = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json(200, {"ok": True, "browserOcr": True, "serverOcr": bool(shutil.which("tesseract"))})
            return
        if path == "/api/sample":
            if self.limited():
                self.send_json(429, {"error": "操作回数が多いため、1分後に再試行してください。"})
                return
            try:
                self.send_json(200, handle(path, {}))
            except Exception:
                self.send_json(500, {"error": "サンプル文書を生成できませんでした。"})
            return
        if path.startswith("/api/"):
            self.send_json(404, {"error": "未対応の操作です。"})
            return
        target = STATIC / path.lstrip("/")
        if path != "/" and target.exists() and target.is_file():
            super().do_GET()
            return
        self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            self.send_json(404, {"error": "未対応の操作です。"})
            return
        if self.headers.get("x-atelier") != "1":
            self.send_json(403, {"error": "操作元を確認できません。"})
            return
        if self.limited():
            self.send_json(429, {"error": "操作回数が多いため、1分後に再試行してください。"})
            return
        try:
            size = int(self.headers.get("content-length", "0"))
        except ValueError:
            size = -1
        if size < 0 or size > MAX_REQUEST:
            self.send_json(413, {"error": "容量上限を超えました。"})
            return
        try:
            body = json.loads(self.rfile.read(size) or b"{}")
            self.send_json(200, handle(path, body))
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
        except Exception:
            self.send_json(400, {"error": "PDFを処理できませんでした。ファイル形式と操作内容を確認してください。"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "4174"))
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
