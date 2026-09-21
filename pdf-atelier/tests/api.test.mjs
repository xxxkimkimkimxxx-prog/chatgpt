import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer, preview} from 'vite';

for (const mode of ['development', 'preview']) {
  test(mode + ': document endpoints are disabled', async () => {
    const server = mode === 'development'
      ? await createServer({server:{host:'127.0.0.1',port:0,strictPort:false}})
      : await preview({preview:{host:'127.0.0.1',port:0,strictPort:false}});
    if (mode === 'development') await server.listen();
    const base = 'http://127.0.0.1:' + server.httpServer.address().port;
    try {
      const health = await (await fetch(base + '/api/health')).json();
      assert.equal(health.mode, 'privacy-lockdown');
      assert.equal(health.documentProcessing, false);
      for (const endpoint of ['inspect','apply','export','ocr-image','download','sample','file/token']) {
        for (const method of ['GET','POST','PUT','PATCH','DELETE']) {
          const response = await fetch(base + '/api/' + endpoint, {
            method,
            headers: {'X-Atelier':'1','Content-Type':'application/json'},
            ...(method === 'GET' ? {} : {body:'{"pdf":"SYNTHETIC_SECRET_MARKER"}'}),
          });
          assert.equal(response.status, 403, method + ' ' + endpoint);
          assert.equal((await response.json()).mode, 'privacy-lockdown');
        }
      }
    } finally {
      if (mode === 'development') await server.close();
      else await new Promise(resolve => server.httpServer.close(resolve));
    }
  });
}
