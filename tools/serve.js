/* WorkFlowX yerel sunucu — "WorkflowX-Baslat.bat" bunu çalıştırır.
   Uygulamayı http://localhost:5500 adresinden açar; böylece Google ile giriş ve e-posta
   bağlantıları çalışır (dosyadan açılan sayfaya Google geri dönemez).
   - Yalnızca bu bilgisayardan erişilir (127.0.0.1 / ::1), ağdaki diğer cihazlar göremez.
   - Ek paket gerekmez; sadece Node.js.
   - Pencereyi kapatınca sunucu durur. */
const http = require('http'), fs = require('fs'), path = require('path'), { exec } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), PORT = 5500, URL = `http://localhost:${PORT}/index.html`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const PING = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');   // 1×1 gif: "sunucu açık mı?" kontrolü
const HIDDEN = /(^|[\\/])(\.[^\\/]*|node_modules|web)([\\/]|$)/;                                      // .git, .env…, web/ (Next.js) sunulmaz

function openBrowser() {
  if (process.env.WFX_NO_OPEN) return;
  const cmd = process.platform === 'win32' ? `start "" "${URL}"` : process.platform === 'darwin' ? `open "${URL}"` : `xdg-open "${URL}"`;
  exec(cmd, () => {});
}
function handle(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end() }
  let p; try { p = decodeURIComponent(new globalThis.URL(req.url, 'http://x').pathname) } catch { res.writeHead(400); return res.end() }
  if (p === '/__wfx.gif') { res.writeHead(200, { 'content-type': 'image/gif', 'cache-control': 'no-store' }); return res.end(PING) }
  if (p === '/') p = '/index.html';
  const rel = path.normalize(p).replace(/^([\\/])+/, ''), file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) || HIDDEN.test(rel)) { res.writeHead(404); return res.end('Bulunamadı') }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Bulunamadı') }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
const main = http.createServer(handle);
main.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.log('WorkFlowX zaten açık. Tarayıcıda açılıyor: ' + URL); openBrowser(); setTimeout(() => process.exit(0), 1500); return }
  console.error('Sunucu başlatılamadı:', e.message); process.exit(1);
});
main.listen(PORT, '127.0.0.1', () => {
  const v6 = http.createServer(handle); v6.on('error', () => {}); v6.listen(PORT, '::1');   // bazı Windows'larda "localhost" önce ::1'e gider
  console.log('WorkFlowX açık: ' + URL);
  console.log('Bu pencere açık kaldığı sürece uygulama çalışır. Kapatmak için pencereyi kapat.');
  openBrowser();
});
