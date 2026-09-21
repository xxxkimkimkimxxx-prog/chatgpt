import unittest
import io
import sys
import zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from engine import *
from engine_cli import handle

class AdvancedTests(unittest.TestCase):
    def test_sensitive(self):
        d=fitz.open();p=d.new_page();p.insert_text((20,40),'hello@example.test 03-1234-5678 123-4567')
        results=detect_sensitive(serial(d))
        self.assertEqual({r['kind'] for r in results},{'メール','電話番号候補','郵便番号候補'})

    def test_visual_identical(self):
        d=sample();r=compare_visual(d,d)
        self.assertEqual([x['percent'] for x in r],[0,0,0])

    def test_visual_nontext_difference(self):
        d=sample();other=apply(d,'rectangle',{'rect':[20,20,100,100]})
        self.assertEqual(compare(d,other)[0]['diff'],'')
        self.assertGreater(compare_visual(d,other)[0]['percent'],0)

    def test_batch(self):
        d=encode(sample());out=batch([{'pdf':d,'name':'a'},{'pdf':d,'name':'../b'}],'rotate',{'degrees':90})
        z=zipfile.ZipFile(io.BytesIO(out));self.assertEqual(len(z.namelist()),2)
        for name in z.namelist():
            self.assertNotIn('/',name)
            with open_pdf(z.read(name)) as pdf:self.assertEqual([p.rotation for p in pdf],[90]*3)

    def test_batch_failure(self):
        with self.assertRaises(Exception):batch([{'pdf':encode(sample())},{'pdf':'bad'}],'compress',{})

    def test_skew(self):
        from PIL import Image, ImageDraw
        im=Image.new('RGB',(700,900),'white');draw=ImageDraw.Draw(im)
        for y in range(100,800,30):
            for x in range(60,600,20):draw.rectangle((x,y,x+12,y+9),fill='black')
        rotated=im.rotate(3,fillcolor='white')
        self.assertAlmostEqual(estimate_skew(rotated),-3,delta=.4)

    def test_blank_skew(self):
        from PIL import Image
        self.assertEqual(estimate_skew(Image.new('RGB',(100,100),'white')),0)

    def test_auto_deskew(self):
        out=apply(sample(),'deskew-auto',{})
        self.assertTrue(open_pdf(out)[0].get_images())

    def test_a4_keeps_form_appearance(self):
        d=apply(sample(),'field',{'rect':[40,30,300,70],'text':'Customer'})
        d=apply(d,'fill',{'name':'Customer','value':'UNIQUE_FORM_VALUE'})
        out=apply(d,'a4',{})
        self.assertIn('UNIQUE_FORM_VALUE',open_pdf(out)[0].get_text())
        self.assertFalse(list(open_pdf(out)[0].widgets() or []))

    def test_adapter(self):
        d=handle('/api/sample',{})['pdf']
        self.assertEqual(len(handle('/api/inspect',{'pdf':d})['pages']),3)
        self.assertEqual(handle('/api/sensitive',{'pdf':d})['results'],[])

if __name__=='__main__':unittest.main(verbosity=2)
