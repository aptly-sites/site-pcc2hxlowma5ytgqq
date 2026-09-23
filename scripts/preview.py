#!/usr/bin/env python3
"""Serve the static site locally and forward its read-only schools endpoint."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from subprocess import run


ORIGIN = "https://blue-crown-property-management.sshekou.chatgpt.site"


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/nearby-schools?"):
            response = run(
                ["curl", "--fail-with-body", "--silent", "--show-error", "--max-time", "25", ORIGIN + self.path],
                capture_output=True,
                check=False,
            )
            body = response.stdout or b'{"error":"School information is temporarily unavailable."}'
            self.send_response(200 if response.returncode == 0 else 502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 4173), PreviewHandler).serve_forever()
