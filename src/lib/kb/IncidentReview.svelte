<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { groupByCause, uniqueById, type Cause, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  const unique = uniqueById(reports as Report[]);
  const merged = unique.filter((r) => r.mergedInto === 4471);
  const groups = groupByCause(merged, tenantOf);
  const tickets: Partial<Record<Cause, string>> = {
    parser: 'https://github.com/chrigu/testmd/issues/2',
    hint: 'https://github.com/chrigu/testmd/issues/1',
  };
  const names = {
    parser: 'Shared parser assumes month-first input',
    hint: 'booking-v3 hint conflicts with day-first form interpretation',
    unplaced: 'Missing or unsupported tenant context',
  };
  const differences = groups.reduce((n, g) =>
    n + g.reports.filter((r) => r.meta.intakeTag !== g.cause).length, 0);
  const followups = merged.filter((r) => notes.oneDayMove.includes(r.id));
  const otherEvidence = merged.filter((r) =>
    ['R-41290', 'R-41417', 'R-41514', 'R-41615'].includes(r.id));
  const days = merged.map((r) => r.receivedAt.slice(0, 10)).sort();
</script>

<p class="sum">
  <strong>{merged.length}</strong> distinct reports merged into #4471,
  from <time>{days[0]}</time> through <time>{days.at(-1)}</time>.
  The export contains <strong>{reports.length}</strong> rows:
  <strong>{reports.length - unique.length}</strong> repeated rows are excluded.
</p>

<table aria-label="Distinct reports by tenant and form cause">
  <thead>
    <tr><th>Problem / candidate cause</th><th>Reports</th><th>Tenants</th><th>Received</th><th>Ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.cause)}
      <tr>
        <td>{names[g.cause]} (<code>{g.cause}</code>)</td>
        <td>{g.reports.length}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if g.cause !== 'unplaced' && tickets[g.cause]}
            <a href={tickets[g.cause]}>GitHub issue</a>
          {:else}
            draft — not published
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<p>
  <strong>{differences}</strong> intake tags disagree with the tenant/form classification.
  Intake tags describe an initial browser-based guess; they are not a reliable count by cause.
</p>

<table aria-label="Intake tag audit">
  <thead><tr><th>Computed cause</th><th>Intake tags in this group</th></tr></thead>
  <tbody>
    {#each groups as g (g.cause)}
      <tr>
        <td><code>{g.cause}</code></td>
        <td>{Object.entries(g.taggedAs).map(([tag, n]) => tag + ': ' + n).join(' · ')}</td>
      </tr>
    {/each}
  </tbody>
</table>

<h3>Exceptions: classification is not a complete diagnosis</h3>

<p>
  The desk flagged <strong>{followups.length}</strong> report IDs as “one-day moves”.
  They remain included in the computed parser count above, not an additional population.
  The bodies below do not prove that all of them share one cause. In particular,
  <code>R-41236</code> describes an invite arriving before a booking, not an explicit one-day shift.
  Timezone or date-boundary behavior is an investigation hypothesis, not an established fix.
</p>

<table aria-label="Desk-flagged reports requiring investigation">
  <thead><tr><th>Report</th><th>Tenant / channel</th><th>Reporter evidence</th></tr></thead>
  <tbody>
    {#each followups as r (r.id)}
      <tr><td><code>{r.id}</code></td><td>{r.tenant} / {r.channel}</td><td>{r.body}</td></tr>
    {/each}
  </tbody>
</table>

<p>
  Other narratives below describe impact, workarounds, or a month displacement without enough
  input/output detail to establish a specific mechanism. They also stay in their existing
  computed group. Do not present every report in that group as a demonstrated month/day swap.
</p>

<table aria-label="Other incomplete evidence">
  <thead><tr><th>Report</th><th>Reporter evidence</th></tr></thead>
  <tbody>
    {#each otherEvidence as r (r.id)}
      <tr><td><code>{r.id}</code></td><td>{r.body}</td></tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { padding: 0.75rem; background: var(--note-bg); }
  h3 { margin-top: 2rem; }
</style>
