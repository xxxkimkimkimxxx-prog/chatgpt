"""JSON stdin/stdout adapter; fresh process per request, no network listener."""
import json
import sys
import contextlib
from engine import *


def handle(path, body):
    if path == '/api/health': return dict(ok=True, engine=fitz.VersionBind, browserOcr=True, serverOcr=bool(shutil.which('tesseract')))
    if path == '/api/sample': return dict(pdf=encode(sample()))
    if path == '/api/batch': return dict(data=encode(batch(body['files'],body['action'],body.get('args',{}))))
    data = decode(body['pdf']); args = body.get('args', {})
    if path == '/api/inspect':
        with open_pdf(data) as doc: return inspect_pdf(doc, int(args.get('page', 0)))
    if path == '/api/apply':
        out=apply(data, body['action'], args)
        return dict(pdf=encode(out), bytes=len(out))
    if path == '/api/export':
        out,ext=export(data,body['kind'],args)
        return dict(data=encode(out),ext=ext)
    if path == '/api/layout-report': return layout_report(data)
    if path == '/api/ocr-image':
        with open_pdf(data) as doc:
            index = int(args.get('page', 0))
            if not 0 <= index < len(doc): raise ValueError('ページ番号が範囲外です。')
            pg = doc[index]
            scale = min(200 / 72, 3000 / max(pg.rect.width, pg.rect.height))
            pix = pg.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            return dict(preview=encode(pix.tobytes('png')))
    if path == '/api/import': return dict(pdf=encode(import_file(data,body['kind'],args.get('password',''))))
    if path == '/api/compare': return dict(results=compare(data,decode(body['other'])))
    if path == '/api/compare-visual': return dict(results=compare_visual(data,decode(body['other'])))
    if path == '/api/sensitive': return dict(results=detect_sensitive(data))
    raise ValueError('未対応の操作です。')


if __name__=='__main__':
    try:
        request=json.loads(sys.stdin.read(MAX_BYTES*3+1))
        with contextlib.redirect_stdout(sys.stderr):
            result=handle(request['path'], request.get('body',{}))
        print(json.dumps(dict(status=200,body=result),ensure_ascii=False))
    except Exception as exc:
        print(json.dumps(dict(status=400,body=dict(error=str(exc))),ensure_ascii=False))
