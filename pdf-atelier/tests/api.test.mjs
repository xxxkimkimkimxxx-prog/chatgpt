import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('HTTP engine, edits, validation, export and exact download bytes',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:false}});
  await server.listen();
  const base=`http://127.0.0.1:${server.httpServer.address().port}`;
  const post=async(path,body,headers={})=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Atelier':'1',...headers},body:JSON.stringify(body)});
  try{
    const sample=await (await fetch(base+'/api/sample')).json();
    assert.ok(sample.pdf);
    const inspected=await (await post('inspect',{pdf:sample.pdf})).json();
    assert.equal(inspected.pages.length,3);
    const edited=await (await post('apply',{pdf:sample.pdf,action:'text',args:{rect:[30,30,300,80],text:'HTTP検証済み'}})).json();
    assert.ok(edited.pdf);
    const roundtrip=await (await post('inspect',{pdf:edited.pdf})).json();
    assert.ok(roundtrip.text.includes('HTTP検証済み'));
    const rejected=await post('apply',{pdf:sample.pdf,action:'delete',args:{selected:[0,1,2]}});
    assert.equal(rejected.status,400);
    assert.equal((await post('inspect',{pdf:'bad'})).status,400);
    assert.equal((await post('inspect',{pdf:sample.pdf},{'X-Atelier':''})).status,403);
    const output=await (await post('export',{pdf:edited.pdf,kind:'txt',args:{}})).json();
    assert.ok(Buffer.from(output.data,'base64').toString().includes('HTTP検証済み'));
    const ready=await (await post('download',{data:edited.pdf,name:'検証済み.pdf'})).json();
    const downloaded=await fetch(base+ready.url);
    assert.equal(downloaded.status,200);
    assert.equal(downloaded.headers.get('content-type'),'application/pdf');
    assert.ok(downloaded.headers.get('content-disposition').startsWith('attachment'));
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),Buffer.from(edited.pdf,'base64'));
    assert.equal((await fetch(base+'/api/file/not-a-token')).status,404);
  }finally{await server.close();}
});
