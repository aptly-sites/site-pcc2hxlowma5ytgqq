import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { onRequest as propertyDetails } from '../functions/properties/_middleware.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const production = 'https://blue-crown-property-management.sshekou.chatgpt.site';
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function localPath(pathname) {
  try {
    const path = resolve(root, '.' + decodeURIComponent(pathname));
    return path === root || path.startsWith(root + sep) ? path : null;
  } catch {
    return null;
  }
}

async function fileAt(pathname) {
  let path = localPath(pathname);
  if (!path) return null;
  try {
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    if (!(await stat(path)).isFile()) return null;
    return path;
  } catch {
    return null;
  }
}

async function assetFetch(url) {
  const path = await fileAt(new URL(url).pathname);
  if (!path) return new Response('Not found', { status: 404 });
  return new Response(await readFile(path), {
    headers: { 'Content-Type': types[extname(path).toLowerCase()] || 'application/octet-stream' }
  });
}

async function sendResponse(response, request, output) {
  output.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name)) {
      output.setHeader(name, value);
    }
  });
  output.setHeader('Cache-Control', 'no-store');
  if (request.method === 'HEAD' || !response.body) return output.end();
  for await (const chunk of response.body) {
    if (!output.write(chunk)) await once(output, 'drain');
  }
  output.end();
}

async function sendStatic(request, output, pathname) {
  const path = await fileAt(pathname);
  if (!path) {
    output.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return output.end('Not found');
  }
  output.writeHead(200, {
    'Content-Type': types[extname(path).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  if (request.method === 'HEAD') return output.end();
  createReadStream(path).pipe(output);
}

const server = createServer(async (request, output) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);
    if (request.method === 'GET' && url.pathname === '/api/nearby-schools') {
      try {
        const upstream = await fetch(production + url.pathname + url.search, {
          signal: AbortSignal.timeout(25000)
        });
        return sendResponse(upstream, request, output);
      } catch {
        return sendResponse(Response.json({ error: 'School information is temporarily unavailable.' }, { status: 502 }), request, output);
      }
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname.startsWith('/properties/')) {
      const response = await propertyDetails({
        request: new Request(url, { method: request.method }),
        next: () => assetFetch(url),
        env: { ASSETS: { fetch: assetFetch } }
      });
      return sendResponse(response, request, output);
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      return sendStatic(request, output, url.pathname);
    }
    output.writeHead(405, { Allow: 'GET, HEAD' });
    output.end();
  } catch (error) {
    if (!output.headersSent) output.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    output.end('Preview error');
    console.error(error);
  }
});

server.listen(port, host, () => console.log(`Preview: http://${host}:${port}/`));
