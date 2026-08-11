#!/usr/bin/env python3
"""CLI: merge compiled signature-sets into an existing policy JSON on disk."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from f5_waf_tools.policy import validate_policy  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--policy", type=Path, required=True)
    parser.add_argument("--compiled", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    policy_data = json.loads(args.policy.read_text(encoding="utf-8"))
    compiled = json.loads(args.compiled.read_text(encoding="utf-8"))
    sets = compiled.get("signature-sets") or []

    root = policy_data.setdefault("policy", policy_data)
    root["signature-sets"] = sets

    doc = validate_policy(policy_data if "policy" in policy_data else {"policy": root})
    args.output.write_text(json.dumps(doc.raw, indent=2) + "\n", encoding="utf-8")
    print(f"Merged into {args.output} name={doc.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
