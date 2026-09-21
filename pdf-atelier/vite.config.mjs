import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

function pdfEngine() {
  let running = 0;
  const downloads=new Map();
  const configure=server=>{
    server.middlewares.use('/api', (req, res) => {
      res.setHeader('Content-Type','application/json; charset=utf-8');
      res.setHeader('Cache-Control','no-store');
      const send=(status,obj)=>{if(res.writableEnded)return;res.statusCode=status;res.end(JSON.stringify(obj));};
      for(const [key,file] of downloads)if(file.expires<Date.now())downloads.delete(key);
      if(req.method==='GET'&&req.url.startsWith('/file/')){
        const file=downloads.get(req.url.slice(6));if(!file)return send(404,{error:'保存リンクの期限が切れました。もう一度書き出してください。'});
        res.setHeader('Content-Type',file.type);res.setHeader('Content-Disposition',`attachment; filename="document.${file.ext}"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g,'%27')}`);res.setHeader('X-Content-Type-Options','nosniff');res.end(file.bytes);return;
      }
      if(req.method==='POST'&&req.headers['x-atelier']!=='1')return send(403,{error:'操作元を確認できません。'});
      if(running>=2)return send(429,{error:'処理中です。完了後にもう一度お試しください。'});
      let body='',length=0;
      req.on('data',chunk=>{length+=chunk.length;if(length>75*1024*1024){send(413,{error:'容量上限を超えました。'});req.destroy();}else body+=chunk;});
      req.on('end',()=>{
        if(res.writableEnded)return;
        let parsed;try{parsed=body?JSON.parse(body):{};}catch{return send(400,{error:'不正なリクエストです。'});}
        if(req.url==='/download'&&req.method==='POST'){
          if(typeof parsed.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(parsed.data))return send(400,{error:'保存データが不正です。'});
          const bytes=Buffer.from(parsed.data,'base64');if(bytes.length>40*1024*1024)return send(413,{error:'保存データは40MB以内です。'});
          if(downloads.size>=5)return send(429,{error:'保存リンクは5件までです。2分後に再試行してください。'});
          const name=String(parsed.name||'document.pdf').replace(/[\r\n\\/]/g,'_').slice(0,160),ext=name.split('.').pop();
          const types={pdf:'application/pdf',zip:'application/zip',json:'application/json',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
          const id=randomBytes(24).toString('hex');downloads.set(id,{bytes,name,ext:types[ext]?ext:'bin',type:types[ext]||'application/octet-stream',expires:Date.now()+120000});
          const cleanup=setTimeout(()=>downloads.delete(id),120000);cleanup.unref();return send(200,{url:'/api/file/'+id});
        }
        running++;
        const localPython=fileURLToPath(new URL('./.venv/bin/python3',import.meta.url));
        const child=spawn(existsSync(localPython)?localPython:'python3',[fileURLToPath(new URL('./engine_cli.py',import.meta.url))],{stdio:['pipe','pipe','pipe']});
        let output='',diagnostic='',finished=false;
        const finish=(status,obj)=>{if(finished)return;finished=true;clearTimeout(timer);running--;send(status,obj);};
        const timer=setTimeout(()=>{child.kill();finish(408,{error:'処理時間が上限を超えました。対象ページを減らしてください。'});},120000);
        child.stdout.on('data',chunk=>{output+=chunk;if(output.length>130*1024*1024){child.kill();finish(413,{error:'出力容量が上限を超えました。'});}});
        child.stderr.on('data',chunk=>{diagnostic+=chunk;});
        child.on('error',()=>finish(500,{error:'PDF処理エンジンを起動できません。Python環境を確認してください。'}));
        child.on('close',()=>{try{const d=JSON.parse(output);finish(d.status,d.body);}catch{const missing=diagnostic.match(/ModuleNotFoundError: No module named '([a-zA-Z0-9_]+)'/);finish(500,{error:missing?`PDF処理に必要なライブラリ ${missing[1]} が見つかりません。`:'PDF処理エンジンが応答しませんでした。元のPDFは変更されていません。'});}});
        child.stdin.on('error',()=>{});
        child.stdin.end(JSON.stringify({path:'/api'+req.url.split('?')[0],body:parsed}));
      });
    });
  };
  return {name:'pdf-engine',configureServer:configure,configurePreviewServer:configure};
}

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(), pdfEngine()],
});
