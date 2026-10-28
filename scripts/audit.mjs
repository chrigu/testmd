import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { uniqueById, groupByCause } from '../src/lib/kb/causes.ts';

const root = new URL('../', import.meta.url);
const load = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const path = 'src/lib/data/reports-4471.json';
const rows = await load(path);
const reports = uniqueById(rows).filter((r) => r.mergedInto === 4471);
const tenantFiles = (await readdir(new URL('src/lib/data/tenants/', root))).sort();
const tenants = new Map(await Promise.all(tenantFiles.map(async (name) => {
  const tenant = await load('src/lib/data/tenants/' + name);
  return [tenant.handle, tenant];
})));
const groups = groupByCause(reports, (r) => tenants.get(r.tenant));
const notes = await load('src/lib/data/desk-notes.json');
const audit = {
  source: path,
  sourceSha256: createHash('sha256').update(await readFile(new URL(path, root))).digest('hex'),
  countingRule: 'Distinct report IDs merged into #4471; causeOf(report channel, tenant directory record). Routing is not proof of every symptom.',
  rawRows: rows.length,
  distinctReports: reports.length,
  repeatedExportRows: rows.length - uniqueById(rows).length,
  intakeDisagreements: groups.reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.cause).length, 0),
  groups: groups.map(({ reports, ...group }) => ({
    ...group, count: reports.length, reportIds: reports.map((r) => r.id).sort(),
  })),
  deskFlaggedIds: notes.oneDayMove,
  caveat: 'Desk flags include R-41236, whose body describes invite-before-booking, not an explicit one-day move. Flagged reports overlap parser, not additional reports.',
};
await mkdir(new URL('evidence/', root), { recursive: true });
await writeFile(new URL('evidence/report-counts.json', root), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({ ...audit, groups: audit.groups.map(({ reportIds, ...g }) => g) }, null, 2));
