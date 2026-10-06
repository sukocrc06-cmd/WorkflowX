/* Vercel build: copies only what the site needs into an output folder (default: dist).
   Used by vercel.json (repo root) and web/vercel.json (when the Vercel Root Directory is "web"),
   so the site works with either setting and never serves qa/, docs/, tools/ or web/. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, process.argv[2] || 'dist');
const KEEP = ['index.html', 'manifest.webmanifest', 'assets'];
if (!OUT.startsWith(ROOT + path.sep)) { console.error('Output must be inside the repository'); process.exit(1) }
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const k of KEEP) {
  const src = path.join(ROOT, k);
  if (!fs.existsSync(src)) { console.error('Missing: ' + k); process.exit(1) }
  fs.cpSync(src, path.join(OUT, k), { recursive: true });
}
let n = 0; (function count(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? count(path.join(d, e.name)) : n++ })(OUT);
console.log(`WorkFlowX: ${n} dosya → ${path.relative(ROOT, OUT)}`);
