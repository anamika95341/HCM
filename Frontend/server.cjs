const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 5173);
const DIST_DIR = path.join(__dirname, 'dist');
/** When the SPA is built with a relative VITE_API_BASE_URL (e.g. /api/v1), browser calls hit this server — forward them to the backend. Override in Docker: http://backend:3000 */
const API_UPSTREAM = (process.env.API_UPSTREAM || 'http://127.0.0.1:3000').trim();

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getSafePath(urlPath) {
  const normalized = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(DIST_DIR, normalized);
  if (!candidate.startsWith(DIST_DIR)) {
    return null;
  }
  return candidate;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);

  const isHtml = ext === '.html';
  res.writeHead(200, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    // HTML must always revalidate so new index.html picks up new hashed JS/CSS after deploys.
    'Cache-Control': isHtml
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=31536000, immutable',
    ...(isHtml ? { Pragma: 'no-cache' } : {}),
  });

  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal Server Error');
  });

  stream.pipe(res);
}

function stripConnectionHeader(headers) {
  const out = { ...headers };
  delete out.connection;
  return out;
}

function proxyApiToUpstream(req, res) {
  let upstreamBase;
  try {
    upstreamBase = new URL(API_UPSTREAM);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('API_UPSTREAM is invalid');
    return;
  }

  const incoming = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const targetPath = incoming.pathname + incoming.search;

  const isHttps = upstreamBase.protocol === 'https:';
  const lib = isHttps ? https : http;
  const defaultPort = isHttps ? 443 : 80;
  const port = upstreamBase.port ? Number(upstreamBase.port) : defaultPort;

  const hostHeader = port === defaultPort
    ? upstreamBase.hostname
    : `${upstreamBase.hostname}:${port}`;

  const headers = { ...req.headers, host: hostHeader };

  const options = {
    hostname: upstreamBase.hostname,
    port,
    path: targetPath,
    method: req.method,
    headers,
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, stripConnectionHeader(proxyRes.headers));
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const requestPath = (req.url || '/').split('?')[0];

  if (requestPath.startsWith('/api/')) {
    proxyApiToUpstream(req, res);
    return;
  }

  const safePath = getSafePath(requestPath === '/' ? '/index.html' : requestPath);

  if (!safePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  fs.stat(safePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(res, safePath);
      return;
    }

    const fallback = path.join(DIST_DIR, 'index.html');
    fs.stat(fallback, (fallbackError, fallbackStats) => {
      if (fallbackError || !fallbackStats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      sendFile(res, fallback);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Frontend server listening on http://${HOST}:${PORT}`);
});
