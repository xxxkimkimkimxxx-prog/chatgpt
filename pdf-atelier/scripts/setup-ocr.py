"""Install downloaded npm language resources locally; never downloads itself."""
import gzip
from pathlib import Path
import shutil
root = Path(__file__).resolve().parent.parent
out = root / 'tessdata'
out.mkdir(exist_ok=True)
for lang in ('jpn', 'jpn_vert'):
    source = root / f'node_modules/@tesseract.js-data/{lang}/4.0.0/{lang}.traineddata.gz'
    with gzip.open(source, 'rb') as src, open(out / f'{lang}.traineddata', 'wb') as dst:
        shutil.copyfileobj(src, dst)
for lang in ('eng', 'osd'):
    source = Path('/usr/share/tesseract-ocr/5/tessdata') / f'{lang}.traineddata'
    if source.exists(): shutil.copy2(source, out / source.name)
pdf_font = Path('/usr/share/tesseract-ocr/5/tessdata/pdf.ttf')
if pdf_font.exists(): shutil.copy2(pdf_font, out / 'pdf.ttf')
print('OCR language data prepared.')
