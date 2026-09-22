import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import JSZip from 'jszip';
import {createDocx,createVisualDocx,createVisualXlsx,createXlsx,editPdf,extractPages} from '../src/localCore.js';

async function sample(count=3){
  const doc=await PDFDocument.create();
  for(let i=0;i<count;i++) doc.addPage([300+i,400+i]);
  return new Uint8Array(await doc.save());
}

test('local page operations never need an API',async()=>{
  const original=await sample();
  const rotated=await editPdf(original,'rotate',{page:0,selected:[0],degrees:90});
  assert.equal((await PDFDocument.load(rotated)).getPage(0).getRotation().angle,90);
  const duplicated=await editPdf(rotated,'duplicate',{page:0,selected:[0]});
  assert.equal((await PDFDocument.load(duplicated)).getPageCount(),4);
  const deleted=await editPdf(duplicated,'delete',{page:0,selected:[1]});
  assert.equal((await PDFDocument.load(deleted)).getPageCount(),3);
  const reordered=await editPdf(deleted,'reorder',{order:[2,1,0]});
  assert.equal((await PDFDocument.load(reordered)).getPage(0).getWidth(),302);
  const merged=await editPdf(reordered,'merge',{other:await sample(2),page:0,selected:[0]});
  assert.equal((await PDFDocument.load(merged)).getPageCount(),5);
  const split=await extractPages(merged,[1,3]);
  assert.equal((await PDFDocument.load(split)).getPageCount(),2);
});

test('cannot delete all pages or use malformed order',async()=>{
  const input=await sample(2);
  await assert.rejects(()=>editPdf(input,'delete',{selected:[0,1]}),/全ページ/);
  await assert.rejects(()=>editPdf(input,'reorder',{order:[0,0]}),/正しくありません/);
});

test('image placement embeds pixels without a server',async()=>{
  const input=await sample(1);
  const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7xkAAAAASUVORK5CYII=','base64'));
  const output=await editPdf(input,'image',{page:0,selected:[0],image:png,imageType:'image/png',rect:[20,20,120,70]});
  assert.ok(output.length>input.length);
  const reopened=await PDFDocument.load(output);
  assert.equal(reopened.getPageCount(),1);
});

test('local highlight and rectangle validate their placement',async()=>{
  const input=await sample(1);
  const highlighted=await editPdf(input,'highlight',{page:0,selected:[0],rect:[20,20,120,70]});
  const outlined=await editPdf(highlighted,'rectangle',{page:0,selected:[0],rect:[30,30,140,90]});
  assert.ok(outlined.length>input.length);
  await assert.rejects(()=>editPdf(input,'rectangle',{page:0,selected:[0],rect:[20,20,10,70]}),/配置範囲/);
});

test('DOCX and XLSX exports are valid zip packages',async()=>{
  const docx=await createDocx(['日本語の文字抽出','二ページ目']);
  const docxZip=await JSZip.loadAsync(await docx.arrayBuffer());
  assert.ok(docxZip.file('word/document.xml'));
  const xlsx=await createXlsx(['請求書\n合計 1000','二ページ目']);
  const xlsxZip=await JSZip.loadAsync(await xlsx.arrayBuffer());
  assert.ok(xlsxZip.file('xl/workbook.xml'));
  assert.ok(xlsxZip.file('xl/worksheets/sheet2.xml'));
  assert.match(await xlsxZip.file('xl/worksheets/sheet1.xml').async('text'),/請求書/);
  const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7xkAAAAASUVORK5CYII=','base64'));
  const visualDocx=await createVisualDocx([{bytes:png,width:595,height:842}]);
  const visualDocxZip=await JSZip.loadAsync(await visualDocx.arrayBuffer());
  assert.ok(Object.keys(visualDocxZip.files).some((name)=>name.startsWith('word/media/')));
  const visualXlsx=await createVisualXlsx([{bytes:png,width:595,height:842}],['編集可能文字']);
  const visualXlsxZip=await JSZip.loadAsync(await visualXlsx.arrayBuffer());
  assert.ok(visualXlsxZip.file('xl/media/image1.png'));
  assert.ok(visualXlsxZip.file('xl/drawings/drawing1.xml'));
  assert.match(await visualXlsxZip.file('xl/worksheets/sheet1.xml').async('text'),/編集可能文字/);
  const docxOpened=spawnSync('.venv/bin/python3',['-c','import io,sys; from docx import Document; d=Document(io.BytesIO(sys.stdin.buffer.read())); assert len(d.inline_shapes)==1'],{input:Buffer.from(await visualDocx.arrayBuffer())});
  assert.equal(docxOpened.status,0,docxOpened.stderr.toString());
  const xlsxOpened=spawnSync('.venv/bin/python3',['-c','import io,sys; from openpyxl import load_workbook; w=load_workbook(io.BytesIO(sys.stdin.buffer.read())); assert len(w.sheetnames)==1; assert len(w.active._images)==1'],{input:Buffer.from(await visualXlsx.arrayBuffer())});
  assert.equal(xlsxOpened.status,0,xlsxOpened.stderr.toString());
});

test('active frontend contains no document API calls',async()=>{
  const source=await readFile(new URL('../src/localEngine.js',import.meta.url),'utf8');
  const core=await readFile(new URL('../src/localCore.js',import.meta.url),'utf8');
  const app=await readFile(new URL('../src/LocalApp.jsx',import.meta.url),'utf8');
  const entry=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
  assert.match(entry,/LocalApp/);
  assert.doesNotMatch(source+core+app,/fetch\(\s*["'`]\/api\//);
  assert.doesNotMatch(source+core+app,/XMLHttpRequest|sendBeacon|WebSocket/);
});
