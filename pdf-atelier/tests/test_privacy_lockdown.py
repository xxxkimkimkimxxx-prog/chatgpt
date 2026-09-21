import importlib.util
import io
import json
from pathlib import Path
import unittest
import threading
from http.client import HTTPConnection
from http.server import HTTPServer
from unittest.mock import Mock
from html.parser import HTMLParser

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
    def test_real_http_adapters(self):
        for module, name in [(load('render_http', 'server.py'), 'Handler'), (load('vercel_http', 'api/index.py'), 'handler')]:
            server = HTTPServer(('127.0.0.1', 0), getattr(module, name))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                for method, path in [('POST', '/api/inspect'), ('POST', '/api/export'), ('GET', '/api/sample'), ('PUT', '/api/apply')]:
                    conn = HTTPConnection('127.0.0.1', server.server_port, timeout=3)
                    # Declare a body but deliberately never transmit one: handler must reply immediately.
                    conn.putrequest(method, path)
                    conn.putheader('Content-Length', '1000000')
                    conn.putheader('X-Atelier', '1')
                    conn.endheaders()
                    response = conn.getresponse()
                    self.assertEqual(response.status, 403)
                    self.assertEqual(json.loads(response.read())['mode'], 'privacy-lockdown')
                    conn.close()
                if name == 'Handler':
                    conn = HTTPConnection('127.0.0.1', server.server_port, timeout=3)
                    conn.request('GET', '/')
                    response = conn.getresponse()
                    self.assertEqual(response.status, 200)
                    self.assertIn("connect-src 'none'", response.getheader('Content-Security-Policy'))
                    self.assertNotIn(b'<script', response.read())
                    conn.close()
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=3)

    def test_static_page_cannot_ingest_documents_or_run_code(self):
        tags = Markup((ROOT / 'index.html').read_text()).tags
        self.assertFalse({'script', 'input', 'form', 'iframe', 'object', 'embed', 'textarea'} & {t for t, _ in tags})
        policy = next(a['content'] for t, a in tags if t == 'meta' and a.get('http-equiv') == 'Content-Security-Policy')
        for rule in ["connect-src 'none'", "script-src 'none'", "form-action 'none'", "worker-src 'none'"]:
            self.assertIn(rule, policy)
        for _, attrs in tags:
            self.assertFalse(any(k.startswith('on') for k in attrs))
            for key in ['href', 'src']:
                if key in attrs:
                    self.assertEqual(attrs[key], '/privacy.css')

    def test_every_mutation_rejected_before_body_read(self):
        for module, name in [(load('shutdown_server', 'server.py'), 'Handler'), (load('shutdown_api', 'api/index.py'), 'handler')]:
            self.assertFalse(hasattr(module, 'handle'))
            for method in ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']:
                for path in ['/api/inspect', '/api/apply', '/api/export', '/api/ocr', '/api/download', '/']:
                    with self.subTest(adapter=name, method=method, path=path):
                        h = object.__new__(getattr(module, name))
                        h.command, h.path = method, path
                        h.headers = {'Content-Length': '999999999', 'X-Atelier': '1'}
                        h.rfile = Mock()
                        h.rfile.read.side_effect = AssertionError('MUST NOT READ BODY')
                        h.send_json = Mock()
                        getattr(h, 'do_' + method)()
                        self.assertEqual(h.send_json.call_args.args[0], 403)
                        h.rfile.read.assert_not_called()

    def test_render_denies_old_assets_and_directory_listing(self):
        cls = load('static_shutdown', 'server.py').Handler
        for path in ['/assets/old.js', '/api/file/token', '/tessdata/jpn.traineddata.gz', '/../../engine.py', '/api/sample']:
            h = object.__new__(cls)
            h.path = path
            h.send_json = Mock()
            h.do_GET()
            self.assertEqual(h.send_json.call_args.args[0], 403)

    def test_api_response_contains_no_document_data(self):
        for module, name in [(load('render_json', 'server.py'), 'Handler'), (load('vercel_json', 'api/index.py'), 'handler')]:
            h = object.__new__(getattr(module, name))
            h.command = 'POST'
            h.send_response, h.send_header, h.end_headers = Mock(), Mock(), Mock()
            h.wfile = io.BytesIO()
            h.blocked()
            self.assertEqual(json.loads(h.wfile.getvalue())['mode'], 'privacy-lockdown')
            self.assertTrue(h.close_connection)

    def test_container_excludes_engine(self):
        docker = (ROOT / 'Dockerfile').read_text()
        self.assertNotIn('engine', '\n'.join(l for l in docker.splitlines() if not l.startswith('#')))
        self.assertNotIn('COPY . .', docker)


if __name__ == '__main__':
    unittest.main()
