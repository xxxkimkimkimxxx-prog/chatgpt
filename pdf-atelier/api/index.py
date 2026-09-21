"""Vercel Python Function adapter for the stateless PDF engine."""
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler
import json
import os
import shutil
import sys
import time
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from engine_cli import handle

MAX_REQUEST = 75 * 1024 * 1024
RATE_WINDOW = 60
RATE_LIMIT = 30
requests_by_ip = defaultdict(deque)


def route_from(path):
    parsed = urlparse(path)
    route = parse_qs(parsed.query).get('route', [''])[0].strip('/')
    if not route and parsed.path.startswith('/api/'):
        route = parsed.path[5:].strip('/')
    return '/api/' + (route or 'health')


def limited(ip):
    now = time.time()
    bucket = requests_by_ip[ip]
    while bucket and bucket[0] < now - RATE_WINDOW:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT:
        return True
    bucket.append(now)
    return False


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def send_json(self, status, value):
        data = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(data)

    def client_ip(self):
        return self.headers.get('x-forwarded-for', self.client_address[0]).split(',')[0].strip()

    def do_GET(self):
        route = route_from(self.path)
        if route == '/api/health':
            self.send_json(200, {'ok': True, 'browserOcr': True, 'serverOcr': bool(shutil.which('tesseract'))})
            return
        if route != '/api/sample':
            self.send_json(404, {'error': '未対応の操作です。'})
            return
        if limited(self.client_ip()):
            self.send_json(429, {'error': '操作回数が多いため、1分後に再試行してください。'})
            return
        try:
            self.send_json(200, handle(route, {}))
        except Exception:
            self.send_json(500, {'error': 'サンプル文書を生成できませんでした。'})

    def do_POST(self):
        route = route_from(self.path)
        if self.headers.get('x-atelier') != '1':
            self.send_json(403, {'error': '操作元を確認できません。'})
            return
        if limited(self.client_ip()):
            self.send_json(429, {'error': '操作回数が多いため、1分後に再試行してください。'})
            return
        try:
            size = int(self.headers.get('content-length', '0'))
        except ValueError:
            size = -1
        if size < 0 or size > MAX_REQUEST:
            self.send_json(413, {'error': '容量上限を超えました。'})
            return
        try:
            raw = self.rfile.read(size)
            body = json.loads(raw or b'{}')
            result = handle(route, body)
            self.send_json(200, result)
        except ValueError as exc:
            self.send_json(400, {'error': str(exc)})
        except Exception:
            self.send_json(400, {'error': 'PDFを処理できませんでした。ファイル形式と操作内容を確認してください。'})
