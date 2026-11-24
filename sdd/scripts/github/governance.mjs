// Who may sign what, and who may ask Bob to act, from sdd/governance/approvers.json. Pure functions.
// The caller always passes the approver list read from a trusted revision (the default branch, or the pull
// request's base), never the pull request's own copy.

import { rolesFor } from '../policy.mjs';

const lower = (s) => String(s ?? '').toLowerCase();

export function personOf(login, approvers) {
  const key = Object.keys(approvers?.people ?? {}).find((k) => lower(k) === lower(login));
  return key ? { login: key, ...approvers.people[key] } : null;
}

export const isPlaceholder = (login) => /^REPLACE_ME_/i.test(login);
export function configured(approvers) {
  const logins = Object.keys(approvers?.people ?? {});
  return logins.length > 0 && logins.some((l) => !isPlaceholder(l));
}
export const isBot = (login, type) => type === 'Bot' || /\[bot\]$/i.test(String(login ?? ''));

const DECISION_LABEL = { plan: 'sign plans', phase: 'sign phases', cr: 'decide change requests', waiver: 'accept dependency risk', revoke: 'revoke sign-offs' };

// Can this GitHub user give this sign-off? Returns { ok, reason, person, roles }.
export function authorizeSignoff({ login, association, userType, decision, target, approvers, policy, phaseFeatures = [], prAuthor }) {
  const no = (reason) => ({ ok: false, reason });
  if (isBot(login, userType)) return no('Sign-offs come from people. Bots and automation (Bob included) cannot sign.');
  if (!['github', 'both'].includes(approvers?.approvalChannel)) return no('This repository takes sign-offs in a terminal (sdd/governance/approvers.json → "approvalChannel"), not in comments.');
  if (!configured(approvers)) return no('sdd/governance/approvers.json still lists only REPLACE_ME_ placeholders. An SDD approver must add real GitHub logins first.');
  const allowed = approvers.rules?.allowedAssociations ?? ['OWNER', 'MEMBER', 'COLLABORATOR'];
  if (!allowed.includes(association)) return no(`@${login} is not a member or collaborator of this repository (association: ${association ?? 'unknown'}).`);
  const person = personOf(login, approvers);
  if (!person) return no(`@${login} is not listed in sdd/governance/approvers.json.`);
  // Plans and phases: the feature's risk tier decides (sdd/governance/policy.json); the rest: approvers.json decisions.
  const need = rolesFor(decision, target, { approvers, ...(policy ? { policy } : {}), phaseFeatures });
  const roles = person.roles ?? [];
  if (!roles.some((r) => need.includes(r))) {
    return no(`@${login} (${roles.join(', ') || 'no role'}) cannot ${DECISION_LABEL[decision] ?? decision}. That needs: ${need.join(' or ') || 'nobody is configured'}.`);
  }
  if ((approvers.rules?.forbidSelfApproval ?? true) && prAuthor && lower(prAuthor) === lower(login) && decision !== 'revoke') {
    return no(`@${login} opened this pull request, so they cannot also sign it (sdd/governance/approvers.json → rules.forbidSelfApproval). Another approver signs.`);
  }
  return { ok: true, person, roles };
}

// May this user ask Bob to review (any member/collaborator) or push fixes (bob.fixRoles)?
export function authorizeBob({ login, association, userType, action, approvers }) {
  const no = (reason) => ({ ok: false, reason });
  if (isBot(login, userType)) return no('Bob commands come from people, not bots.');
  const allowed = approvers?.rules?.allowedAssociations ?? ['OWNER', 'MEMBER', 'COLLABORATOR'];
  if (!allowed.includes(association)) return no(`@${login} is not a member or collaborator of this repository.`);
  if (action === 'review') return { ok: true };
  if (!configured(approvers)) return no('sdd/governance/approvers.json still lists only REPLACE_ME_ placeholders, so nobody may ask Bob to push fixes yet.');
  const person = personOf(login, approvers);
  const roles = person?.roles ?? [];
  const need = approvers?.bob?.fixRoles ?? ['developer'];
  if (!roles.some((r) => need.includes(r))) return no(`Only ${need.join(' or ')} may ask Bob to push fixes (sdd/governance/approvers.json → bob.fixRoles); @${login} is ${roles.join(', ') || 'not listed'}.`);
  return { ok: true, person };
}
