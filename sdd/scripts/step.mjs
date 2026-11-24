#!/usr/bin/env node
// Start / finish an SDD step. Every SDD slash command calls this first and last.
//
//   node sdd/scripts/step.mjs start <clarify|plan|tasks|implement|scan|verify|secure|apply-cr> <F##|CR-###> --mode <slug> [--task T012]
//   node sdd/scripts/step.mjs finish [--outcome done|blocked|interrupted] [--note "..."]
//   node sdd/scripts/step.mjs show
//
// Exit 0 = allowed/started; exit 1 = refused (the message tells the user which mode/command is right).

import { checkStart, loadActive, saveJson, appendHistory, ACTIVE, STEPS, MODES, gitUser } from './lib.mjs';
import { rmSync, existsSync } from 'node:fs';

const [, , verb, ...rest] = process.argv;
const opt = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')));

function refuse(msg) {
  console.log(`⛔ SDD step refused: ${msg}`);
  process.exit(1);
}

if (verb === 'start') {
  const [step, target] = positional;
  const mode = opt('mode');
  if (!step || !target || !mode) refuse('usage: step.mjs start <step> <F##|CR-###> --mode <mode-slug> [--task T0NN]');
  const active = loadActive();
  if (active && !(active.step === step && active.target === target && active.mode === mode)) {
    if (!rest.includes('--switch')) {
      refuse(`another step is active: "${active.step} ${active.target}" in ${MODES[active.mode]?.name ?? active.mode} (since ${active.startedAt}). ` +
        `Finish it first (node sdd/scripts/step.mjs finish --outcome interrupted) or re-run with --switch.`);
    }
    appendHistory({ event: 'finish', ...active, outcome: 'interrupted', by: gitUser() });
  }
  const res = checkStart(step, target, mode);
  if (!res.ok) refuse(res.reason);
  const record = { step, target, mode, task: opt('task') ?? null, startedAt: new Date().toISOString(), by: gitUser() };
  saveJson(ACTIVE, record);
  appendHistory({ event: 'start', ...record });
  console.log(`✅ SDD step started: ${step} ${target}${record.task ? ' ' + record.task : ''} in ${MODES[mode].name}. Writes are now limited to this step's scope.`);
  process.exit(0);
}

if (verb === 'finish') {
  const active = loadActive();
  if (!active) { console.log('No active SDD step.'); process.exit(0); }
  const outcome = opt('outcome') ?? 'done';
  appendHistory({ event: 'finish', ...active, outcome, note: opt('note') ?? null, by: gitUser() });
  if (existsSync(ACTIVE)) rmSync(ACTIVE);
  const def = STEPS[active.step];
  console.log(`🏁 SDD step finished: ${active.step} ${active.target} (${outcome}). Run "node sdd/scripts/state.mjs" or ask 🧭 SDD Navigator for the next step.${def ? '' : ''}`);
  process.exit(0);
}

if (verb === 'show' || !verb) {
  const a = loadActive();
  console.log(a ? JSON.stringify(a, null, 2) : 'No active SDD step.');
  process.exit(0);
}

refuse(`unknown verb "${verb}" (use start | finish | show)`);
