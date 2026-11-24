#!/usr/bin/env node
// Spec-pack validator and traceability generator. Zero dependencies (Node >= 20).
//
//   node sdd/scripts/validate-specs.mjs                 # structure lint (pnpm specs:check)
//   node sdd/scripts/validate-specs.mjs --trace         # also regenerate sdd/traceability/matrix.md (pnpm specs:trace)
//   node sdd/scripts/validate-specs.mjs --trace --strict=P1   # fail if any P1 requirement has no tagged test
//
// Requirement block format (see sdd/specs/templates/feature-spec.template.md):
//   #### XFER-021 — Title
//   - **Priority:** P1 · **Type:** Event-driven
//   - **EARS:** WHEN …, THE SYSTEM SHALL …
//   - **Acceptance criteria:**
//     - **XFER-021-AC1** Given … when … then …
// Tests reference requirements in their titles: it('[XFER-021] rejects …')

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = new Set(process.argv.slice(2));
const strictArg = [...args].find((a) => a.startsWith('--strict='));
const strict = strictArg ? strictArg.split('=')[1].split(',') : [];
const doTrace = args.has('--trace') || args.has('--write-matrix');

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${relative(ROOT, file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(ROOT, file)}: ${msg}`);

function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.git') || name === 'dist' || name === 'coverage') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

function frontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/\s+#.*$/, '').trim();
  }
  return fm;
}

// ------------------------------------------------------------------ 1. collect requirements
const REQ_HEADING = /^#### ((?:[A-Z][A-Z0-9]*-)+\d{3}) — (.+)$/;
const specFiles = [
  ...walk(join(ROOT, 'sdd/specs/features'), (p) => p.endsWith('spec.md')),
  ...walk(join(ROOT, 'sdd/specs/nfr'), (p) => p.endsWith('.md')),
];
const reqs = new Map(); // id -> {id,title,priority,file,feature,acs:[]}
const acIds = new Set();

for (const file of specFiles) {
  const text = readFileSync(file, 'utf8');
  const fm = frontMatter(text);
  if (!fm) { err(file, 'missing YAML front matter'); continue; }
  for (const key of ['id', 'title', 'status', 'version']) if (!fm[key]) err(file, `front matter missing "${key}"`);
  const prefix = fm['requirement-prefix'];
  const feature = fm.id;
  const lines = text.split('\n');
  let cur = null;
  const finish = () => {
    if (!cur) return;
    if (!cur.priority) err(file, `${cur.id}: missing "- **Priority:** P1|P2|P3" line`);
    if (!cur.ears) err(file, `${cur.id}: missing "- **EARS:**" line`);
    else if (!/\bSHALL\b/.test(cur.ears)) err(file, `${cur.id}: EARS statement must contain SHALL`);
    if (cur.acs.length === 0) err(file, `${cur.id}: no acceptance criteria (**${cur.id}-AC1** …)`);
    cur = null;
  };
  lines.forEach((line, i) => {
    const h = line.match(REQ_HEADING);
    if (h) {
      finish();
      const [, id, title] = h;
      if (reqs.has(id)) err(file, `duplicate requirement ID ${id} (also in ${relative(ROOT, reqs.get(id).file)})`);
      if (prefix && !id.startsWith(prefix + '-')) err(file, `${id}: does not match requirement-prefix ${prefix}`);
      if (!prefix && !id.startsWith('NFR-')) err(file, `${id}: NFR files must use NFR-* IDs`);
      cur = { id, title, file, feature, acs: [], priority: null, ears: null, line: i + 1 };
      reqs.set(id, cur);
      return;
    }
    if (/^#{1,3} /.test(line)) { finish(); return; }
    if (!cur) return;
    const pr = line.match(/\*\*Priority:\*\*\s*(P[123])/);
    if (pr) cur.priority = pr[1];
    const ears = line.match(/\*\*EARS:\*\*\s*(.+)$/);
    if (ears) cur.ears = ears[1];
    const ac = line.match(/\*\*((?:[A-Z][A-Z0-9]*-)+\d{3})-AC(\d+)\*\*/);
    if (ac) {
      const acId = `${ac[1]}-AC${ac[2]}`;
      if (ac[1] !== cur.id) err(file, `${acId} is listed under ${cur.id}`);
      if (acIds.has(acId)) err(file, `duplicate acceptance criterion ${acId}`);
      acIds.add(acId);
      cur.acs.push(acId);
    }
  });
  finish();
}

// ------------------------------------------------------------------ 2. contract cross-check (light YAML scan)
const contractPath = join(ROOT, 'sdd/contracts/openapi.yaml');
const ops = new Map(); // operationId -> [reqIds]
const reqToOps = new Map();
if (!existsSync(contractPath)) err(contractPath, 'contract not found');
else {
  const lines = readFileSync(contractPath, 'utf8').split('\n');
  let currentOp = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opm = line.match(/^\s+operationId:\s*([A-Za-z0-9_]+)/);
    if (opm) {
      currentOp = opm[1];
      if (ops.has(currentOp)) err(contractPath, `duplicate operationId ${currentOp}`);
      ops.set(currentOp, []);
      continue;
    }
    const xr = line.match(/^(\s+)x-requirements:\s*(.*)$/);
    if (xr && currentOp) {
      let ids = [];
      if (xr[2].startsWith('[')) ids = xr[2].replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      else {
        for (let j = i + 1; j < lines.length; j++) {
          const li = lines[j].match(/^\s+-\s+([A-Z0-9-]+)\s*$/);
          if (!li) break;
          ids.push(li[1]);
        }
      }
      ops.set(currentOp, ids);
      for (const id of ids) {
        if (!reqs.has(id)) err(contractPath, `${currentOp}: x-requirements references unknown ${id}`);
        if (!reqToOps.has(id)) reqToOps.set(id, []);
        reqToOps.get(id).push(currentOp);
      }
    }
  }
  for (const [op, ids] of ops) if (ids.length === 0) err(contractPath, `${op}: missing x-requirements`);
  // operationIds named in feature specs' "API operations" sections must exist
  for (const file of walk(join(ROOT, 'sdd/specs/features'), (p) => p.endsWith('spec.md'))) {
    const text = readFileSync(file, 'utf8');
    const sec = text.match(/^## \d+\. API operations\n([\s\S]*?)(?=\n## )/m);
    if (!sec) { warn(file, 'no "API operations" section'); continue; }
    for (const m of sec[1].matchAll(/`([a-z][A-Za-z0-9]+)`/g)) {
      if (!ops.has(m[1])) err(file, `API operation \`${m[1]}\` not found in sdd/contracts/openapi.yaml`);
    }
  }
}

// ------------------------------------------------------------------ 3. markdown link check
// site/ holds the website's sources: their links are site paths (../atlas/), checked by the site build, not here.
const mdFiles = walk(ROOT, (p) => p.endsWith('.md') && !p.includes(`${'/'}node_modules${'/'}`) && !relative(ROOT, p).startsWith(`site${'/'}`) && !relative(ROOT, p).startsWith(`_site${'/'}`));
for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const m of text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|computer:)/.test(target)) continue;
    if (!existsSync(resolve(dirname(file), target))) err(file, `broken link → ${target}`);
  }
}

// ------------------------------------------------------------------ 4. Bob configuration sanity
const modesFile = join(ROOT, '.bob/custom_modes.yaml');
if (existsSync(modesFile)) {
  const text = readFileSync(modesFile, 'utf8');
  const slugs = [...text.matchAll(/^\s+- slug:\s*([a-z0-9-]+)/gm)].map((m) => m[1]);
  const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dup.length) err(modesFile, `duplicate mode slugs: ${dup.join(', ')}`);
  for (const s of slugs) if (!existsSync(join(ROOT, `.bob/rules-${s}`))) warn(modesFile, `mode ${s} has no .bob/rules-${s}/ directory`);
  for (const m of text.matchAll(/fileRegex:\s*"([^"]+)"/g)) {
    try { new RegExp(m[1].replace(/\\\\/g, '\\')); } catch (e) { err(modesFile, `invalid fileRegex ${m[1]}: ${e.message}`); }
  }
}
const settingsFile = join(ROOT, '.bob/settings.json');
if (existsSync(settingsFile)) {
  try {
    const settings = JSON.parse(readFileSync(settingsFile, 'utf8'));
    for (const [evt, groups] of Object.entries(settings.hooks ?? {})) {
      for (const g of groups) for (const h of g.hooks ?? []) {
        const script = (h.command ?? '').match(/node\s+(\S+\.mjs)/)?.[1];
        if (script && !existsSync(join(ROOT, script))) err(settingsFile, `${evt} hook runs missing script ${script}`);
        if (g.matcher) { try { new RegExp(g.matcher === '*' ? '.*' : g.matcher); } catch (e) { err(settingsFile, `${evt} matcher invalid: ${e.message}`); } }
      }
    }
  } catch (e) { err(settingsFile, `invalid JSON: ${e.message}`); }
}
const approvalsFile = join(ROOT, 'sdd/state/approvals.json');
if (existsSync(approvalsFile)) { try { JSON.parse(readFileSync(approvalsFile, 'utf8')); } catch (e) { err(approvalsFile, `invalid JSON: ${e.message}`); } }
// External scan wiring (Article XI): SonarQube MCP must be read-only and token-free; scope file must exist.
const mcpFile = join(ROOT, '.bob/mcp.json');
if (existsSync(mcpFile)) {
  try {
    const servers = JSON.parse(readFileSync(mcpFile, 'utf8')).mcpServers ?? {};
    for (const [name, srv] of Object.entries(servers)) {
      for (const [k, v] of Object.entries({ ...(srv.env ?? {}), ...(srv.headers ?? {}) })) {
        if (/TOKEN|SECRET|PASSWORD|AUTHORIZATION/i.test(k) && !/^(Bearer )?\$\{env:[A-Z0-9_]+\}$/.test(String(v))) err(mcpFile, `${name}.${k} must reference an environment variable (\${env:NAME}), never a literal secret`);
      }
      if (/sonar/i.test(name) && String(srv.env?.SONARQUBE_READ_ONLY ?? srv.headers?.SONARQUBE_READ_ONLY) !== 'true') err(mcpFile, `${name}: SONARQUBE_READ_ONLY must be "true" (Bob may read findings, never change their status)`);
    }
  } catch (e) { err(mcpFile, `invalid JSON: ${e.message}`); }
}
const sonarProps = join(ROOT, 'sonar-project.properties');
if (!existsSync(sonarProps)) err(sonarProps, 'missing: it defines what SonarQube analyses (Article XI)');
else {
  const t = readFileSync(sonarProps, 'utf8');
  if (!/^sonar\.projectKey=\S+/m.test(t)) err(sonarProps, 'sonar.projectKey is required');
  if (/^\s*sonar\.issue\.ignore/m.test(t)) err(sonarProps, 'sonar.issue.ignore.* is not allowed; accepted risk is recorded in SonarQube (rule G8)');
  if (/^\s*sonar\.(token|login|password)\s*=/m.test(t)) err(sonarProps, 'credentials must come from SONAR_TOKEN in the environment');
}
for (const file of walk(join(ROOT, 'sdd/reports/scan'), (p) => p.endsWith('.json'))) {
  try { const ev = JSON.parse(readFileSync(file, 'utf8')); if (ev.producer !== 'sdd/scripts/scan.mjs') warn(file, 'not produced by sdd/scripts/scan.mjs — the step guard ignores it'); }
  catch (e) { err(file, `invalid JSON: ${e.message}`); }
}
for (const file of walk(join(ROOT, '.bob/skills'), (p) => p.endsWith('SKILL.md'))) {
  const fm = frontMatter(readFileSync(file, 'utf8'));
  if (!fm?.name || !fm?.description) err(file, 'SKILL.md needs name and description in front matter (Bob ignores skills without description)');
}

// ------------------------------------------------------------------ 5. screen inventory vs router (once code exists)
const routesTs = join(ROOT, 'apps/web/src/app/routes.ts');
if (existsSync(routesTs)) {
  const routerText = readFileSync(routesTs, 'utf8');
  const inv = readFileSync(join(ROOT, 'sdd/design/screen-inventory.md'), 'utf8');
  for (const m of inv.matchAll(/^\| `([^`]+)` \|/gm)) {
    if (m[1] !== '*' && !routerText.includes(`'${m[1]}'`) && !routerText.includes(`"${m[1]}"`)) warn(routesTs, `route ${m[1]} from screen inventory not found`);
  }
}

// ------------------------------------------------------------------ 6. traceability
let uncoveredStrict = [];
if (doTrace) {
  const testFiles = walk(ROOT, (p) => /\.(test|spec|int\.test)\.(t|j)sx?$/.test(p) && !p.includes('node_modules'));
  const reqTests = new Map();
  for (const file of testFiles) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\[((?:[A-Z][A-Z0-9]*-)+\d{3})\]/g)) {
      if (!reqs.has(m[1])) { warn(file, `test tag [${m[1]}] does not match any requirement`); continue; }
      if (!reqTests.has(m[1])) reqTests.set(m[1], new Set());
      reqTests.get(m[1]).add(relative(ROOT, file));
    }
  }
  const rows = [...reqs.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const by = { P1: [0, 0], P2: [0, 0], P3: [0, 0] };
  const body = rows.map((r) => {
    const tests = reqTests.get(r.id);
    const covered = Boolean(tests && tests.size);
    by[r.priority] && (by[r.priority][0]++, covered && by[r.priority][1]++);
    if (!covered && strict.includes(r.priority)) uncoveredStrict.push(r.id);
    const opsCell = (reqToOps.get(r.id) || []).map((o) => `\`${o}\``).join(', ') || '—';
    const testCell = covered ? [...tests].map((t) => `\`${t}\``).join('<br>') : '—';
    return `| ${r.id} | ${r.title.replace(/\|/g, '\\|')} | ${r.feature} | ${r.priority ?? '?'} | ${r.acs.length} | ${opsCell} | ${testCell} | ${covered ? '✅ Covered' : '⬜ Not covered'} |`;
  });
  const pct = (p) => (by[p][0] ? Math.round((100 * by[p][1]) / by[p][0]) : 0);
  const md = `# Traceability Matrix

> **Generated** by \`pnpm specs:trace\` (sdd/scripts/validate-specs.mjs). Do not edit by hand.
> A requirement is *Covered* when at least one test title contains its tag, e.g. \`[XFER-021]\`.

## Summary
| Priority | Requirements | Covered | % |
|---|---|---|---|
| P1 | ${by.P1[0]} | ${by.P1[1]} | ${pct('P1')} % |
| P2 | ${by.P2[0]} | ${by.P2[1]} | ${pct('P2')} % |
| P3 | ${by.P3[0]} | ${by.P3[1]} | ${pct('P3')} % |
| **Total** | **${rows.length}** | **${by.P1[1] + by.P2[1] + by.P3[1]}** | |

Acceptance criteria defined: **${acIds.size}** · Contract operations: **${ops.size}**

## Matrix
| Requirement | Title | Spec | Pri | ACs | Contract operations | Tests | Status |
|---|---|---|---|---|---|---|---|
${body.join('\n')}
`;
  writeFileSync(join(ROOT, 'sdd/traceability/matrix.md'), md);
}

// ------------------------------------------------------------------ report
const p = (n, w) => String(n).padStart(w);
console.log(`specs: ${p(specFiles.length, 3)} files · requirements: ${reqs.size} · acceptance criteria: ${acIds.size} · contract ops: ${ops.size}`);
for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
if (doTrace) console.log('sdd/traceability/matrix.md regenerated');
if (uncoveredStrict.length) console.log(`  ERROR strict: ${uncoveredStrict.length} ${strict.join('/')} requirement(s) without tests: ${uncoveredStrict.slice(0, 15).join(', ')}${uncoveredStrict.length > 15 ? ', …' : ''}`);
const failed = errors.length > 0 || uncoveredStrict.length > 0;
console.log(failed ? '✖ spec check failed' : '✔ spec check passed');
process.exit(failed ? 1 : 0);
