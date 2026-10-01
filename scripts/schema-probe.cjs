// TEMPORARY CI debug helper: tries every known Notion id against both query
// endpoints (plus database retrieve), then dumps property names + value domains
// for whatever works, so databases.yaml can be pinned. Never prints the key.
// TODO: delete this file (and its workflow step) once the schema is pinned.
const { Client } = require('@notionhq/client');

const key = process.env.NOTION_API_KEY;
if (!key) {
  console.log('[probe] NOTION_API_KEY not set — skipping');
  process.exit(0);
}
const client = new Client({ auth: key });

const ROLES = [
  ['actores-page', '36c14415-10e1-802d-9864-e4a7d878e5e8'],
  ['actores-ds', '36c14415-10e1-806c-bf67-000b85483116'],
  ['intervenciones', '2f414415-10e1-80ff-bc2f-c1581274d40f'],
  ['intervenciones-view', '2f414415-10e1-809a-a581-000ccaa5ecde'],
];

async function queryPages(kind, id) {
  const all = [];
  let cursor;
  do {
    const res = await client.request({
      path: `${kind}/${id}/query`,
      method: 'post',
      body: { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) },
    });
    all.push(...(res.results || []));
    cursor = res.next_cursor || undefined;
  } while (cursor && all.length < 400);
  return all;
}

async function dump(role, pages) {
  if (!pages || pages.length === 0) return;
  const first = pages[0].properties ?? {};
  const names = Object.entries(first);
  console.log(`[probe] ${role}: ${pages.length} rows`);
  for (const [k, v] of names) {
    if (v?.type === 'title') {
      const t = (v.title ?? []).map((x) => x.plain_text).join('').slice(0, 80);
      console.log(`[probe] ${role}: title[${k}] = ${JSON.stringify(t)}`);
    }
  }
  console.log(`[probe] ${role}: props (${names.length}):`);
  for (const [name, p] of names) console.log(`[probe]   ${name} :: ${p?.type}`);
  for (const [name, p] of names) {
    if (!['select', 'multi_select', 'checkbox', 'status'].includes(p?.type)) continue;
    const vals = new Set();
    for (const page of pages) {
      const v = page.properties?.[name];
      if (!v) continue;
      if (v.type === 'select') vals.add(v.select?.name ?? '(null)');
      else if (v.type === 'multi_select') (v.multi_select ?? []).forEach((s) => vals.add(s.name));
      else if (v.type === 'checkbox') vals.add(String(v.checkbox));
      else if (v.type === 'status') vals.add(v.status?.name ?? '(null)');
    }
    console.log(
      `[probe]   values[${name}] ${[...vals].slice(0, 25).map((x) => JSON.stringify(x)).join(' | ')}`,
    );
  }
}

(async () => {
  for (const [role, id] of ROLES) {
    for (const kind of ['data_sources', 'databases']) {
      try {
        const pages = await queryPages(kind, id);
        console.log(`[probe] OK ${role} via ${kind}/${id}`);
        await dump(`${role}/${kind}`, pages);
      } catch (e) {
        console.log(`[probe] FAIL ${role} via ${kind}/${id}: ${e?.code} ${e?.message ?? ''}`);
      }
    }
    try {
      const db = await client.request({ path: `databases/${id}`, method: 'get' });
      const dss = (db?.data_sources ?? []).map((d) => d.id);
      const title = (db?.title ?? []).map((t) => t.plain_text).join('').slice(0, 60);
      console.log(`[probe] OK ${role} retrieve: ${JSON.stringify(title)} data_sources=${JSON.stringify(dss)}`);
    } catch (e) {
      console.log(`[probe] FAIL ${role} retrieve: ${e?.code} ${e?.message ?? ''}`);
    }
  }
  console.log('[probe] done');
})().catch((e) => {
  console.log(`[probe] fatal: ${e?.code} ${e?.message ?? ''}`);
  process.exit(0);
});