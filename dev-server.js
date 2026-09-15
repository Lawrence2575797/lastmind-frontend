// Local-only combined dev server: serves this directory as static files
// (same as `npx serve .`) AND proxies /knowledge-map-v2/* through to the
// real compile backend. Combined into one process/port deliberately —
// the preview tooling in this environment only bridges a single
// registered server per session, so anything that needs to be reachable
// from the browser preview has to live on this one port.
//
// The proxy exists because the production backend's CORS policy only
// allows the live frontend's origin (see FRONTEND_ORIGIN in
// lastmind-compile-backend/src/index.ts) — a direct browser fetch from
// localhost would be blocked. This forwards server-side instead, so
// nothing about the live backend's CORS policy needs to change.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;
const BACKEND_HOST = 'lastmind-compile-backend.onrender.com';
const PROXY_PREFIX = '/knowledge-map-v2';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  let filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function proxyToBackend(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const proxied = https.request({
      host: BACKEND_HOST,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: BACKEND_HOST },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxied.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'proxy error', detail: err.message }));
    });
    proxied.end(body.length ? body : undefined);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith(PROXY_PREFIX)) proxyToBackend(req, res);
  else serveStatic(req, res);
});

server.listen(PORT, () => console.log(`Dev server (static + backend proxy) on http://localhost:${PORT}`));
