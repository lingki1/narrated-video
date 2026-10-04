"""Show one reel's HTML preview to a phone on the same Wi-Fi / LAN.

usage: python lan_preview.py <reel-name> --host <this PC's LAN address> [--port 8090]
       e.g. python lan_preview.py 10-boss-makes-video --host 192.168.1.78

Read-only and allow-listed: only the film's scene files (videos/<reel-name>/, without its vo/ docs/ archive/), lib/ and its soundtrack are served. Everything else in the project
(.secrets, voice references, posts, research, other reels) answers 404, and there are no directory listings.
It binds to the one address given, so nothing is reachable from the VPN adapter or from outside the LAN.
Byte ranges are answered (phones need them to seek inside the soundtrack). Close the window (or Ctrl+C) to stop."""
import argparse
import http.server
import os
import re
import sys

ROOT = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('reel')
    ap.add_argument('--host', required=True)
    ap.add_argument('--port', type=int, default=8090)
    a = ap.parse_args()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from paths import reel_dir, reel_rel
    REL = reel_rel(a.reel); REEL = os.path.realpath(reel_dir(a.reel))
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', a.reel) or not os.path.isdir(REEL):
        sys.exit(f'no such reel: {a.reel}')
    allowed_dirs = [REEL + os.sep, os.path.join(ROOT, 'lib') + os.sep]
    blocked_dirs = [os.path.join(REEL, d) + os.sep for d in ('vo', 'docs', 'archive', 'out')]   # the film folder also holds these; only the soundtrack is let through
    allowed_files = {os.path.join(REEL, 'out', a.reel + '.wav')}

    class Handler(http.server.SimpleHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'

        def __init__(self, *args, **kw):
            super().__init__(*args, directory=ROOT, **kw)

        def allowed(self):
            p = os.path.realpath(self.translate_path(self.path))
            if any(part.startswith(('.', '_')) for part in os.path.relpath(p, ROOT).split(os.sep)):
                return None
            if p not in allowed_files and any(p.startswith(d) for d in blocked_dirs):
                return None
            if os.path.isfile(p) and (p in allowed_files or any(p.startswith(d) for d in allowed_dirs)):
                return p
            return None

        def do_GET(self):
            self.serve(body=True)

        def do_HEAD(self):
            self.serve(body=False)

        def serve(self, body):
            p = self.allowed()
            if not p:
                self.send_response(404); self.send_header('Content-Length', '0'); self.end_headers()
                return
            size = os.path.getsize(p)
            start, end, status = 0, size - 1, 200
            m = re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers.get('Range', '').strip())
            if m and (m.group(1) or m.group(2)):
                if m.group(1):
                    start = int(m.group(1)); end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
                else:
                    start = max(0, size - int(m.group(2)))
                if start > end or start >= size:
                    self.send_response(416); self.send_header('Content-Range', f'bytes */{size}'); self.send_header('Content-Length', '0'); self.end_headers()
                    return
                status = 206
            self.send_response(status)
            self.send_header('Content-Type', self.guess_type(p))
            self.send_header('Content-Length', str(end - start + 1))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Cache-Control', 'no-store')
            if status == 206:
                self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.end_headers()
            if not body:
                return
            with open(p, 'rb') as f:
                f.seek(start)
                left = end - start + 1
                try:
                    while left > 0:
                        chunk = f.read(min(256 * 1024, left))
                        if not chunk:
                            break
                        self.wfile.write(chunk); left -= len(chunk)
                except (ConnectionError, OSError):
                    pass  # the phone dropped the request (a seek does that)

        def list_directory(self, path):
            self.send_error(404)
            return None

    Handler.extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.wav': 'audio/wav'}
    srv = http.server.ThreadingHTTPServer((a.host, a.port), Handler)
    print(f'phone preview:  http://{a.host}:{a.port}/{REL}/index.html?play')
    print('only this reel, lib/ and its soundtrack are served; close this window to stop.')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
