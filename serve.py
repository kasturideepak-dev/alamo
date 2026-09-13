#!/usr/bin/env python3
"""Threaded static server for the prototype. python3 serve.py [port]"""
import sys, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
H = functools.partial(SimpleHTTPRequestHandler, directory=".")
print("serving http://localhost:%d" % port)
ThreadingHTTPServer(("", port), H).serve_forever()
