import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { uniqueById, groupByCause, causeOf, sameCause, dayFirst } from '../src/lib/kb/causes.ts';
import { deskRef } from '../src/lib/kb/desk-ref.ts';

const json = (path) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const rows = json('src/lib/data/reports-4471.json');
const reports = uniqueById(rows).filter((r) => r.mergedInto === 4471);
const tenantDir = new URL('../src/lib/data/tenants/', import.meta.url);
const tenants = new Map(readdirSync(tenantDir).map((name) => {
  const t = JSON.parse(readFileSync(new URL(name, tenantDir), 'utf8'));
  return [t.handle, t];
}));
const groups = groupByCause(reports, (r) => tenants.get(r.tenant));
const html = readFileSync(new URL('../rendered/kb/incidents/4471-review/index.html', import.meta.url), 'utf8');
const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('export pagination overlap is counted once without hiding conflicting records', () => {
  assert.equal(rows.length, 427);
  assert.equal(reports.length, 412);
  assert.equal(rows.length - reports.length, 15);
  for (const r of rows) assert.deepEqual(r, reports.find((x) => x.id === r.id));
});

test('tenant/form classification partitions the reports, not their intake guesses', () => {
  assert.deepEqual(groups.map((g) => [g.cause, g.reports.length]), [['parser', 379], ['hint', 33]]);
  assert.equal(groups.reduce((n, g) => n + g.reports.length, 0), reports.length);
  assert.equal(groups.reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.cause).length, 0), 38);
  assert.deepEqual(groups.find((g) => g.cause === 'hint').taggedAs, { parser: 15, hint: 18 });
});

test('different channels and forms matter; missing tenant data is not a shared cause', () => {
  const tenant = tenants.get('alder.physio');
  assert.equal(dayFirst(tenant.locale), true);
  assert.equal(causeOf({ channel: 'form' }, tenant), 'hint');
  assert.equal(causeOf({ channel: 'app' }, tenant), 'parser');
  assert.equal(causeOf({ channel: 'email' }, { ...tenant, locale: 'en-US' }), null);
  assert.equal(sameCause({ channel: 'email' }, undefined, { channel: 'email' }, undefined), false);
});

test('desk-flagged exceptions remain visible inside their existing population', () => {
  const ids = json('src/lib/data/desk-notes.json').oneDayMove;
  assert.equal(ids.length, 5);
  assert.equal(groups.find((g) => g.cause === 'parser').reports.filter((r) => ids.includes(r.id)).length, 5);
  for (const id of ids) assert.ok(html.includes(id));
  assert.match(text, /not an explicit one-day shift/);
  assert.match(text, /hypothesis, not an established fix/);
  assert.ok(html.includes('R-41615'));
});

test('the real rendered page includes computed counts, styles, and the derived signature stamp', () => {
  for (const value of ['412', '427', '15', '379', '33', '38']) {
    assert.match(html, new RegExp('<(?:strong|td)>' + value + '</(?:strong|td)>'));
  }
  assert.match(text, /two different date-handling paths/);
  assert.match(text, /not a claim about the current queue/);
  const source = readFileSync(new URL('../src/routes/kb/incidents/4471-review/+page.svx', import.meta.url), 'utf8');
  const signature = source.match(/^signature: '(.+)'$/m)[1];
  const ref = deskRef(signature);
  assert.ok(html.includes(ref));
  assert.ok(!source.includes(ref), 'desk reference must be computed, not typed');
  assert.ok(!html.includes('no desk ref:'));
  assert.ok(!html.includes('undefined'));
  assert.ok(html.includes('https://github.com/chrigu/testmd/issues/1'));
  assert.ok(html.includes('https://github.com/chrigu/testmd/issues/2'));
  assert.ok(!html.includes('draft — not published'));
  assert.match(html, /<svg[\s\S]*reports received and merged/);
  assert.match(html, /href="\.\.\/\.\.\/\.\.\/style.css"/);
  const css = readFileSync(new URL('../rendered/style.css', import.meta.url), 'utf8');
  assert.ok(css.includes('--bg'));
});

test('the KB index discovers the new review page', () => {
  const index = readFileSync(new URL('../rendered/kb/index.html', import.meta.url), 'utf8');
  assert.ok(index.includes('/kb/incidents/4471-review'));
});
