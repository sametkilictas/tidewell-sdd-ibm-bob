// Slash commands people type in pull-request comments. Pure parsing: no I/O.
//
//   Sign-offs (sdd-signoff.yml)                    Bob (bob-commands.yml)        Status (sdd-signoff.yml)
//   /approve-plan F04 [@<head-sha>]                /bob review                   /sdd status [F04]
//   /approve-phase 3 [@<head-sha>]                 /bob fix [F04] [what to do]
//   /approve-cr CR-002 [option A] [@<head-sha>]
//   /reject-cr CR-002 [reason …]
//   /accept-risk CVE-2026-12345 F03 until 2026-12-31 because <reason>
//   /revoke plan F04 | /revoke phase 3 | /revoke cr CR-002 | /revoke waiver CVE-2026-12345
//
// Only the first non-empty line is read, and it must start with the command: a command quoted in the middle
// of a discussion is never acted on.

const SHA = /^@([0-9a-f]{7,40})$/i;

export function firstLine(body) {
  return String(body ?? '').replace(/\r/g, '').split('\n').map((l) => l.trim()).find((l) => l) ?? '';
}

export function parseCommand(body) {
  const line = firstLine(body);
  if (!line.startsWith('/')) return null;
  const [cmd, ...args] = line.split(/\s+/);
  const sha = args.find((a) => SHA.test(a))?.match(SHA)[1].toLowerCase() ?? null;
  const words = args.filter((a) => !SHA.test(a));
  switch (cmd.toLowerCase()) {
    case '/approve-plan':
      return /^F\d{2}$/.test(words[0] ?? '') ? { name: 'approve-plan', kind: 'plan', target: words[0], sha } : { name: 'invalid', reason: 'usage: /approve-plan F04' };
    case '/approve-phase':
      return /^\d$/.test(words[0] ?? '') ? { name: 'approve-phase', kind: 'phase', target: words[0], sha } : { name: 'invalid', reason: 'usage: /approve-phase 3' };
    case '/approve-cr': {
      if (!/^CR-\d{3}$/.test(words[0] ?? '')) return { name: 'invalid', reason: 'usage: /approve-cr CR-002 option A' };
      const i = words.findIndex((w) => /^option$/i.test(w));
      const option = i >= 0 ? words[i + 1] ?? null : null;
      return { name: 'approve-cr', kind: 'cr', target: words[0], decision: 'approved', option, sha };
    }
    case '/reject-cr':
      return /^CR-\d{3}$/.test(words[0] ?? '')
        ? { name: 'reject-cr', kind: 'cr', target: words[0], decision: 'rejected', reason: words.slice(1).join(' ') || null, sha }
        : { name: 'invalid', reason: 'usage: /reject-cr CR-002 <reason>' };
    case '/accept-risk': {
      const m = line.match(/^\/accept-risk\s+(\S+)\s+(F\d{2})\s+until\s+(\d{4}-\d{2}-\d{2})\s+because\s+(.+)$/i);
      return m ? { name: 'accept-risk', kind: 'waiver', target: m[1], feature: m[2], expires: m[3], reason: m[4].trim() }
        : { name: 'invalid', reason: 'usage: /accept-risk CVE-2026-12345 F03 until 2026-12-31 because <why the risk is acceptable>' };
    }
    case '/revoke': {
      const what = (words[0] ?? '').toLowerCase();
      return ['plan', 'phase', 'cr', 'waiver'].includes(what) && words[1]
        ? { name: 'revoke', kind: 'revoke', what, target: words[1] }
        : { name: 'invalid', reason: 'usage: /revoke plan F04 (or phase 3, cr CR-002, waiver CVE-…)' };
    }
    case '/sdd':
      return (words[0] ?? '').toLowerCase() === 'status' ? { name: 'status', feature: /^F\d{2}$/.test(words[1] ?? '') ? words[1] : null } : null;
    case '/bob': {
      const sub = (words[0] ?? '').toLowerCase();
      if (sub === 'review') return { name: 'bob-review' };
      if (sub === 'fix') {
        const feature = /^F\d{2}$/.test(words[1] ?? '') ? words[1] : null;
        const instructions = line.replace(/^\/bob\s+fix\s*/i, '').replace(/^F\d{2}\b\s*/, '').trim();
        return { name: 'bob-fix', feature, instructions: instructions || null };
      }
      return { name: 'invalid', reason: 'usage: /bob review | /bob fix [F04] [what to change]' };
    }
    default:
      return null;
  }
}

// The decision a sign-off command stands for (used to check a stored record against its comment).
export function decisionOf(cmd) {
  if (!cmd || !cmd.kind || cmd.kind === 'revoke') return null;
  return cmd.kind;
}

export const isSignoff = (cmd) => Boolean(cmd && ['approve-plan', 'approve-phase', 'approve-cr', 'reject-cr', 'accept-risk', 'revoke'].includes(cmd.name));
