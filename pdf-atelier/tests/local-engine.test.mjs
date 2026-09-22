import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import JSZip from 'jszip';
import {createDocx,createXlsx,editPdf} from '../src/localCore.js';

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
});

test('cannot delete all pages or use malformed order',async()=>{
  const input=await sample(2);
  await assert.rejects(()=>editPdf(input,'delete',{selected:[0,1]}),/全ページ/);
  await assert.rejects(()=>editPdf(input,'reorder',{order:[0,0]}),/正しくありません/);
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
