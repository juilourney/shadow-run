#!/usr/bin/env python3
"""개발용 정적 서버 — 브라우저가 옛 ES 모듈을 캐시하지 않도록 no-store 헤더 전송."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8788
    ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
