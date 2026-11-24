#!/usr/bin/env node
// The automation dial: risk tiers from sdd/governance/policy.json, and the organisation's locked human gates.
// Pure helpers (no imports from lib.mjs, so lib.mjs can use them) plus a small CLI:
//
//   node sdd/scripts/policy.mjs check            validate policy.json + approvers.json against the locked rules
//   node sdd/scripts/policy.mjs show [F##]       print the dial for every tier, or what applies to one feature
//
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = process.env.SDD_ROOT ? resolve(process.env.SDD_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const POLICY = 'sdd/governance/policy.json';
export const ROLES = ['business-owner', 'business-analyst', 'architect', 'developer', 'appsec'];
const ROLE_WORDS = { 'business-owner': 'business owner', 'business-analyst': 'business analyst', architect: 'architect', developer: 'developer', appsec: 'AppSec' };
export const roleWord = (r) => ROLE_WORDS[r] ?? r;
export const rolesText = (rs = []) => (rs.length ? rs.map(roleWord).join(' or ') : 'nobody (not configured)');

const FALLBACK = {
  defaultTier: 2,
  tiers: {
    1: { label: 'Critical', approve: { plan: ['business-owner'], phase: ['business-owner'] }, securityReview: 'required', bobAutonomy: 'step', release: { production: ['business-owner', 'appsec'] } },
    2: { label: 'Sensitive', approve: { plan: ['business-owner'], phase: ['business-owner'] }, securityReview: 'required', bobAutonomy: 'step', release: { production: ['business-owner'] } },
    3: { label: 'Standard', approve: { plan: ['business-owner'], phase: ['business-owner'] }, securityReview: 'optional', bobAutonomy: 'drive', release: { production: ['business-owner'] } },
  },
  features: {},
};

export function loadPolicy(path = join(ROOT, POLICY)) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return FALLBACK; }
}
export const parsePolicy = (text) => { try { return JSON.parse(text); } catch { return null; } };

export function tierOf(id, policy = loadPolicy()) {
  const t = policy.features?.[id] ?? policy.defaultTier ?? 2;
  return String(t);
}
export function tierInfo(id, policy = loadPolicy()) {
  const tier = tierOf(id, policy);
  return { tier, ...(policy.tiers?.[tier] ?? FALLBACK.tiers[tier] ?? FALLBACK.tiers[2]) };
}
export const securityReviewRequired = (id, policy) => tierInfo(id, policy).securityReview !== 'optional';
export const bobAutonomy = (id, policy) => tierInfo(id, policy).bobAutonomy ?? 'step';

// The strictest (lowest-numbered) tier among some features.
export function strictestTier(ids = [], policy = loadPolicy()) {
  const tiers = ids.map((id) => Number(tierOf(id, policy))).filter(Number.isFinite);
  return String(tiers.length ? Math.min(...tiers) : policy.defaultTier ?? 2);
}

// Which roles may give a decision. plan → the feature's tier; phase → the strictest tier in the phase;
// cr / waiver / revoke → approvers.json "decisions".
export function rolesFor(decision, target, { approvers = {}, policy = loadPolicy(), phaseFeatures = [] } = {}) {
  if (decision === 'plan' && /^F\d{2}$/.test(String(target))) return policy.tiers?.[tierOf(target, policy)]?.approve?.plan ?? approvers.decisions?.plan ?? ['business-owner'];
  if (decision === 'phase' && phaseFeatures.length) return policy.tiers?.[strictestTier(phaseFeatures, policy)]?.approve?.phase ?? approvers.decisions?.phase ?? ['business-owner'];
  return approvers.decisions?.[decision] ?? (decision === 'waiver' ? ['appsec'] : ['business-owner']);
}
export function releaseApprovers(ids = [], policy = loadPolicy()) {
  const tier = strictestTier(ids, policy);
  return { tier, roles: policy.tiers?.[tier]?.release?.production ?? ['business-owner'] };
}

// ------------------------------------------------------------------ identity (terminal path)
const lower = (s) => String(s ?? '').trim().toLowerCase();
export function gitEmail(cwd = ROOT) {
  try { return execSync('git config user.email', { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
}
export function personByEmail(email, approvers = {}) {
  if (!email) return null;
  const key = Object.keys(approvers.people ?? {}).find((k) => lower(approvers.people[k].email) === lower(email));
  return key ? { login: key, ...approvers.people[key] } : null;
}
export const trainingMode = (approvers = {}) => approvers.rules?.trainingMode === true;

// ------------------------------------------------------------------ the locked rules
export function validatePolicy(policy, approvers = {}) {
  const errors = [], warnings = [];
  const bad = (m) => errors.push(`Locked: ${m}`);
  if (!policy || typeof policy !== 'object') return { errors: ['policy.json is missing or not valid JSON'], warnings };
  const tiers = policy.tiers ?? {};
  for (const t of ['1', '2', '3']) if (!tiers[t]) errors.push(`tier ${t} is missing from policy.json`);
  for (const [t, cfg] of Object.entries(tiers)) {
    for (const d of ['plan', 'phase']) {
      const rs = cfg.approve?.[d] ?? [];
      if (!rs.length) bad(`tier ${t} ${d} sign-off has no human role. Every tier needs a person to sign the ${d}.`);
      const unknown = rs.filter((r) => !ROLES.includes(r));
      if (unknown.length) bad(`tier ${t} ${d} sign-off lists ${unknown.join(', ')}; only people sign (${ROLES.join(', ')}). Bob and pipelines never sign.`);
      if (rs.includes('developer')) bad(`tier ${t} lets the developer sign the ${d}. The maker is never the checker.`);
      if (t === '1' && (rs.length !== 1 || rs[0] !== 'business-owner')) bad(`tier 1 ${d} sign-off must be the business owner only (it is ${rolesText(rs)}).`);
    }
    if (!['required', 'optional'].includes(cfg.securityReview)) errors.push(`tier ${t} securityReview must be "required" or "optional"`);
    if (['1', '2'].includes(t) && cfg.securityReview !== 'required') bad(`tier ${t} must keep the hand security review ("securityReview": "required").`);
    if (!['step', 'drive'].includes(cfg.bobAutonomy)) errors.push(`tier ${t} bobAutonomy must be "step" or "drive"`);
    if (t === '1' && cfg.bobAutonomy !== 'step') bad('Bob runs tier 1 features one step at a time ("bobAutonomy": "step").');
    const rel = cfg.release?.production ?? [];
    if (!rel.length || rel.some((r) => !ROLES.includes(r))) bad(`tier ${t} release to production must name people (roles from approvers.json).`);
    if (t === '1' && new Set(rel).size < 2) bad('a tier 1 release to production needs two people with different roles.');
  }
  for (const [id, t] of Object.entries(policy.features ?? {})) {
    if (!/^F\d{2}$/.test(id)) errors.push(`features: "${id}" is not a feature id like F04`);
    if (!tiers[String(t)]) errors.push(`features: ${id} has tier ${t}, which is not defined`);
  }
  const dec = approvers.decisions ?? {};
  if (dec.waiver && (dec.waiver.length !== 1 || dec.waiver[0] !== 'appsec')) bad(`accepting a security risk is AppSec's decision only (approvers.json decisions.waiver is ${rolesText(dec.waiver)}).`);
  if (dec.cr && (!dec.cr.includes('business-owner') || dec.cr.includes('developer'))) bad(`change requests are decided by the business owner (approvers.json decisions.cr is ${rolesText(dec.cr)}).`);
  if (approvers.rules && approvers.rules.forbidSelfApproval === false) {
    if (trainingMode(approvers)) warnings.push('Training repository: people may sign their own work (rules.trainingMode). Never use this in a real repository.');
    else bad('nobody signs their own work (approvers.json rules.forbidSelfApproval must stay true outside a training repository).');
  }
  if (trainingMode(approvers)) warnings.push('rules.trainingMode is on: the pipeline still checks every rule, but allows one person to hold every role.');
  return { errors, warnings };
}

// ------------------------------------------------------------------ CLI
const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  const [cmd, arg] = process.argv.slice(2);
  const policy = loadPolicy();
  const approvers = existsSync(join(ROOT, 'sdd/governance/approvers.json')) ? JSON.parse(readFileSync(join(ROOT, 'sdd/governance/approvers.json'), 'utf8')) : {};
  if (cmd === 'check') {
    const { errors, warnings } = validatePolicy(policy, approvers);
    for (const w of warnings) console.log(`⚠ ${w}`);
    for (const e of errors) console.log(`✖ ${e}`);
    if (errors.length) process.exit(1);
    console.log('✔ policy check passed: every locked human gate is in place');
  } else if (cmd === 'show') {
    const ids = arg ? [arg] : null;
    const rows = Object.entries(policy.tiers ?? {}).map(([t, c]) => {
      const feats = Object.entries(policy.features ?? {}).filter(([, v]) => String(v) === t).map(([k]) => k).join(' ');
      return `Tier ${t} ${c.label} — ${c.means ?? ''}\n  plan signed by: ${rolesText(c.approve?.plan)} · phase signed by: ${rolesText(c.approve?.phase)}\n  hand security review: ${c.securityReview} · Bob: ${c.bobAutonomy === 'drive' ? 'may drive several steps, stops at every sign-off' : 'one step at a time'}\n  release to production approved by: ${(c.release?.production ?? []).map(roleWord).join(' and ')} · DAST: ${c.dast ?? '—'}\n  features: ${feats || '—'}`;
    });
    if (ids) {
      const i = tierInfo(arg, policy);
      console.log(`${arg} is tier ${i.tier} (${i.label}): ${i.means ?? ''}\n  plan signed by: ${rolesText(i.approve?.plan)}\n  hand security review: ${i.securityReview}\n  Bob: ${i.bobAutonomy === 'drive' ? 'may drive several steps, stops at every sign-off' : 'one step at a time'}\n  release to production approved by: ${(i.release?.production ?? []).map(roleWord).join(' and ')}`);
    } else console.log(rows.join('\n\n'));
  } else {
    console.error('usage: policy.mjs check | show [F##]');
    process.exit(2);
  }
}
