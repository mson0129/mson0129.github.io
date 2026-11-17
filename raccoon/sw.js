/* Version and SHA-256 hashes are generated from the complete build. */
const VERSION = "43c9df94a9296c7d4934";
const ASSETS = [{"url": "index.htm", "sha256": "923aa251c5ae808273da758174c0ff4ba892b63eb964f70a0f2e5bf1fac400a4"}, {"url": "pwa.js", "sha256": "57bdeb0eb61fd2173d8a1bfb44eace11b7bce463875d70ab8dd4823d836a5d06"}, {"url": "app.webmanifest", "sha256": "5766ca3a9f493e4b842548227191df6dfd9088ea614f86424ce1c81995d66b87"}, {"url": "port/gamepad-input.mjs", "sha256": "ec7eb7fbb6e8eab6fa172132502368ea1c772abc4607674d438d5050fe57440f"}, {"url": "port/player.js", "sha256": "6381f8ddaf00c37a8d804a19d6976436ebcd35f0d7885b15f189f070ec19644a"}, {"url": "port/ppk.wasm", "sha256": "4f85549e2ebcbb8a85122342b4a28b5cb6f3bed962aaa03c966876af48556653"}, {"url": "port/speedrun-timer.mjs", "sha256": "de6758036e896bcefbf960ef44faf08b5303be5452cd47145137676a5353b3d4"}, {"url": "icons/apple-touch-icon.png", "sha256": "59405b141195fe4f6088881b71a92dbabab66ba9e6ab1d458c3baabd501355ce"}, {"url": "icons/icon-192.png", "sha256": "6257e33b59886d263965ffc26edd21076fd292a6706af1f0b75c5b7c4e4a496d"}, {"url": "icons/icon-512.png", "sha256": "f834327e01c7cb95733ad2169ffa3d18f561193e78accac518e2827bf2edebee"}, {"url": "icons/maskable-512.png", "sha256": "2523620c72aa7477c495426e4f57aeacbf338363d5d8a56dc529ddc32df43535"}];
const BASE = self.registration.scope;
const PREFIX = 'ppk-offline-' + encodeURIComponent(new URL(BASE).pathname) + '-';
const CACHE = PREFIX + VERSION;
const byUrl = new Map(ASSETS.map(asset => [new URL(asset.url, BASE).href, asset]));
async function verifiedFetch(asset) {
    const response = await fetch(new Request(new URL(asset.url, BASE), {cache:'reload', credentials:'same-origin'}));
    if (!response.ok || response.type === 'opaque') throw new Error('Offline asset unavailable: '+asset.url);
    const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
    const actual = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('');
    if (actual !== asset.sha256) throw new Error('Offline asset version mismatch: '+asset.url);
    return response;
}
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        const results = await Promise.allSettled(ASSETS.map(async asset => {
            await cache.put(new URL(asset.url, BASE).href, await verifiedFetch(asset));
        }));
        if (results.some(result => result.status === 'rejected')) {
            await caches.delete(CACHE);
            throw new Error('Incomplete offline package; keeping the previous version.');
        }
        // Do not replace an active game; an update waits for user consent or closed tabs.
    })());
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url); url.search = ''; url.hash = '';
    let target = url.href;
    if (event.request.mode === 'navigate' && target === BASE) target = new URL('index.htm', BASE).href;
    const asset = byUrl.get(target);
    if (!asset) return; // Other pages and the online-only DOS reference are untouched.
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(target);
        if (cached) return cached;
        // Repair an evicted file online, but reject a mismatched/newer version.
        const response = await verifiedFetch(asset);
        await cache.put(target, response.clone());
        return response;
    })());
});
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') { event.waitUntil(self.skipWaiting()); return; }
    if (event.data?.type === 'OFFLINE_STATUS') event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        const matches = await Promise.all(ASSETS.map(asset => cache.match(new URL(asset.url, BASE).href)));
        event.ports[0]?.postMessage({ready:matches.every(Boolean), version:VERSION, files:ASSETS.length});
    })());
});
