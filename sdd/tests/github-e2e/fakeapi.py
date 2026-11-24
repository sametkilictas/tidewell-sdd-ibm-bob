"""Fake GitHub REST API (the few endpoints the kit's scripts call with fetch), backed by the fake gh state file."""
import json, threading, re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

def serve(state_path, repo):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass
        def send(self, code, obj):
            body = json.dumps(obj).encode()
            self.send_response(code)
            self.send_header('content-type', 'application/json')
            self.send_header('content-length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def do_GET(self):
            s = json.load(open(state_path))
            s.setdefault('api_calls', []).append(self.path)
            json.dump(s, open(state_path, 'w'), indent=1)
            if not (self.headers.get('authorization') or '').startswith('Bearer '):
                return self.send(401, {'message': 'Requires authentication'})
            m = re.fullmatch(rf'/repos/{re.escape(repo)}/issues/comments/(\d+)', self.path)
            if m:
                c = next((c for c in s['comments'] if c['id'] == int(m.group(1))), None)
                return self.send(200, c) if c else self.send(404, {'message': 'Not Found'})
            m = re.fullmatch(rf'/repos/{re.escape(repo)}/pulls/(\d+)', self.path)
            if m and m.group(1) in s['prs']:
                pr = s['prs'][m.group(1)]
                return self.send(200, {'number': int(m.group(1)), 'user': {'login': pr['author']}, 'head': {'ref': pr['headRefName']}, 'state': 'open'})
            m = re.fullmatch(rf'/repos/{re.escape(repo)}/actions/runs\?(.*)', self.path)
            if m and s.get('fail_runs'):
                return self.send(502, {'message': 'Bad gateway'})
            if m:
                from urllib.parse import parse_qs
                q = {k: v[0] for k, v in parse_qs(m.group(1)).items()}
                runs = [dict(r, id=i + 1) for i, r in enumerate(s['runs'])
                        if all(r.get(f) == q[k] for k, f in (('head_sha', 'head_sha'), ('event', 'event'), ('branch', 'head_branch')) if k in q)]
                return self.send(200, {'total_count': len(runs), 'workflow_runs': runs})
            return self.send(404, {'message': f'Not Found (fake API has no {self.path})'})
    srv = ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'
