import { defineConfig } from 'vite';

function privacyLockdown() {
  const configure = (server) => { server.middlewares.use('/api', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'close');
    const health = req.method === 'GET' && req.url === '/health';
    res.statusCode = health ? 200 : 403;
    res.end(JSON.stringify(health
      ? { ok: true, mode: 'privacy-lockdown', documentProcessing: false }
      : { error: 'Document processing disabled', mode: 'privacy-lockdown' }));
  }); };
  return { name: 'privacy-lockdown', configureServer: configure, configurePreviewServer: configure };
}

export default defineConfig({
  build: { outDir: 'dist/client' },
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  plugins: [privacyLockdown()],
});
