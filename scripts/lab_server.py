# Static server for lab/ that tells the browser never to cache, so edited scenes always reload fresh.
#   python3 scripts/lab_server.py [port]   (serves ./lab)
import sys, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5180
ThreadingHTTPServer(('127.0.0.1', port), functools.partial(NoCache, directory='lab')).serve_forever()
