#!/usr/bin/env python3
"""End-to-end run of the kit's GitHub workflows on a local "GitHub": a bare origin repository, fake `gh`,
fake GitHub REST API and fake Bob Shell, driven by runner.py. Each scenario plays what people and GitHub do
(push, open a pull request, comment) and checks what the workflows did (replies, commits, checks).
Nothing leaves the machine: no network, no tokens, no real GitHub or Bob. See README.md.

  python3 sdd/tests/github-e2e/e2e.py [path to the pack]      (default: this repository)
"""
import json, os, shutil, subprocess, sys, time, datetime, pathlib, re, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from runner import Runner
import fakeapi

KIT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parents[3]).resolve()
HERE = pathlib.Path(__file__).parent.resolve()
ROOT = pathlib.Path(tempfile.mkdtemp(prefix='sdd-e2e-'))
REPO = 'acme/tidewell-bank'
TOKEN = 'fake-actions-token'
VERBOSE = os.environ.get('E2E_VERBOSE') == '1'

shutil.rmtree(ROOT, ignore_errors=True)
ROOT.mkdir(parents=True)
ORIGIN = ROOT / 'origin.git'
STATE = ROOT / 'gh-state.json'
HOME = ROOT / 'home'; HOME.mkdir()
GITCFG = ROOT / 'gitconfig'
GITCFG.write_text(f"""[user]
\tuseConfigOnly = true
[init]
\tdefaultBranch = main
[protocol "file"]
\tallow = always
[advice]
\tdetachedHead = false
[url "file://{ORIGIN}"]
\tinsteadOf = https://x-access-token:{TOKEN}@github.com/{REPO}.git
""")
json.dump({'repo': REPO, 'origin': str(ORIGIN), 'prs': {}, 'comments': [], 'reactions': [], 'dispatches': [], 'runs': [],
           'next_id': 1000, 'log': []}, open(STATE, 'w'))
srv, API = fakeapi.serve(str(STATE), REPO)

for f in ('gh', 'bob'):
    os.chmod(HERE / 'fakes' / f, 0o755)
ENV = {
    'PATH': f"{HERE / 'fakes'}:{os.path.dirname(shutil.which('node'))}:/usr/local/bin:/usr/bin:/bin", 'HOME': str(HOME), 'LANG': 'C.UTF-8',
    'GIT_CONFIG_GLOBAL': str(GITCFG), 'GIT_CONFIG_NOSYSTEM': '1', 'FAKE_GH_STATE': str(STATE), 'GITHUB_API_URL': API,
}
LOG = []
def log(line):
    LOG.append(line)
    if VERBOSE: print(line)
runner = Runner(str(ORIGIN), REPO, ENV, log=log)

def sh(*a, cwd=None, env=None, check=True, input=None):
    e = dict(ENV); e.update(env or {})
    p = subprocess.run(a, cwd=cwd, env=e, capture_output=True, text=True, input=input)
    if check and p.returncode:
        raise RuntimeError(f'{" ".join(map(str, a))} failed:\n{p.stdout}{p.stderr}')
    return p.stdout.strip()

def st():
    return json.load(open(STATE))
def st_save(s):
    json.dump(s, open(STATE, 'w'), indent=1)
def now():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
def tick():
    time.sleep(1.1)   # GitHub timestamps have one-second resolution

RESULTS = []
def check(cond, label, detail=''):
    RESULTS.append((bool(cond), label))
    print(f"  {'✔' if cond else '✖'} {label}" + (f'\n      {detail}' if (detail and not cond) else ''))

# ------------------------------------------------------------------------------------------------ the people
DEV = ROOT / 'dev'
def dev(*a, check=True, env=None):
    return sh('git', '-C', str(DEV), *a, check=check, env=env)
def origin(*a):
    return sh('git', '--git-dir', str(ORIGIN), *a)
def tip(branch):
    return origin('rev-parse', f'refs/heads/{branch}')

def push(branch, gates=False):
    """A person pushes: GitHub runs sdd-gates on the push (a check suite on the new tip)."""
    dev('push', '-q', '--force-with-lease', 'origin', f'HEAD:refs/heads/{branch}')
    sha = tip(branch)
    s = st(); s['runs'].append({'event': 'push', 'head_branch': branch, 'head_sha': sha, 'created_at': now()}); st_save(s)
    if gates:
        return run_gates(branch, 'push')
    return None

def open_pr(number, branch, author, title, draft=False):
    s = st(); s['prs'][str(number)] = {'title': title, 'author': author, 'headRefName': branch, 'state': 'OPEN', 'draft': draft}; st_save(s)

def comment(pr, login, body, association='MEMBER', user_type='User'):
    s = st(); s['next_id'] += 1; cid = s['next_id']
    c = {'id': cid, 'issue': pr, 'user': {'login': login, 'type': user_type}, 'author_association': association, 'body': body,
         'created_at': now(), 'html_url': f'https://github.com/{REPO}/pull/{pr}#issuecomment-{cid}'}
    s['comments'].append(c); st_save(s)
    p = s['prs'][str(pr)]
    return {'action': 'created', 'comment': c,
            'issue': {'number': pr, 'pull_request': {'url': f'https://api.github.com/repos/{REPO}/pulls/{pr}'}, 'user': {'login': p['author']}, 'state': 'open'},
            'repository': {'full_name': REPO, 'default_branch': 'main'}, 'sender': c['user']}

def replies(pr):
    return [c for c in st()['comments'] if c['issue'] == pr and c['user']['login'] == 'github-actions[bot]']
def last_reply(pr):
    r = replies(pr)
    return r[-1]['body'] if r else ''

# ------------------------------------------------------------------------------------------------ GitHub's side
WF = lambda name: str(KIT / '.github' / 'workflows' / name)   # GitHub runs the workflow file of the default branch
def wf_main(name):
    """issue_comment workflows run from the default branch: use origin/main's copy of the file."""
    path = ROOT / f'main-{name}'
    path.write_text(origin('show', f'refs/heads/main:.github/workflows/{name}'))
    return str(path)

def run_gates(branch, event, pr=None, jobs=('sdd-policy', 'signoffs')):
    sha = tip(branch)
    if event == 'push':
        ev = {'ref': f'refs/heads/{branch}', 'before': '0' * 40, 'after': sha, 'repository': {'full_name': REPO, 'default_branch': 'main'}}
        ref = f'refs/heads/{branch}'
    elif event == 'workflow_dispatch':
        ev = {'ref': f'refs/heads/{branch}', 'inputs': {}, 'repository': {'full_name': REPO, 'default_branch': 'main'}}
        ref = f'refs/heads/{branch}'
    else:  # pull_request: GitHub prepares refs/pull/N/merge
        tmp = ROOT / 'merge'; shutil.rmtree(tmp, ignore_errors=True)
        sh('git', 'clone', '-q', str(ORIGIN), str(tmp))
        sh('git', '-C', str(tmp), 'checkout', '-q', '--detach', 'origin/main')
        sh('git', '-C', str(tmp), '-c', 'user.name=GitHub', '-c', 'user.email=noreply@github.com', 'merge', '-q', '--no-ff', '-m', f'Merge {sha} into {tip("main")}', sha)
        merge = sh('git', '-C', str(tmp), 'rev-parse', 'HEAD')
        sh('git', '-C', str(tmp), 'push', '-q', 'origin', f'{merge}:refs/pull/{pr}/merge', f'{sha}:refs/pull/{pr}/head', '-f')
        p = st()['prs'][str(pr)]
        ev = {'action': 'synchronize', 'number': pr, 'pull_request': {'number': pr, 'draft': p.get('draft', False), 'head': {'sha': sha, 'ref': branch, 'repo': {'full_name': REPO}},
              'base': {'ref': 'main', 'sha': tip('main')}, 'user': {'login': p['author']}}, 'repository': {'full_name': REPO, 'default_branch': 'main'}}
        ref, sha = f'refs/pull/{pr}/merge', merge
    out = {}
    for job in jobs:
        out[job] = runner.run_job(WF('sdd-gates.yml'), job, event, ev, sha=sha, ref=ref, secrets={'GITHUB_TOKEN': TOKEN})
    return out

def handle_dispatches(seen):
    """sdd-signoff / bob-commands start sdd-gates with `gh workflow run` after they push."""
    s = st(); res = []
    for d in s['dispatches'][seen:]:
        res.append(run_gates(d['ref'], 'workflow_dispatch'))
    return res, len(s['dispatches'])

def on_comment(event, secrets=None, variables=None, hooks=None):
    """GitHub runs every issue_comment workflow of the default branch; each job's `if:` decides."""
    seen = len(st()['dispatches'])
    secrets = dict(secrets or {}); secrets['GITHUB_TOKEN'] = TOKEN
    runner.hooks = hooks or {}
    main_sha = tip('main')
    r1 = runner.run_job(wf_main('sdd-signoff.yml'), 'signoff', 'issue_comment', event, sha=main_sha, ref='refs/heads/main', secrets=secrets, variables=variables)
    r2 = runner.run_job(wf_main('bob-commands.yml'), 'bob', 'issue_comment', event, sha=main_sha, ref='refs/heads/main', secrets=secrets, variables=variables)
    runner.hooks = {}
    gates, _ = handle_dispatches(seen)
    return r1, r2, gates

def gates_ok(results, jobs=('sdd-policy', 'signoffs')):
    return all(r[j]['status'] == 'success' for r in results for j in jobs) and len(results) > 0

def log_tail(n=60):
    return '\n'.join(LOG[-n:])

# ================================================================================================ setup
print('Setup: origin, the pack on main, a phase pull request')
sh('git', 'init', '-q', '--bare', '-b', 'main', str(ORIGIN))
origin('config', 'uploadpack.allowAnySHA1InWant', 'true')
sh('git', 'clone', '-q', str(ORIGIN), str(DEV))
dev('config', 'user.name', 'Dan Dev'); dev('config', 'user.email', 'dan@example.com')
for item in KIT.iterdir():
    if item.name in ('.git', 'node_modules', '.sdd-ci'):
        continue
    (shutil.copytree if item.is_dir() else shutil.copy2)(item, DEV / item.name)
# The scenarios start from the pack as shipped: nothing signed yet.
json.dump({'version': 1, 'plans': {}, 'phases': {}, 'changeRequests': {}, 'waivers': {}}, open(DEV / 'sdd/state/approvals.json', 'w'), indent=2)
for junk in ('sdd/state/active-step.json', 'sdd/state/history.jsonl'):
    (DEV / junk).unlink(missing_ok=True)
appr = json.load(open(DEV / 'sdd/governance/approvers.json'))
appr['approvalChannel'] = 'github'
appr['people'] = {'olivia-owner': {'name': 'Olivia Owner', 'roles': ['business-owner']},
                  'dan-dev': {'name': 'Dan Dev', 'roles': ['developer']},
                  'ari-arch': {'name': 'Ari Architect', 'roles': ['architect']},
                  'sam-sec': {'name': 'Sam AppSec', 'roles': ['appsec']}}
json.dump(appr, open(DEV / 'sdd/governance/approvers.json', 'w'), indent=2)
dev('add', '-A'); dev('commit', '-q', '-m', 'chore: import SDD pack')
dev('push', '-q', 'origin', 'HEAD:refs/heads/main')
dev('config', 'core.hooksPath', 'sdd/scripts/hooks')
dev('switch', '-q', '-c', 'phase/0-foundation')
(DEV / 'docs').mkdir(exist_ok=True); (DEV / 'docs/phase-0.md').write_text('# Phase 0 kickoff\n')
dev('add', '-A'); dev('commit', '-q', '-m', 'docs: phase 0 kickoff notes')
g = push('phase/0-foundation', gates=True)
open_pr(1, 'phase/0-foundation', 'dan-dev', 'Phase 0 — Foundation', draft=True)
check(g['sdd-policy']['status'] == 'success' and g['signoffs']['status'] == 'success', 'push: sdd-policy and signoffs pass on the new phase branch', log_tail())
g = run_gates('phase/0-foundation', 'pull_request', pr=1)
check(g['sdd-policy']['status'] == 'success' and g['signoffs']['status'] == 'success', 'pull request: sdd-policy and signoffs pass (merge ref)', log_tail())
check('Feature' in g['sdd-policy']['summary'] or 'F00' in g['sdd-policy']['summary'], 'sdd-policy writes the workflow status to the job summary', g['sdd-policy']['summary'][:300])

# ================================================================================================ sign-offs
print('\nSign-offs as comments')
tick()
on_comment(comment(1, 'dan-dev', '/sdd status F00'))
check('F00' in last_reply(1) and '⏸' in last_reply(1), '/sdd status F00 answers with the workflow table (plan sign-off ⏸)', last_reply(1)[:400])
check(any(r['content'] == 'rocket' for r in st()['reactions']), 'status reply gets a 🚀 reaction')

n_main_before = tip('phase/0-foundation')
on_comment(comment(1, 'dan-dev', '/approve-plan F00'))
check('cannot sign plans' in last_reply(1) and tip('phase/0-foundation') == n_main_before, 'developer cannot sign a plan; nothing is committed', last_reply(1))

on_comment(comment(1, 'olivia-owner', '/approve-plan F00', association='NONE'))
check('not a member or collaborator' in last_reply(1), 'a non-member is refused', last_reply(1))

on_comment(comment(1, 'renovate[bot]', '/approve-plan F00', association='NONE', user_type='Bot'))
check('Bots and automation' in last_reply(1), 'a bot is refused', last_reply(1))

on_comment(comment(1, 'olivia-owner', 'LGTM.\n/approve-plan F00'))
check(not last_reply(1).startswith('✔'), 'a command not on the first line is not recorded', last_reply(1))

on_comment(comment(1, 'olivia-owner', '/approve-plan F00 @0000000'))
check('you signed @0000000' in last_reply(1), 'a pinned @sha that is not the head is refused', last_reply(1))

# Race 1: the developer pushes after the owner commented, with a back-dated commit
tick()
ev = comment(1, 'olivia-owner', '/approve-plan F00')
tick()
(DEV / 'docs/phase-0.md').write_text('# Phase 0 kickoff\n\nChanged after the owner looked.\n')
dev('commit', '-q', '-am', 'docs: tweak notes', env={'GIT_COMMITTER_DATE': '2020-01-01T00:00:00Z', 'GIT_AUTHOR_DATE': '2020-01-01T00:00:00Z'})
push('phase/0-foundation')
before = tip('phase/0-foundation')
on_comment(ev)
check('changed after your comment' in last_reply(1) and tip('phase/0-foundation') == before,
      'a push after the comment is caught even with a back-dated commit (server time, not committer date)', last_reply(1))

# Race 2: the branch moves while the sign-off is being recorded
tick()
ev = comment(1, 'olivia-owner', '/approve-plan F00')
def move_branch():
    dev('pull', '-q', '--rebase', 'origin', 'phase/0-foundation')
    (DEV / 'docs/phase-0.md').write_text('# Phase 0 kickoff\n\nMoved during the recording.\n')
    dev('commit', '-q', '-am', 'docs: concurrent change')
    push('phase/0-foundation')
r1, _, _ = on_comment(ev, hooks={'Push to the pull request branch (fails safely if the branch moved meanwhile)': move_branch})
check('branch changed while the sign-off was being recorded' in last_reply(1) and r1['status'] == 'failure',
      'if the branch moves during recording, the push is refused and the owner is told', last_reply(1))
check(origin('log', '-1', '--format=%an', 'refs/heads/phase/0-foundation') == 'Dan Dev', 'the branch keeps the concurrent change, no sign-off commit')

# The real sign-off
tick()
head_before = tip('phase/0-foundation')
r1, r2, gates = on_comment(comment(1, 'olivia-owner', f'/approve-plan F00 @{head_before[:7]}'))
new = tip('phase/0-foundation')
files = origin('diff-tree', '--no-commit-id', '--name-only', '-r', new).split()
msg = origin('log', '-1', '--format=%an|%ae|%s', new)
check(last_reply(1).startswith('✔ **Signed by Olivia Owner (@olivia-owner)**'), 'the owner signs the plan with a comment', last_reply(1)[:300] + '\n' + log_tail(30))
check(files == ['sdd/state/approvals.json'] and msg.startswith('github-actions[bot]|41898282+github-actions[bot]') and 'chore(SDD): approve plan F00' in msg,
      'the sign-off is one bot commit containing only approvals.json', f'{files} {msg}')
rec = json.loads(origin('show', f'{new}:sdd/state/approvals.json'))['plans'].get('F00', {})
check(rec.get('via') == 'github-comment' and rec.get('github', {}).get('login') == 'olivia-owner' and rec.get('sha256') and rec.get('specSha256'),
      'the record is bound to plan.md and spec.md hashes and to the comment', json.dumps(rec)[:300])
check(len(gates) == 1 and gates_ok(gates), 'sdd-gates is dispatched on the new head and passes (sdd-policy, signoffs)', log_tail(40))
check(r2['status'] == 'skipped', 'bob-commands ignores sign-off comments')
check(any(r['content'] == '+1' for r in st()['reactions']), 'the comment gets a 👍')

# ================================================================================================ forged sign-offs
print('\nForged sign-offs')
dev('pull', '-q', '--ff-only', 'origin', 'phase/0-foundation')
a = json.load(open(DEV / 'sdd/state/approvals.json'))
a['plans']['F01'] = dict(a['plans']['F00'])
json.dump(a, open(DEV / 'sdd/state/approvals.json', 'w'), indent=2)
dev('commit', '-q', '-am', 'chore(SDD): approve plan F01')
g = push('phase/0-foundation', gates=True)
err = '\n'.join(LOG[-40:])
check(g['sdd-policy']['status'] == 'success', 'the commit policy alone lets a hand-made approvals commit through (one file, scope SDD)')
check(g['signoffs']['status'] == 'failure' and 'does not say /approve-plan F01' in err, 'signoffs fails: the cited comment says F00, not F01', err)
dev('revert', '--no-edit', 'HEAD')
g = push('phase/0-foundation', gates=True)
check(g['sdd-policy']['status'] == 'success' and g['signoffs']['status'] == 'success', 'after git revert, both checks pass again', log_tail(30))

a = json.load(open(DEV / 'sdd/state/approvals.json'))
a['plans']['F01'] = {k: v for k, v in a['plans']['F00'].items() if k not in ('via', 'github')}
json.dump(a, open(DEV / 'sdd/state/approvals.json', 'w'), indent=2)
dev('commit', '-q', '-am', 'chore(SDD): approve plan F01')
g = push('phase/0-foundation', gates=True)
check(g['signoffs']['status'] == 'failure' and 'recorded in a terminal' in '\n'.join(LOG[-30:]), 'a terminal-style record fails in a comments-only repository', log_tail(30))
dev('revert', '--no-edit', 'HEAD'); push('phase/0-foundation')

# ================================================================================================ Bob
print('\nBob on the pull request')
tick()
before = tip('phase/0-foundation')
on_comment(comment(1, 'olivia-owner', '/bob fix F00 add the health endpoint'))
check('may ask Bob to push fixes' in last_reply(1) and tip('phase/0-foundation') == before, 'the owner is not in bob.fixRoles: /bob fix refused', last_reply(1))

on_comment(comment(1, 'dan-dev', '/bob fix F00 add the health endpoint'))
check('BOB_API_KEY' in last_reply(1) and tip('phase/0-foundation') == before, 'without BOB_API_KEY Bob does not run and says why', last_reply(1))

KEY = {'BOB_API_KEY': 'bob-test-key'}
ENV['FAKE_BOB'] = 'fix-in-scope'
r1, r2, gates = on_comment(comment(1, 'dan-dev', '/bob fix F00 add the health endpoint'), secrets=KEY)
after = tip('phase/0-foundation')
bob_commits = origin('log', '--format=%an|%s', f'{before}..{after}').splitlines()
call = st()['bob_calls'][-1]
check(r2['status'] == 'success' and len(bob_commits) == 2 and all(c.startswith('IBM Bob (for @dan-dev)|') for c in bob_commits),
      '/bob fix: Bob commits test-first and the workflow pushes them', f'{bob_commits}\n{log_tail(60)}')
check(call['mode'] == 'spec-builder' and '--disable-mcp' in call['flags'] and '--trust' in call['flags'] and call['max_cost'] == '8' and call['hooks_path'] == 'sdd/scripts/hooks',
      'Bob ran as spec-builder with --disable-mcp, the fix cost cap and the commit hook active', json.dumps(call)[:300])
check(len(gates) == 1 and gates_ok(gates), 'sdd-gates runs again on Bob\'s commits and passes', log_tail(40))
check('Scenario fix-in-scope' in last_reply(1) and 'Nothing was pushed' not in last_reply(1), 'Bob\'s summary is posted on the pull request', last_reply(1)[:400])

for scenario, label in (('fix-out-of-scope', 'Bob edits an approved spec (hook bypassed)'), ('fix-signoff-message', 'a Bob commit message poses as a sign-off')):
    ENV['FAKE_BOB'] = scenario
    before = tip('phase/0-foundation')
    r1, r2, gates = on_comment(comment(1, 'dan-dev', '/bob fix F00 something'), secrets=KEY)
    check(tip('phase/0-foundation') == before and 'Nothing was pushed' in last_reply(1) and not gates,
          f'{label}: the scope check stops it, nothing is pushed', last_reply(1)[-300:] + '\n' + log_tail(25))

ENV['FAKE_BOB'] = 'fix-dirty'
before = tip('phase/0-foundation')
on_comment(comment(1, 'dan-dev', '/bob fix F00 something'), secrets=KEY)
pushed = origin('diff', '--name-only', before, tip('phase/0-foundation')).split()
check('apps/api/src/scratch.ts' not in pushed and 'apps/api/src/health.ts' in pushed, 'uncommitted leftovers are dropped; only commits go out', str(pushed))

ENV['FAKE_BOB'] = 'fix-none'
before = tip('phase/0-foundation')
on_comment(comment(1, 'dan-dev', '/bob fix F00 nothing to do'), secrets=KEY)
check(tip('phase/0-foundation') == before and 'Bob made no commits' in last_reply(1), 'no commits: nothing pushed, and the reply says so', last_reply(1)[-200:])

ENV['FAKE_BOB'] = 'review'
n = len(replies(1))
on_comment(comment(1, 'olivia-owner', '/bob review'), secrets=KEY)
sticky = [c for c in replies(1) if c['body'].startswith('<!-- sdd-bob-review -->')]
call = st()['bob_calls'][-1]
check(len(sticky) == 1 and 'changes requested' in sticky[0]['body'], '/bob review posts one sticky review comment', last_reply(1)[:300])
check(call['mode'] == 'sdd-pr-reviewer' and call['max_cost'] == '3', 'the review runs in the read-only reviewer mode with the review cost cap', json.dumps(call)[:200])
on_comment(comment(1, 'olivia-owner', '/bob review'), secrets=KEY)
sticky = [c for c in replies(1) if c['body'].startswith('<!-- sdd-bob-review -->')]
check(len(sticky) == 1 and sticky[0].get('updated_at') and 'updated above' in last_reply(1), 'a second review updates the same sticky comment', last_reply(1))

# bob-review.yml on pull_request (ready for review)
s = st(); s['prs']['1']['draft'] = False; st_save(s)
tip_sha = tip('phase/0-foundation')
ev = {'action': 'ready_for_review', 'number': 1, 'pull_request': {'number': 1, 'draft': False, 'head': {'sha': tip_sha, 'ref': 'phase/0-foundation', 'repo': {'full_name': REPO}},
      'base': {'ref': 'main'}, 'user': {'login': 'dan-dev'}}, 'repository': {'full_name': REPO, 'default_branch': 'main'}}
r = runner.run_job(WF('bob-review.yml'), 'review', 'pull_request', ev, sha=tip_sha, ref='refs/pull/1/merge', secrets={**KEY, 'GITHUB_TOKEN': TOKEN})
sticky = [c for c in replies(1) if c['body'].startswith('<!-- sdd-bob-review -->')]
check(r['status'] == 'success' and len(sticky) == 1 and tip_sha[:12] in sticky[0]['body'], 'bob-review.yml updates the sticky review for the new head', log_tail(30))
call = st()['bob_calls'][-1]
ev2 = dict(ev); ev2['pull_request'] = dict(ev['pull_request'], draft=True)
r = runner.run_job(WF('bob-review.yml'), 'review', 'pull_request', ev2, sha=tip_sha, ref='refs/pull/1/merge', secrets={**KEY, 'GITHUB_TOKEN': TOKEN})
check(r['status'] == 'skipped', 'drafts get no automatic review')
ev3 = dict(ev); ev3['pull_request'] = dict(ev['pull_request'], head={'sha': tip_sha, 'ref': 'x', 'repo': {'full_name': 'mallory/tidewell-bank'}})
r = runner.run_job(WF('bob-review.yml'), 'review', 'pull_request', ev3, sha=tip_sha, ref='refs/pull/1/merge', secrets={**KEY, 'GITHUB_TOKEN': TOKEN})
check(r['status'] == 'skipped', 'fork pull requests are skipped')

# A pull request that changes Bob's own config
print('\nA pull request that changes Bob\'s configuration')
dev('switch', '-q', '-c', 'chore/bob-config', 'origin/main')
with open(DEV / '.bob/custom_modes.yaml', 'a') as fh: fh.write('\n# tweak\n')
dev('commit', '-q', '-am', 'chore(SDD): tweak Bob modes')
push('chore/bob-config')
open_pr(2, 'chore/bob-config', 'dan-dev', 'Tweak Bob modes (F00)')
ENV['FAKE_BOB'] = 'fix-in-scope'
n_calls = len(st().get('bob_calls', []))
before = tip('chore/bob-config')
on_comment(comment(2, 'dan-dev', '/bob fix F00 anything'), secrets=KEY)
check(tip('chore/bob-config') == before and len(st().get('bob_calls', [])) == n_calls, 'Bob does not run on a pull request that changes .bob/', log_tail(20))
check('changes .bob' in last_reply(2) or "Bob's own configuration" in last_reply(2), 'the reply says why (Bob\'s own configuration)', last_reply(2))
ENV['FAKE_BOB'] = 'review'
on_comment(comment(2, 'dan-dev', '/bob review'), secrets=KEY)
call = st()['bob_calls'][-1]
check(call['mode'] == 'sdd-pr-reviewer', 'a review still runs on it, with the default branch\'s .bob/ (restore)')

# Phase gate, revoke, fork
print('\nPhase gate, revoke, forks')
dev('switch', '-q', 'phase/0-foundation'); dev('pull', '-q', '--ff-only', 'origin', 'phase/0-foundation')
on_comment(comment(1, 'olivia-owner', '/approve-phase 0'))
check('not done' in last_reply(1) and '--force' not in last_reply(1), 'phase sign-off refused while F00 is not done, without terminal-only advice', last_reply(1))
before = tip('phase/0-foundation')
r1, _, gates = on_comment(comment(1, 'olivia-owner', '/revoke plan F00'))
a = json.loads(origin('show', f'{tip("phase/0-foundation")}:sdd/state/approvals.json'))
check('F00' not in a['plans'] and last_reply(1).startswith('✔ **Revoked by'), '/revoke plan F00 removes the record', last_reply(1))
check(len(gates) == 1 and gates[0]['signoffs']['status'] == 'success' and gates[0]['sdd-policy']['status'] == 'failure' and 'G3 F00 plan is unapproved' in log_tail(60),
      'after the revoke, F00\'s code in the pull request is blocked (G3) until the plan is signed again', log_tail(40))
tick()
r1, _, gates = on_comment(comment(1, 'olivia-owner', '/approve-plan F00'))
check(last_reply(1).startswith('✔ **Signed by') and gates_ok(gates), 're-signing the plan unblocks it (Bob\'s commits count as already reviewed content)', last_reply(1)[:300] + log_tail(20))
# GitHub's clock unavailable → refuse; no push record → commit date, with a warning
tick()
on_comment(comment(1, 'olivia-owner', '/revoke plan F00'))
s = st(); s['fail_runs'] = True; st_save(s)
tick()
before = tip('phase/0-foundation')
on_comment(comment(1, 'olivia-owner', '/approve-plan F00'))
check('could not confirm when this pull request last changed' in last_reply(1) and tip('phase/0-foundation') == before,
      'if GitHub cannot say when the branch last changed, the sign-off is refused', last_reply(1))
s = st(); s['fail_runs'] = False; s['runs'] = []; st_save(s)
on_comment(comment(1, 'olivia-owner', '/approve-plan F00'))
check(last_reply(1).startswith('✔ **Signed by') and 'commit date was used' in last_reply(1) and '/approve-plan F00 @<sha>' in last_reply(1),
      'with no push record, the commit date is used and the reply recommends pinning the commit', last_reply(1)[:500])
on_comment(comment(1, 'olivia-owner', f'/approve-plan F00 @{tip("phase/0-foundation")[:7]}'))
s = st(); s['prs']['3'] = {'title': 'from a fork', 'author': 'mallory', 'headRefName': 'phase/0-foundation', 'state': 'OPEN', 'isCrossRepository': True}; st_save(s)
on_comment(comment(3, 'olivia-owner', '/approve-plan F00'))
check('not forks' in last_reply(3), 'sign-offs are refused on fork pull requests', last_reply(3))

ok = sum(1 for c, _ in RESULTS if c); bad = [l for c, l in RESULTS if not c]
print(f"\n{'✔' if not bad else '✖'} {ok} passed, {len(bad)} failed")
open(ROOT / 'run.log', 'w').write('\n'.join(LOG))
print(f'Full log: {ROOT / "run.log"}')
srv.shutdown()
sys.exit(1 if bad else 0)
