import importlib.util
import io
import json
from pathlib import Path
import threading
from http.client import HTTPConnection
from http.server import HTTPServer
from html.parser import HTMLParser
from unittest.mock import Mock
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Markup(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class PrivacyTests(unittest.TestCase):
    def test_entrypoint_is_local_and_csp_blocks_external_origins(self):
        tags = Markup((ROOT / 'index.html').read_text()).tags
        scripts = [a for t, a in tags if t == 'script']
        self.assertEqual(scripts, [{'type': 'module', 'src': '/src/main.jsx'}])
        policy = next(a['content'] for t, a in tags if t == 'meta' and a.get('http-equiv') == 'Content-Security-Policy')
        for rule in ["default-src 'self'", "script-src 'self'", "connect-src 'self'", "object-src 'none'", "form-action 'none'"]:
            self.assertIn(rule, policy)
        self.assertNotIn('http:', policy)
        self.assertNotIn('https:', policy)
        entry = (ROOT / 'src/main.jsx').read_text()
        self.assertIn('LocalApp', entry)
        self.assertNotIn('from "./App.jsx"', entry)

    def test_every_mutation_is_rejected_before_body_read(self):
        for module, name in [(load('render_server', 'server.py'), 'Handler'), (load('vercel_api', 'api/index.py'), 'handler')]:
            self.assertFalse(hasattr(module, 'handle'))
            for method in ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']:
                h = object.__new__(getattr(module, name))
                h.command, h.path = method, '/api/apply'
                h.rfile = Mock()
                h.rfile.read.side_effect = AssertionError('MUST NOT READ BODY')
                h.send_json = Mock()
                getattr(h, 'do_' + method)()
                self.assertEqual(h.send_json.call_args.args[0], 403)
                h.rfile.read.assert_not_called()

    def test_real_http_servers_reject_declared_document_body_immediately(self):
        for module, name, mode in [(load('render_http', 'server.py'), 'Handler', 'browser-local'), (load('vercel_http', 'api/index.py'), 'handler', 'privacy-lockdown')]:
            server = HTTPServer(('127.0.0.1', 0), getattr(module, name))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                conn = HTTPConnection('127.0.0.1', server.server_port, timeout=3)
                conn.putrequest('POST', '/api/inspect')
                conn.putheader('Content-Length', '1000000')
                conn.endheaders()
                response = conn.getresponse()
                self.assertEqual(response.status, 403)
                self.assertEqual(json.loads(response.read())['mode'], mode)
                conn.close()
            finally:
                server.shutdown(); server.server_close(); thread.join(timeout=3)

    def test_render_serves_app_but_not_api(self):
        module = load('render_static', 'server.py')
        server = HTTPServer(('127.0.0.1', 0), module.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            conn = HTTPConnection('127.0.0.1', server.server_port, timeout=3)
            conn.request('GET', '/')
            response = conn.getresponse()
            self.assertEqual(response.status, 200)
            self.assertIn("connect-src 'self'", response.getheader('Content-Security-Policy'))
            self.assertIn(b'<script type="module"', response.read())
            conn.close()
            conn = HTTPConnection('127.0.0.1', server.server_port, timeout=3)
            conn.request('GET', '/api/sample')
            response = conn.getresponse()
            self.assertEqual(response.status, 403)
            conn.close()
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=3)

    def test_api_response_contains_no_document_data(self):
        for module, name in [(load('render_json', 'server.py'), 'Handler'), (load('vercel_json', 'api/index.py'), 'handler')]:
            h = object.__new__(getattr(module, name))
            h.command = 'POST'
            h.send_response, h.send_header, h.end_headers = Mock(), Mock(), Mock()
            h.wfile = io.BytesIO()
            h.blocked()
            self.assertNotIn('pdf', h.wfile.getvalue().decode().lower())
            self.assertTrue(h.close_connection)

    def test_container_excludes_python_document_engine(self):
        docker = (ROOT / 'Dockerfile').read_text()
        active = '\n'.join(line for line in docker.splitlines() if not line.startswith('#'))
        self.assertNotIn('engine.py', active)
        self.assertNotIn('engine_cli.py', active)
        self.assertNotIn('COPY . .', active)


if __name__ == '__main__':
    unittest.main()
