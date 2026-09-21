"""Protective static release: no document engine or request-body processing."""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from pathlib import Path
from urllib.parse import urlparse

STATIC = Path(__file__).resolve().parent / "dist" / "client"
CSP = "default-src 'none'; script-src 'none'; connect-src 'none'; style-src 'self'; img-src 'none'; font-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"


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
        # Never read the body, parse PDF data, or import the old engine.
        self.send_json(403, {"error": "Document processing disabled", "mode": "privacy-lockdown"})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json(200, {"ok": True, "mode": "privacy-lockdown", "documentProcessing": False})
        elif path in ("/", "/index.html", "/privacy.css"):
            self.path = "/index.html" if path == "/" else path
            super().do_GET()
        else:
            self.blocked()

    def do_HEAD(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html", "/privacy.css"):
            self.path = "/index.html" if path == "/" else path
            super().do_HEAD()
        else:
            self.blocked()

    do_POST = blocked
    do_PUT = blocked
    do_PATCH = blocked
    do_DELETE = blocked
    do_OPTIONS = blocked


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", int(os.environ.get("PORT", "4174"))), Handler).serve_forever()
