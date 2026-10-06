import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
let html = await readFile(path.join(dist, 'index.html'), 'utf8');
const scriptTag = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/);
const styleTag = html.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/);
const cssPath = styleTag?.[0].match(/\bhref="([^"]+)"/)?.[1];
if (!scriptTag || !cssPath) throw new Error('Run npm run build before exporting the game.');

let css = await readFile(path.join(dist, cssPath.replace(/^\//, '')), 'utf8');
const fontPaths = [...new Set([...css.matchAll(/url\(["']?(\/fonts\/[^)"']+)["']?\)/g)].map(match => match[1]))];
for (const fontPath of fontPaths) {
  const bytes = await readFile(path.join(dist, fontPath.slice(1)));
  css = css.replaceAll(fontPath, `data:font/woff2;base64,${bytes.toString('base64')}`);
}
const js = await readFile(path.join(dist, scriptTag[1].replace(/^\//, '')), 'utf8');
const favicon = await readFile(path.join(dist, 'favicon.svg'));
const licenses = (await readdir(path.join(dist, 'fonts'))).filter(name => name.endsWith('LICENSE.txt'));
const notices = await Promise.all(licenses.map(name => readFile(path.join(dist, 'fonts', name), 'utf8')));
html = html.replace(styleTag[0], `<style>${css}</style>`)
  .replace(scriptTag[0], `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`)
  .replace('/favicon.svg', `data:image/svg+xml;base64,${favicon.toString('base64')}`);
html += `\n<!-- Bundled font licenses:\n${notices.join('\n\n').replaceAll('--', '—')}\n-->\n`;
await mkdir(path.join(root, 'release'), { recursive: true });
await writeFile(path.join(root, 'release', 'apex-game.html'), html);
console.log('Created release/apex-game.html — open this file directly in a browser.');
