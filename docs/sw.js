'use strict';
const BUILD = {"app":"cuereport","appVersion":"0.3.0","version":"38f5569c47d6f5d3","files":[{"path":"index.html","mime":"text/html","bytes":491689,"sha256":"56366c3fb9fd2cb1bbf9e52d1821266511e11bfaf7e365f0390393590d90172a"},{"path":"manifest.webmanifest","mime":"application/manifest+json","bytes":672,"sha256":"9c5575ff0afdd133684de37153723c2a3753286e3c4d5bb5e7a6d411f822db90"},{"path":"icon.svg","mime":"image/svg+xml","bytes":486,"sha256":"0c50c3638ddfe1ea526a4f67296446b5bb470d1b08bf986f2409ae90a371a601"},{"path":"icon-192.png","mime":"image/png","bytes":1109,"sha256":"5c0e61e0530b07089e61c70320ca560213b6f1ea3b3f00b92e4bbf78eb0e8253"},{"path":"icon-512.png","mime":"image/png","bytes":4887,"sha256":"35cad0e790e64b8c39f0bcb5bd79cdc45559fc8f809313f5aa8f6020712d95f3"},{"path":"icon-maskable.png","mime":"image/png","bytes":4887,"sha256":"35cad0e790e64b8c39f0bcb5bd79cdc45559fc8f809313f5aa8f6020712d95f3"},{"path":"apple-touch-icon.png","mime":"image/png","bytes":1018,"sha256":"6691c47abec46b2cfab5d13421b907b482364b5a294b57e5d8467ff581f434ef"},{"path":"atkinson-hyperlegible-latin-400-normal.woff2","mime":"font/woff2","bytes":17208,"sha256":"d64ba838ef5472bba248620ec4fd8b5aa7cf0db2908e0bb230600caf279ba7bc"},{"path":"atkinson-hyperlegible-latin-700-normal.woff2","mime":"font/woff2","bytes":17524,"sha256":"140e2bd25a7315c8a062508391426b0d8c3297400c947b8d847be28f73a199f0"},{"path":"newsreader-variable.ttf","mime":"font/ttf","bytes":451664,"sha256":"8a08d13f8a6c0d51be379a60af84f945f65369a67e509ee3c3bdcc421254d7c1"},{"path":"inter-variable.ttf","mime":"font/ttf","bytes":876576,"sha256":"29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031"}]};
const ROOT = new URL('./', self.location.href);
const CACHE = BUILD.app.replaceAll('-','_') + '_pwa_' + BUILD.version;
const paths = new Map(BUILD.files.map((file) => [new URL(file.path, ROOT).href, file]));
const hex = (buffer) => [...new Uint8Array(buffer)].map((v) => v.toString(16).padStart(2, '0')).join('');
async function complete() {
 const cache = await caches.open(CACHE);
 return (await Promise.all([...paths.keys()].map((url) => cache.match(url)))).every(Boolean);
}
async function prepareFiles() {
 const cache = await caches.open(CACHE);
 for (const [url, file] of paths) {
  if (await cache.match(url)) continue;
  const response = await fetch(new Request(url, {cache:'reload', credentials:'omit'}));
  if (!response.ok || response.redirected || !response.headers.get('content-type')?.toLowerCase().includes(file.mime)) throw Error('Required offline asset unavailable: '+file.path);
  const bytes = await response.clone().arrayBuffer();
  if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== file.sha256) throw Error('Build mismatch: '+file.path);
  await cache.put(url, response);
 }
}
self.addEventListener('install', (event) => event.waitUntil(prepareFiles().catch(async(error) => { await caches.delete(CACHE); throw error; })));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('message', (event) => event.waitUntil((async () => {
 if (event.data?.type === 'PREPARE') { try { await prepareFiles(); event.ports[0]?.postMessage({ready:true}); } catch { event.ports[0]?.postMessage({error:'Offline preparation failed. Reconnect and retry; storage may be full or this build is no longer available.'}); } }
 if (event.data?.type === 'STATUS') event.ports[0]?.postMessage({ready:await complete(), version:BUILD.version});
 if (event.data?.type === 'ACTIVATE') {
  const clients = (await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter((c) => c.url.startsWith(ROOT.href));
  if (clients.length > 1) { event.ports[0]?.postMessage({error:'Close the other tabs for this app, then retry. Their work has not been changed.'}); return; }
  if (!await complete()) { event.ports[0]?.postMessage({error:'The new offline copy is incomplete. Keep this version and retry preparation online.'}); return; }
  event.ports[0]?.postMessage({accepted:true}); await self.skipWaiting();
 }
})()));
self.addEventListener('fetch', (event) => {
 const request = event.request, url = new URL(request.url);
 if(request.method !== 'GET' || request.headers.has('authorization') || url.origin !== ROOT.origin) return;
 let key = url.href;
 if(request.mode === 'navigate' && [ROOT.pathname, ROOT.pathname+'index.html', ROOT.pathname+'ablation', ROOT.pathname+'statistics', ROOT.pathname+'system'].includes(url.pathname)) key = new URL('index.html', ROOT).href;
 if(!paths.has(key)) return;
 event.respondWith((async () => {
  const cache = await caches.open(CACHE), hit = await cache.match(key);
  if(hit) return hit;
  // An evicted asset must still belong to this exact build; never mix new Wasm/JS into old HTML.
  try {
   const response = await fetch(new Request(key, {cache:'reload',credentials:'omit'})), file=paths.get(key);
   if(!response.ok || !response.headers.get('content-type')?.toLowerCase().includes(file.mime) || hex(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer())) !== file.sha256) throw Error('Build unavailable');
   await cache.put(key,response.clone()); return response;
  } catch {
   if(request.mode === 'navigate') return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline copy unavailable</title><h1>Reconnect to open this app</h1><p>This device has no complete offline copy. Reconnect, reload, then choose Prepare offline.</p></html>',{status:503,headers:{'Content-Type':'text/html'}});
   return Response.error();
  }
 })());
});
