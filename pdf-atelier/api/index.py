"""Vercel shutdown adapter. Does not import the document engine."""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse


def route_from(path):
    parsed = urlparse(path)
    route = parse_qs(parsed.query).get('route', [''])[0].strip('/')
    if not route and parsed.path.startswith('/api/'):
        route = parsed.path[5:].strip('/')
    return '/api/' + (route or 'health')


class handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def send_json(self, status, value):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Connection', 'close')
        self.close_connection = True
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    def blocked(self):
        # No rfile reads: reject invalid, chunked and oversized bodies alike.
        self.send_json(403, {'error': 'Document processing disabled', 'mode': 'privacy-lockdown'})

    def do_GET(self):
        if route_from(self.path) == '/api/health':
            self.send_json(200, {'ok': True, 'mode': 'privacy-lockdown', 'documentProcessing': False})
        else:
            self.blocked()

    do_POST = blocked
    do_PUT = blocked
    do_PATCH = blocked
    do_DELETE = blocked
    do_OPTIONS = blocked
    do_HEAD = blocked
