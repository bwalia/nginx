#!/usr/bin/env python3
"""
F5 NGINX API Gateway + WAF policy simulator.

Mirrors the Apigee demo threat matrix and API-management controls, emitting
x-f5-* headers so the browser efficacy lab can score same-origin blocks.

Stand-in for F5 NGINX Plus (API Gateway) + NGINX App Protect WAF when a
subscription is not available. Real App Protect path: ../f5-app-protect/.

Env:
  PORT            listen (default 8083)
  ORIGIN_URL      backend (default http://origin:8080)
  LAB_HTML        path to lab.html
  FEATURES_HTML   path to features.html
  API_KEY         required x-api-key outside lab mode (default demo-f5-key)
  SPIKE_PER_MIN   spike arrest (default 120)
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

PORT = int(os.environ.get("PORT", "8083"))
ORIGIN = os.environ.get("ORIGIN_URL", "http://origin:8080").rstrip("/")
API_KEY = os.environ.get("API_KEY", "demo-f5-key")
SPIKE_PER_MIN = int(os.environ.get("SPIKE_PER_MIN", "120"))
PUBLIC_OPEN = os.environ.get(
    "PUBLIC_OPEN", "https://payments-open.fictionally.org"
).rstrip("/")
PUBLIC_SECURE = os.environ.get(
    "PUBLIC_SECURE", "https://payments-secure.fictionally.org"
).rstrip("/")
PUBLIC_APIGW = os.environ.get("PUBLIC_APIGW", PUBLIC_SECURE).rstrip("/")
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
LAB = Path(os.environ.get("LAB_HTML", ROOT / "lab" / "lab.html"))
FEATURES = Path(os.environ.get("FEATURES_HTML", ROOT / "docs" / "features.html"))

_BUCKET: list[float] = []


def spike_ok() -> bool:
    now = time.time()
    while _BUCKET and now - _BUCKET[0] > 60:
        _BUCKET.pop(0)
    if len(_BUCKET) >= SPIKE_PER_MIN:
        return False
    _BUCKET.append(now)
    return True


def classify(method: str, path: str, qs: str, body: str, headers: dict):
    """Return (rule, violation) if blocked, else None. Apigee-parity matrix."""
    raw = (path + (("?" + qs) if qs else "")).lower()
    uri = unquote(raw).lower()
    ua = headers.get("user-agent", "")
    auth = headers.get("authorization", "")
    ctype = headers.get("content-type", "")
    method = method.upper()

    if method in ("PUT", "DELETE", "TRACE", "CONNECT"):
        return "f5-rule-method-001", "VIOL_METHOD"
    if re.search(r"\.env($|\?)|\.git", path, re.I):
        return "f5-rule-filetype-001", "VIOL_FILETYPE"
    if re.search(r"sqlmap|nikto|nmap|masscan|dirbuster|gobuster", ua, re.I):
        return "f5-rule-scanner-ua-001", "VIOL_SCANNER"
    if re.search(r"eyJhbGciOiJub25l", auth, re.I):
        return "f5-rule-jwt-none-001", "VIOL_JWT_ALG"
    if (
        "%00" in raw
        or "%0d%0a" in raw
        or "\x00" in uri
        or "\r\n" in uri
        or "\r" in uri
        or "\n" in uri
    ):
        return "f5-rule-proto-001", "VIOL_PROTOCOL"
    checks = [
        (r"union\s+select", "f5-rule-sqli-001", "VIOL_SQLI"),
        (r"select\s+\w+\s+from", "f5-rule-sqli-002", "VIOL_SQLI"),
        (r"insert\s+into", "f5-rule-sqli-003", "VIOL_SQLI"),
        (r"drop\s+table", "f5-rule-sqli-004", "VIOL_SQLI"),
        (r"\bor\b\s+1\s*=\s*1|'\s*or\s*'|'\s*1'\s*=\s*'1", "f5-rule-sqli-005", "VIOL_SQLI"),
        (r"sleep\s*\(", "f5-rule-sqli-007", "VIOL_SQLI"),
        (r"<script|%3cscript", "f5-rule-xss-001", "VIOL_XSS"),
        (r"javascript\s*:", "f5-rule-xss-002", "VIOL_XSS"),
        (r"onerror\s*=", "f5-rule-xss-003", "VIOL_XSS"),
        (r"<img\s+src=|%3cimg", "f5-rule-xss-004", "VIOL_XSS"),
        (r"eval\s*\(\s*document\.cookie", "f5-rule-xss-005", "VIOL_XSS"),
        (r";\s*id\b|\|\s*cat\s+|`id`|\$\(whoami\)|;\s*whoami", "f5-rule-cmdi-001", "VIOL_CMDI"),
        (r"\.\./|%2e%2e|/etc/passwd", "f5-rule-lfi-001", "VIOL_LFI"),
        (r"\{\{.*\}\}", "f5-rule-ssti-001", "VIOL_SSTI"),
        (r"\$\{jndi:|\$\{\$\{", "f5-rule-log4shell-001", "VIOL_RCE"),
        (r"class\.module\.classloader", "f5-rule-spring4shell-001", "VIOL_RCE"),
        (r"169\.254\.169\.254|metadata\.google\.internal|gopher://", "f5-rule-ssrf-001", "VIOL_SSRF"),
    ]
    for pat, rule, viol in checks:
        if re.search(pat, uri, re.I):
            return rule, viol

    if re.search(r"\$ne|\$gt|\$where", body, re.I):
        return "f5-rule-nosqli-001", "VIOL_NOSQLI"
    if re.search(r"<!ENTITY\s+\w+\s+SYSTEM", body, re.I) or (
        "xml" in ctype.lower() and "SYSTEM" in body
    ):
        return "f5-rule-xxe-001", "VIOL_XXE"
    if re.search(r"__proto__|constructor\.prototype", body, re.I):
        return "f5-rule-protopollute-001", "VIOL_PROTOPOLLUTE"
    if re.search(r"__schema|IntrospectionQuery", body, re.I):
        return "f5-rule-graphql-introspection-001", "VIOL_GRAPHQL"
    if path.startswith("/api/profile") and re.search(r'"role"\s*:\s*"admin"', body, re.I):
        return "f5-rule-massassign-001", "VIOL_MASSASSIGN"
    if path.startswith("/api/login") and re.search(r";\s*id\b", body, re.I):
        return "f5-rule-cmdi-json-001", "VIOL_CMDI"
    if re.search(
        r"(?:\r?\n)\s*(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)\s+\S+\s+HTTP/\d",
        body,
        re.I,
    ):
        return "f5-rule-smuggling-001", "VIOL_SMUGGLING"
    return None


BLOCK_HTML = """<!doctype html><html><head><meta charset=utf-8>
<title>Request blocked — F5 NGINX</title>
<style>body{{margin:0;background:#0b1020;color:#e5e7eb;font:15px/1.5 system-ui}}
.wrap{{max-width:40rem;margin:4rem auto;padding:2rem;border:1px solid #1f2937;border-radius:16px;
background:linear-gradient(180deg,#151a2a,#0f1420)}}h1{{color:#f87171}}
code{{background:#0c1424;padding:.15rem .4rem;border-radius:4px}}
.tag{{background:#009639;color:#fff;font:700 .7rem/1 ui-monospace,monospace;padding:.35rem .55rem;border-radius:999px}}
</style></head>
<body><div class=wrap><span class=tag>F5 NGINX blocked</span>
<h1>Request blocked</h1>
<p>F5 NGINX API Gateway + WAF stopped this request before it reached the Acme Pay origin.</p>
<p>Rule: <code>{rule}</code><br>Violation: <code>{viol}</code><br>Support ID: <code>{sid}</code></p>
<p style=color:#9aa4b8>Compare open origin: <a href="{open}" style=color:#818cf8>{open}</a>
· Apigee: <a href="https://apigee-lab.fictionally.org/lab" style=color:#818cf8>apigee-lab</a></p>
</div></body></html>"""

EXPOSE = "x-f5-block, x-f5-rule, x-f5-violation, x-support-id, x-f5-gateway"


class H(BaseHTTPRequestHandler):
    server_version = "F5NginxAPIGW/1.0"

    def _headers_in(self):
        return {k.lower(): v for k, v in self.headers.items()}

    def _body(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        return self.rfile.read(n).decode("utf-8", "replace") if n else ""

    def _sid(self):
        return f"f5-{int(time.time() * 1000) % 10_000_000:07d}"

    def _block(self, rule, viol, sid=None, status=403):
        sid = sid or self._sid()
        html = BLOCK_HTML.format(
            rule=rule, viol=viol, sid=sid, open=PUBLIC_OPEN + "/lab"
        )
        data = html.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("x-f5-block", "true")
        self.send_header("x-f5-rule", rule)
        self.send_header("x-f5-violation", viol)
        self.send_header("x-support-id", sid)
        self.send_header("x-f5-gateway", "acme-pay-apigw")
        self.send_header("Access-Control-Expose-Headers", EXPOSE)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def _send_bytes(self, status, ctype, data: bytes, extra=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("x-f5-gateway", "acme-pay-apigw")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Expose-Headers", EXPOSE)
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def _serve_lab(self):
        if LAB.exists():
            return self._send_bytes(200, "text/html; charset=utf-8", LAB.read_bytes())
        msg = b"<h1>lab.html missing - run: python3 lab/gen_f5_lab.py</h1>"
        return self._send_bytes(500, "text/html", msg)

    def _serve_features(self):
        if FEATURES.exists():
            return self._send_bytes(200, "text/html; charset=utf-8", FEATURES.read_bytes())
        return self._send_bytes(404, "text/plain", b"features.html not found")

    def _proxy(self, method, path_qs, body: bytes):
        url = ORIGIN + path_qs
        req = urllib.request.Request(url, data=body or None, method=method)
        skip = {"host", "content-length", "transfer-encoding", "connection", "x-api-key"}
        for k, v in self.headers.items():
            if k.lower() not in skip:
                req.add_header(k, v)
        req.add_header("X-Forwarded-By", "f5-nginx-apigw")
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                raw = resp.read()
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() in ("transfer-encoding", "connection", "content-encoding"):
                        continue
                    self.send_header(k, v)
                self.send_header("x-f5-gateway", "acme-pay-apigw")
                self.send_header("Access-Control-Expose-Headers", EXPOSE)
                self.end_headers()
                self.wfile.write(raw)
        except urllib.error.HTTPError as e:
            raw = e.read()
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() in ("transfer-encoding", "connection"):
                    continue
                self.send_header(k, v)
            self.send_header("x-f5-gateway", "acme-pay-apigw")
            self.end_headers()
            self.wfile.write(raw)
        except Exception as e:
            msg = json.dumps({"error": "origin_unreachable", "detail": str(e)}).encode()
            self._send_bytes(502, "application/json", msg)

    def _handle(self, method):
        if method == "OPTIONS":
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers",
                             "origin, content-type, authorization, x-api-key, x-f5-demo-mode")
            self.end_headers()
            return

        if not spike_ok():
            return self._block("f5-rule-spike-001", "VIOL_SPIKE", status=429)

        u = urlparse(self.path)
        path, qs = u.path, u.query
        headers = self._headers_in()
        body_s = self._body() if method in ("POST", "PUT", "PATCH") else ""

        if path in ("/lab", "/lab.html"):
            return self._serve_lab()
        if path in ("/features", "/features.html"):
            return self._serve_features()
        if path in ("/health", "/healthz", "/ping-alive"):
            return self._send_bytes(200, "text/plain", b"ok")

        hit = classify(method, path, qs, body_s, headers)
        if hit:
            return self._block(*hit)

        lab_mode = headers.get("x-f5-demo-mode", "").lower() == "lab"
        public = path in ("/",)
        if not lab_mode and not public and path.startswith(
            ("/api", "/graphql", "/products", "/search", "/ping", "/statement",
             "/download", "/lookup", "/bind", "/fetch", "/render")
        ):
            key = headers.get("x-api-key", "")
            if key != API_KEY:
                data = json.dumps({
                    "error": "missing_or_invalid_api_key",
                    "hint": f"Pass x-api-key: {API_KEY} or x-f5-demo-mode: lab",
                }).encode()
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_header("x-f5-block", "true")
                self.send_header("x-f5-rule", "f5-rule-apikey-001")
                self.send_header("x-f5-violation", "VIOL_APIKEY")
                self.send_header("x-f5-gateway", "acme-pay-apigw")
                self.send_header("Access-Control-Expose-Headers", EXPOSE)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return

        path_qs = path + (("?" + qs) if qs else "")
        return self._proxy(method, path_qs, body_s.encode() if body_s else b"")

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")

    def do_PUT(self):
        self._handle("PUT")

    def do_DELETE(self):
        self._handle("DELETE")

    def do_OPTIONS(self):
        self._handle("OPTIONS")

    def do_HEAD(self):
        # Edge health probes often use HEAD — answer without 501.
        u = urlparse(self.path)
        if u.path in ("/", "/health", "/healthz", "/ping-alive", "/lab", "/features"):
            self.send_response(200)
            self.send_header("Content-Length", "0")
            self.send_header("x-f5-gateway", "acme-pay-apigw")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args), flush=True)


if __name__ == "__main__":
    print(f"F5 NGINX API GW+WAF on :{PORT} → origin {ORIGIN}", flush=True)
    print(f"  lab:      http://127.0.0.1:{PORT}/lab", flush=True)
    print(f"  features: http://127.0.0.1:{PORT}/features", flush=True)
    print(f"  api key:  {API_KEY}  (or header x-f5-demo-mode: lab)", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
