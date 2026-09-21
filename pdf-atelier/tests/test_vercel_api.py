import importlib.util
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('vercel_api',ROOT/'api/index.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class VercelAdapterTests(unittest.TestCase):
    def test_rewrite_route(self):
        self.assertEqual(module.route_from('/api/index?route=sample'),'/api/sample')
        self.assertEqual(module.route_from('/api/index?route=compare-visual'),'/api/compare-visual')

    def test_direct_route(self):
        self.assertEqual(module.route_from('/api/sample'),'/api/sample')
        self.assertEqual(module.route_from('/api/health'),'/api/health')

    def test_no_document_engine(self):
        self.assertFalse(hasattr(module, 'handle'))

if __name__=='__main__':unittest.main(verbosity=2)
