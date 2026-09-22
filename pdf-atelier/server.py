"""Static host for the browser-local editor. API requests are always rejected."""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

STATIC = Path(__file__).resolve().parent / "dist" / "client"
CSP = "default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def log_message(self, *_args):
        pass

    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers_called = True
        super().end_headers()

    def send_json(self, status, value):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Connection", "close")
        self.close_connection = True
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def blocked(self):
        # Never read request bodies; browser-local builds have no document API.
        self.send_json(403, {"error": "Document processing disabled", "mode": "browser-local"})

    def static_request(self, head=False):
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            self.blocked()
            return
        relative = unquote(path).lstrip("/")
        target = (STATIC / relative).resolve()
        if path != "/" and target.is_relative_to(STATIC.resolve()) and target.is_file():
            super().do_HEAD() if head else super().do_GET()
            return
        if "." in Path(relative).name:
            self.send_error(404)
            return
        self.path = "/index.html"
        super().do_HEAD() if head else super().do_GET()

    def do_GET(self):
        self.static_request()

    def do_HEAD(self):
        self.static_request(head=True)

    do_POST = blocked
    do_PUT = blocked
    do_PATCH = blocked
    do_DELETE = blocked
    do_OPTIONS = blocked


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", int(os.environ.get("PORT", "4174"))), Handler).serve_forever()
