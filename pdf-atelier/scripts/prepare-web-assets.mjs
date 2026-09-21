#!/usr/bin/env node
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pub=path.join(root,'public');
const tesseract=path.join(pub,'tesseract');
const core=path.join(tesseract,'core');
const languages=path.join(pub,'tessdata');
mkdirSync(core,{recursive:true});
mkdirSync(languages,{recursive:true});

copyFileSync(path.join(root,'node_modules/tesseract.js/dist/worker.min.js'),path.join(tesseract,'worker.min.js'));
for(const name of readdirSync(path.join(root,'node_modules/tesseract.js-core'))){
  if(/^tesseract-core.*\.(?:js|wasm)$/.test(name)){
    copyFileSync(path.join(root,'node_modules/tesseract.js-core',name),path.join(core,name));
  }
}
for(const lang of ['jpn','jpn_vert','eng']){
  copyFileSync(
    path.join(root,'node_modules',`@tesseract.js-data/${lang}`,'4.0.0_best_int',`${lang}.traineddata.gz`),
    path.join(languages,`${lang}.traineddata.gz`),
  );
}
console.log('Prepared local browser OCR assets.');
