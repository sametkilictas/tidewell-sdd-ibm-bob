// What a sign-off records, and when it is refused. Shared by the two ways a person signs:
//   - sdd/scripts/approve.mjs ............ interactive terminal (approvalChannel "terminal" or "both")
//   - sdd/scripts/github/signoff.mjs ..... a verified pull-request comment (approvalChannel "github" or "both")
// Pure decisions over the files on disk: nothing here writes, prompts or talks to GitHub. Bob's hook refuses
// any command that names this file, approve.mjs or sdd/scripts/github/.

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { featureById, fileHash, exists, read, frontMatter, projectState, crCovers, ROOT } from './lib.mjs';

const ok = (record, extra = {}) => ({ ok: true, record, ...extra });
const no = (reason) => ({ ok: false, reason });

// Plan sign-off: binds plan.md AND spec.md (spec lock). After a spec change it needs a change request approved
// since the previous sign-off that lists the spec under "affects", or an explicit, recorded override.
export function planDecision(approvals, target, { override } = {}) {
  const f = featureById(target ?? '');
  if (!f) return no(`unknown feature ${target}`);
  const p = `${f.dir}/plan.md`;
  if (!exists(p)) return no(`${p} does not exist yet — the plan must be written (📐 /sdd-plan ${f.id}) before it can be signed`);
  const text = read(p);
  const fm = frontMatter(text);
  const failing = text.split('\n').filter((l) => /\|\s*(I|II|III|IV|V|VI|VII|VIII|IX|X) /.test(l)).filter((l) => l.includes('❌') || !/✅/.test(l));
  const specP = `${f.dir}/spec.md`;
  const specHash = fileHash(specP);
  const prev = approvals.plans?.[f.id];
  let crs = [];
  if (prev?.specSha256 && prev.specSha256 !== specHash) {
    crs = Object.entries(approvals.changeRequests || {})
      .filter(([, r]) => r.decision === 'APPROVED' && r.at > prev.at && crCovers(r.affects, specP)).map(([id]) => id);
    if (!crs.length && !override) {
      return no(`${specP} changed since this plan was approved (${prev.at.slice(0, 10)}, by ${prev.by}) and no change request approved since then lists ${f.id} under "affects". ` +
        'Raise one (/sdd-change-request), or, if you knowingly accept an uncontrolled requirement change, re-run with --override "<reason>" (it is recorded).');
    }
  }
  const record = {
    file: p, sha256: fileHash(p), specFile: specP, specSha256: specHash, version: fm.version ?? null,
    ...(crs.length ? { crs } : {}), ...(override ? { override } : {}),
  };
  return ok(record, {
    feature: f,
    warnings: failing.length ? [`Constitution check rows not marked ✅:\n  ${failing.join('\n  ')}`] : [],
    crs,
    summary: `Plan ${p} (version ${fm.version ?? '?'}) for ${f.id} — ${f.title}.\nIt also locks the requirements it implements:\n  plan.md  SHA-256 ${record.sha256}\n  spec.md  SHA-256 ${specHash}\nAny later edit to either file voids this sign-off.`,
  });
}

// Phase sign-off: phases are signed in order, and only when every feature of the phase is done (or forced
// with a documented waiver — terminal only).
export function phaseDecision(approvals, target, { force = false } = {}) {
  const n = String(Number(target));
  if (n === 'NaN' || target === undefined || target === '') return no('phase number required');
  const s = projectState();
  if (Number(n) !== s.phase) return no(`the current phase is ${s.phase}; phases are approved in order`);
  const notDone = s.inPhase.filter((f) => f.state !== 'done');
  if (notDone.length && !force) return no(`features not done: ${notDone.map((f) => `${f.id} (${f.state})`).join(', ')}. Every feature of the phase must be done first.`);
  return ok({ ...(force ? { forced: true } : {}) }, { phase: n, summary: `Phase ${n} gate. Confirm you reviewed the checklist in sdd/specs/92-delivery-plan.md and saw the demo.` });
}

export function findChangeRequest(id) {
  const dir = join(ROOT, 'sdd/specs/change-requests');
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((n) => n.startsWith(`${id}-`) && n.endsWith('.md'));
  return file ? `sdd/specs/change-requests/${file}` : null;
}

export function crDecision(approvals, target, { decision, option } = {}) {
  if (!/^CR-\d{3}$/.test(target ?? '')) return no('change request ID like CR-002 required');
  const p = findChangeRequest(target);
  if (!p) return no(`no sdd/specs/change-requests/${target}-*.md`);
  const d = String(decision ?? '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(d)) return no('--decision approved|rejected is required');
  const fm = frontMatter(read(p));
  return ok({ file: p, sha256: fileHash(p), decision: d, option: option ?? null, affects: fm.affects ?? '' },
    { summary: `${d} ${p}: ${fm.title ?? ''}\nOption: ${option ?? '(none)'}\nAffects: ${fm.affects ?? '?'}` });
}

// Accepting a dependency vulnerability is a human risk decision (Article XI.3, NFR-SEC-044). Waivers expire
// (max 90 days) so accepted risk is re-examined.
export function waiverDecision(approvals, target, { feature, reason = '', expires = '', today = new Date() } = {}) {
  if (!/^(CVE-\d{4}-\d{4,}|GHSA-[\w]{4}-[\w]{4}-[\w]{4}|[A-Z]{2,10}-[\w.-]{3,40})$/.test(target ?? '')) return no('waiver needs a vulnerability ID such as CVE-2026-12345 or GHSA-xxxx-xxxx-xxxx');
  if (!featureById(feature ?? '')) return no('--feature F## is required (the feature whose scan found it)');
  if (reason.trim().length < 15) return no('--reason must explain why the risk is acceptable (e.g. not reachable, dev-only, fix not yet available)');
  const day = today.toISOString().slice(0, 10);
  const max = new Date(today.getTime() + 90 * 864e5).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || expires <= day || expires > max) return no(`--expires YYYY-MM-DD must be after ${day} and no later than ${max}`);
  return ok({ feature, reason: reason.trim(), expires },
    { summary: `Accept the risk of ${target} for ${feature} until ${expires}?\nReason: ${reason.trim()}\nThis lets the scan pass while the vulnerability is present.` });
}

export const BUCKET = { plan: 'plans', phase: 'phases', cr: 'changeRequests', waiver: 'waivers' };

// Applies a decision to the approvals object (returns a new object).
export function applyDecision(approvals, kind, target, record) {
  const next = structuredClone(approvals);
  next.plans ??= {}; next.phases ??= {}; next.changeRequests ??= {}; next.waivers ??= {};
  if (kind === 'revoke') { delete next[BUCKET[target.what]][target.id]; return next; }
  const key = kind === 'phase' ? String(Number(target)) : target;
  next[BUCKET[kind]][key] = record;
  return next;
}
