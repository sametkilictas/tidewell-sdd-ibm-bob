"""A small local runner for the kit's GitHub Actions workflows.

It runs one job of a workflow the way a GitHub-hosted runner would, closely enough to exercise the shell steps
and the scripts end to end: expressions (${{ }}), step `if:` with implicit success(), job/step env, outputs
(GITHUB_OUTPUT, multi-line too), GITHUB_ENV/GITHUB_PATH, step summaries, actions/checkout (git init + fetch from
a local "origin" with the same refspecs and depth as checkout@v4), no-op setup actions, and local composite
actions. GitHub itself (the REST API, `gh`, Bob Shell) is replaced by fakes on PATH, see e2e.py.
"""
import json, os, re, shutil, subprocess, tempfile, uuid, glob, hashlib, pathlib
try:
    import yaml
except ImportError:
    raise SystemExit('The workflow runner needs PyYAML: pip install pyyaml')

# ---------------------------------------------------------------------------------------------- expressions

class Ctx(dict):
    """Case-insensitive property access, like GitHub contexts."""

def _get(obj, key):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for k, v in obj.items():
            if isinstance(k, str) and k.lower() == str(key).lower():
                return v
        return None
    if isinstance(obj, list) and isinstance(key, (int, float)):
        i = int(key)
        return obj[i] if 0 <= i < len(obj) else None
    return None

TOK = re.compile(r"\s*(?:(?P<str>'(?:[^']|'')*')|(?P<num>-?\d+(?:\.\d+)?)|(?P<op>==|!=|<=|>=|&&|\|\||[()\[\],.!<>])|(?P<id>[A-Za-z_][A-Za-z0-9_\-]*))")

def tokenize(s):
    out, i = [], 0
    while i < len(s):
        m = TOK.match(s, i)
        if not m or m.end() == i:
            if s[i:].strip() == '':
                break
            raise ValueError(f'bad expression near: {s[i:]!r}')
        i = m.end()
        for kind in ('str', 'num', 'op', 'id'):
            if m.group(kind) is not None:
                out.append((kind, m.group(kind)))
    return out

def truthy(v):
    if v is None or v is False:
        return False
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return v != 0
    if isinstance(v, str):
        return v != ''
    return True

def to_num(v):
    if v is None: return 0
    if isinstance(v, bool): return 1 if v else 0
    if isinstance(v, (int, float)): return v
    if isinstance(v, str):
        t = v.strip()
        if t == '': return 0
        try: return float(t)
        except ValueError: return float('nan')
    return float('nan')

def eq(a, b):
    if isinstance(a, str) and isinstance(b, str):
        return a.lower() == b.lower()
    if type(a) == type(b) and not isinstance(a, (str, int, float)):
        return a == b if not isinstance(a, (dict, list)) else a is b
    return to_num(a) == to_num(b)

def to_str(v):
    if v is None: return ''
    if v is True: return 'true'
    if v is False: return 'false'
    if isinstance(v, float) and v.is_integer(): return str(int(v))
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (dict, list)): return json.dumps(v)
    return str(v)

class Parser:
    def __init__(self, tokens, env):
        self.t, self.i, self.env = tokens, 0, env
    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)
    def take(self, val=None):
        tok = self.peek()
        if val is not None and tok[1] != val:
            raise ValueError(f'expected {val}, got {tok}')
        self.i += 1
        return tok
    def parse(self):
        v = self.or_()
        if self.i != len(self.t):
            raise ValueError(f'trailing tokens: {self.t[self.i:]}')
        return v
    def or_(self):
        v = self.and_()
        while self.peek()[1] == '||':
            self.take(); r = self.and_()
            v = v if truthy(v) else r
        return v
    def and_(self):
        v = self.eq()
        while self.peek()[1] == '&&':
            self.take(); r = self.eq()
            v = r if truthy(v) else v
        return v
    def eq(self):
        v = self.rel()
        while self.peek()[1] in ('==', '!='):
            op = self.take()[1]; r = self.rel()
            v = eq(v, r) if op == '==' else not eq(v, r)
        return v
    def rel(self):
        v = self.unary()
        while self.peek()[1] in ('<', '>', '<=', '>='):
            op = self.take()[1]; r = self.unary()
            a, b = to_num(v), to_num(r)
            v = {'<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b}[op]
        return v
    def unary(self):
        if self.peek()[1] == '!':
            self.take(); return not truthy(self.unary())
        return self.postfix()
    def postfix(self):
        v = self.primary()
        while self.peek()[1] in ('.', '['):
            if self.take()[1] == '.':
                v = _get(v, self.take()[1])
            else:
                k = self.or_(); self.take(']')
                v = _get(v, k)
        return v
    def primary(self):
        kind, val = self.take()
        if kind == 'str':
            return val[1:-1].replace("''", "'")
        if kind == 'num':
            return float(val)
        if val == '(':
            v = self.or_(); self.take(')'); return v
        if kind == 'id':
            low = val.lower()
            if low == 'true': return True
            if low == 'false': return False
            if low == 'null': return None
            if self.peek()[1] == '(':
                self.take('(')
                args = []
                while self.peek()[1] != ')':
                    args.append(self.or_())
                    if self.peek()[1] == ',': self.take(',')
                self.take(')')
                return self.env['__call__'](low, args)
            return _get(self.env, val)
        raise ValueError(f'unexpected token {val!r}')

STATUS_FUNCS = re.compile(r'\b(always|success|failure|cancelled)\s*\(', re.I)

def evaluate(expr, env):
    return Parser(tokenize(expr), env).parse()

def interpolate(text, env):
    if not isinstance(text, str):
        return text
    def rep(m):
        return to_str(evaluate(m.group(1), env))
    return re.sub(r'\$\{\{(.*?)\}\}', rep, text, flags=re.S)

def condition(cond, env):
    if cond is None:
        cond = 'success()'
    if isinstance(cond, bool):
        return cond
    cond = str(cond).strip()
    m = re.fullmatch(r'\$\{\{(.*)\}\}', cond, flags=re.S)
    if m:
        cond = m.group(1)
    if not STATUS_FUNCS.search(cond):
        cond = f'success() && ({cond})'
    return truthy(evaluate(cond, env))

# ---------------------------------------------------------------------------------------------- the runner

def parse_output_file(path):
    out = {}
    if not os.path.exists(path):
        return out
    lines = open(path, encoding='utf-8').read().split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r'^([^=<]+)<<(.+)$', line)
        if m:
            key, delim, buf = m.group(1), m.group(2), []
            i += 1
            while i < len(lines) and lines[i] != delim:
                buf.append(lines[i]); i += 1
            out[key] = '\n'.join(buf)
        elif '=' in line:
            k, v = line.split('=', 1)
            out[k] = v
        i += 1
    return out


class Runner:
    def __init__(self, origin, repo, base_env, log=print, hooks=None):
        self.origin, self.repo, self.base_env, self.log = origin, repo, base_env, log
        self.hooks = hooks or {}

    # actions/checkout@v4, emulated with the same git commands (init, fetch from origin, checkout).
    def checkout(self, ws, with_, github):
        dest = os.path.join(ws, with_.get('path') or '')
        os.makedirs(dest, exist_ok=True)
        depth = int(str(with_.get('fetch-depth', 1) or 0))
        ref = with_.get('ref') or ''
        g = lambda *a: subprocess.run(['git', '-C', dest, *a], check=True, capture_output=True, text=True, env=self.git_env()).stdout.strip()
        g('init', '-q')
        g('remote', 'add', 'origin', f'https://github.com/{self.repo}')
        src = 'file://' + self.origin
        og = lambda *a: subprocess.run(['git', '--git-dir', self.origin, *a], check=True, capture_output=True, text=True).stdout.strip()
        def heads():
            return dict(reversed(l.split()) for l in og('for-each-ref', '--format=%(objectname) %(refname)', 'refs/heads').splitlines() if l)
        event_name = github['event_name']
        if not ref:
            if event_name == 'pull_request':
                ref = github['ref']                      # refs/pull/N/merge
            else:
                ref = github['sha']
                branch = github['ref_name'] if github['ref'].startswith('refs/heads/') else None
                if branch:
                    ref = f'refs/heads/{branch}'
        dfl = ['--depth=1'] if depth > 0 else []
        if depth == 0:
            g('fetch', '-q', '--prune', src, '+refs/heads/*:refs/remotes/origin/*', '+refs/tags/*:refs/tags/*')
        if re.fullmatch(r'[0-9a-f]{40}', ref):
            if subprocess.run(['git', '-C', dest, 'cat-file', '-e', f'{ref}^{{commit}}'], capture_output=True).returncode != 0:
                g('fetch', '-q', '--no-tags', *dfl, src, f'+{ref}:refs/tmp/checkout')
                subprocess.run(['git', '-C', dest, 'update-ref', '-d', 'refs/tmp/checkout'], capture_output=True)
            g('checkout', '-q', '--force', ref)
        elif ref.startswith('refs/pull/'):
            n = ref.split('/')[2]
            g('fetch', '-q', '--no-tags', *dfl, src, f'+{ref}:refs/remotes/pull/{n}/merge')
            g('checkout', '-q', '--force', f'refs/remotes/pull/{n}/merge')
        else:
            branch = ref[len('refs/heads/'):] if ref.startswith('refs/heads/') else ref
            if depth != 0:
                g('fetch', '-q', '--no-tags', '--depth=1', src, f'+refs/heads/{branch}:refs/remotes/origin/{branch}')
            g('checkout', '-q', '--force', '-B', branch, f'refs/remotes/origin/{branch}')
        return True

    def git_env(self):
        e = dict(self.base_env)
        return e

    def run_script(self, script, shell, cwd, env, name):
        fd, path = tempfile.mkstemp(suffix='.sh', dir=env['RUNNER_TEMP'])
        with os.fdopen(fd, 'w') as fh:
            fh.write(script)
        cmd = ['bash', '-e', path] if not shell else ['bash', '--noprofile', '--norc', '-eo', 'pipefail', path]
        p = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True)
        out = (p.stdout + p.stderr).rstrip()
        self.log(f'    $ {name}  → exit {p.returncode}' + (('\n' + '\n'.join('      ' + l for l in out.splitlines()[-40:])) if out else ''))
        return p.returncode

    def run_steps(self, steps, ctx, ws, env_job, step_ctx, job_state, inputs=None, composite=False):
        for idx, step in enumerate(steps):
            sid = step.get('id') or f'__step{idx}'
            name = step.get('name') or step.get('uses') or (step.get('run') or '').split('\n')[0][:60]
            expr_env = self.expr_env(ctx, step_ctx, job_state, inputs, ws)
            if not condition(step.get('if'), expr_env):
                step_ctx[sid] = {'outputs': {}, 'outcome': 'skipped', 'conclusion': 'skipped'}
                self.log(f'    - skip  {name}')
                continue
            if name in self.hooks:
                self.hooks[name]()
            out_file = os.path.join(ctx['runner']['temp'], f'out-{uuid.uuid4().hex}')
            open(out_file, 'w').close()
            env = dict(self.base_env)
            env.update(job_state['env_extra'])
            env.update({k: to_str(interpolate(v, expr_env)) for k, v in env_job.items()})
            env.update({k: to_str(interpolate(v, expr_env)) for k, v in (step.get('env') or {}).items()})
            env['GITHUB_OUTPUT'] = out_file
            env['PATH'] = ':'.join(job_state['path_extra'] + [env['PATH']])
            outputs = {}
            if 'uses' in step:
                uses = step['uses']
                with_ = {k: to_str(interpolate(v, expr_env)) for k, v in (step.get('with') or {}).items()}
                if uses.startswith('actions/checkout@'):
                    try:
                        self.checkout(ws, with_, ctx['github']); code = 0
                        self.log(f'    ✓ checkout {with_.get("ref") or "(event ref)"} → {with_.get("path") or "."}')
                    except subprocess.CalledProcessError as e:
                        self.log(f'    ✗ checkout failed: {e.stderr}'); code = 1
                elif uses.startswith(('actions/setup-node@', 'actions/setup-go@', 'actions/upload-artifact@')):
                    code = 0
                    self.log(f'    ✓ {uses} (no-op)')
                elif uses.startswith('./'):
                    code, outputs = self.run_composite(os.path.join(ws, uses[2:]), with_, ctx, ws, job_state)
                else:
                    raise RuntimeError(f'unsupported action {uses}')
            else:
                script = interpolate(step['run'], expr_env)
                cwd = os.path.join(ws, interpolate(step.get('working-directory', ''), expr_env) or '')
                code = self.run_script(script, step.get('shell'), cwd, env, name)
                outputs = parse_output_file(out_file)
            # GITHUB_ENV / GITHUB_PATH written by the step
            for k, v in parse_output_file(env['GITHUB_ENV']).items():
                job_state['env_extra'][k] = v
            open(env['GITHUB_ENV'], 'w').close()
            if os.path.exists(env['GITHUB_PATH']):
                for line in open(env['GITHUB_PATH']).read().splitlines():
                    if line.strip(): job_state['path_extra'].insert(0, line.strip())
                open(env['GITHUB_PATH'], 'w').close()
            outcome = 'success' if code == 0 else 'failure'
            conclusion = 'success' if (code == 0 or step.get('continue-on-error')) else 'failure'
            step_ctx[sid] = {'outputs': outputs, 'outcome': outcome, 'conclusion': conclusion}
            if conclusion == 'failure':
                job_state['failed'] = True
        return step_ctx

    def run_composite(self, path, with_, ctx, ws, job_state):
        action = yaml.safe_load(open(os.path.join(path, 'action.yml')))
        inputs = {}
        for k, spec in (action.get('inputs') or {}).items():
            inputs[k] = with_.get(k, to_str((spec or {}).get('default', '')))
            if (spec or {}).get('required') and k not in with_:
                raise RuntimeError(f'composite input {k} is required')
        self.log(f'    ▸ composite {os.path.relpath(path, ws)} (inputs: ' + ', '.join(f'{k}={"***" if "key" in k else v}' for k, v in inputs.items()) + ')')
        steps_ctx = {}
        failed_before = job_state['failed']
        self.run_steps(action['runs']['steps'], ctx, ws, {}, steps_ctx, job_state, inputs=inputs, composite=True)
        expr_env = self.expr_env(ctx, steps_ctx, job_state, inputs, ws)
        outs = {k: to_str(interpolate(v.get('value'), expr_env)) for k, v in (action.get('outputs') or {}).items()}
        code = 1 if job_state['failed'] and not failed_before else 0
        return code, outs

    def expr_env(self, ctx, steps_ctx, job_state, inputs, ws):
        env = Ctx(ctx)
        env['steps'] = steps_ctx
        env['job'] = {'status': 'failure' if job_state['failed'] else 'success'}
        if inputs is not None:
            env['inputs'] = inputs
        def call(fn, args):
            if fn == 'always': return True
            if fn == 'success': return not job_state['failed']
            if fn == 'failure': return job_state['failed']
            if fn == 'cancelled': return False
            if fn == 'startswith': return to_str(args[0]).lower().startswith(to_str(args[1]).lower())
            if fn == 'endswith': return to_str(args[0]).lower().endswith(to_str(args[1]).lower())
            if fn == 'contains':
                if isinstance(args[0], list): return any(eq(x, args[1]) for x in args[0])
                return to_str(args[1]).lower() in to_str(args[0]).lower()
            if fn == 'tojson': return json.dumps(args[0], indent=2)
            if fn == 'fromjson': return json.loads(to_str(args[0]))
            if fn == 'format':
                s = to_str(args[0])
                for i, a in enumerate(args[1:]): s = s.replace('{%d}' % i, to_str(a))
                return s
            if fn == 'hashfiles':
                files = sorted(f for pat in args for f in glob.glob(os.path.join(ws, to_str(pat)), recursive=True) if os.path.isfile(f))
                if not files: return ''
                h = hashlib.sha256()
                for f in files: h.update(hashlib.sha256(open(f, 'rb').read()).digest())
                return h.hexdigest()
            raise ValueError(f'unsupported function {fn}')
        env['__call__'] = call
        return env

    def run_job(self, workflow_file, job_id, event_name, event, *, sha, ref, secrets=None, variables=None, extra_env=None):
        wf = yaml.safe_load(open(workflow_file))
        job = wf['jobs'][job_id]
        root = tempfile.mkdtemp(prefix=f'wf-{job_id}-')
        ws, temp = os.path.join(root, 'ws'), os.path.join(root, 'tmp')
        os.makedirs(ws); os.makedirs(temp)
        event_path = os.path.join(root, 'event.json')
        json.dump(event, open(event_path, 'w'))
        ref_name = ref.split('/', 2)[2] if ref.startswith('refs/heads/') else (ref.split('/')[2] + '/merge' if ref.startswith('refs/pull/') else ref)
        github = {
            'event': event, 'event_name': event_name, 'repository': self.repo, 'server_url': 'https://github.com',
            'run_id': '4242', 'workspace': ws, 'sha': sha, 'ref': ref, 'ref_name': ref_name,
            'base_ref': event.get('pull_request', {}).get('base', {}).get('ref', '') if event_name == 'pull_request' else '',
            'head_ref': event.get('pull_request', {}).get('head', {}).get('ref', '') if event_name == 'pull_request' else '',
            'repository_owner': self.repo.split('/')[0], 'action_path': '',
        }
        secrets = dict(secrets or {})
        secrets.setdefault('GITHUB_TOKEN', 'fake-actions-token')
        ctx = Ctx({'github': github, 'runner': {'temp': temp, 'os': 'Linux'}, 'secrets': secrets, 'vars': variables or {}, 'env': {}})
        summary = os.path.join(root, 'summary.md'); open(summary, 'w').close()
        envf = os.path.join(root, 'github_env'); open(envf, 'w').close()
        pathf = os.path.join(root, 'github_path'); open(pathf, 'w').close()
        base = dict(self.base_env)
        base.update({
            'CI': 'true', 'GITHUB_ACTIONS': 'true', 'GITHUB_WORKSPACE': ws, 'RUNNER_TEMP': temp, 'GITHUB_EVENT_PATH': event_path,
            'GITHUB_EVENT_NAME': event_name, 'GITHUB_REPOSITORY': self.repo, 'GITHUB_SHA': sha, 'GITHUB_REF': ref,
            'GITHUB_REF_NAME': ref_name, 'GITHUB_BASE_REF': github['base_ref'], 'GITHUB_HEAD_REF': github['head_ref'],
            'GITHUB_SERVER_URL': 'https://github.com', 'GITHUB_RUN_ID': '4242', 'GITHUB_STEP_SUMMARY': summary,
            'GITHUB_ENV': envf, 'GITHUB_PATH': pathf, 'RUNNER_OS': 'Linux',
        })
        base.update(extra_env or {})
        saved = self.base_env
        self.base_env = base
        job_state = {'failed': False, 'env_extra': {}, 'path_extra': []}
        try:
            expr_env = self.expr_env(ctx, {}, job_state, None, ws)
            if not condition(job.get('if'), expr_env):
                self.log(f'  ◦ job {job_id} skipped (if: false)')
                return {'status': 'skipped', 'steps': {}, 'summary': '', 'temp': temp, 'ws': ws}
            self.log(f'  ▶ job {job_id} ({event_name})')
            env_job = dict(wf.get('env') or {}); env_job.update(job.get('env') or {})
            steps = self.run_steps(job['steps'], ctx, ws, env_job, {}, job_state)
            status = 'failure' if job_state['failed'] else 'success'
            self.log(f'  {"✔" if status == "success" else "✖"} job {job_id}: {status}')
            return {'status': status, 'steps': steps, 'summary': open(summary).read(), 'temp': temp, 'ws': ws}
        finally:
            self.base_env = saved
