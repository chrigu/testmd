import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { renderPages } from '../.build/render.js';

const root = new URL('../rendered/', import.meta.url);
await mkdir(root, { recursive: true });
const css = await readFile(new URL('../.build/style.css', import.meta.url), 'utf8');
await writeFile(new URL('style.css', root), css);
await writeFile(new URL('.nojekyll', root), '');
await writeFile(new URL('index.html', root), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Support KB review</title><meta http-equiv="refresh" content="0; url=kb/incidents/4471-review/"></head>
<body><a href="kb/incidents/4471-review/">Open the signed #4471 review</a></body></html>
`);

for (const { route, head, body } of renderPages()) {
  const output = join(route, 'index.html');
  const stylesheet = relative(dirname(output), 'style.css');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${stylesheet}">${head}</head><body>${body}</body></html>
`.replace(/href="(\/kb(?:\/[^"]*)?)"/g, (_, href) => {
    const destination = relative(dirname(output), href.slice(1));
    return `href="${destination ? destination + '/' : './'}"`;
  });
  const target = new URL(output, root);
  await mkdir(new URL('./', target), { recursive: true });
  await writeFile(target, html);
  console.log('Rendered /' + route);
}
