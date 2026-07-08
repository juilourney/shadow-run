#!/usr/bin/env python3
"""개발용 정적 서버 — 브라우저가 옛 ES 모듈을 캐시하지 않도록 no-store 헤더 전송.
/api/* 요청은 배포된 Cloudflare Functions로 프록시해 로컬에서도 서버 기능(이름 등록,
관리자 로그인, 배정 등)을 실제와 동일하게 테스트할 수 있게 한다."""
import sys
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PROD_ORIGIN = 'https://shadow-run.pages.dev'


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def _proxy_api(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(PROD_ORIGIN + self.path, data=body, method=self.command)
        req.add_header('User-Agent', 'shadow-run-dev-proxy')  # 없으면 Cloudflare가 1010으로 차단
        for h in ('Content-Type', 'Authorization'):
            if self.headers.get(h):
                req.add_header(h, self.headers[h])
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                data = res.read()
                self.send_response(res.status)
                self.send_header('Content-Type', res.headers.get('Content-Type', 'application/json'))
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header('Content-Type', e.headers.get('Content-Type', 'application/json'))
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy_api()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy_api()
        else:
            self.send_error(405)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8788
    ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
