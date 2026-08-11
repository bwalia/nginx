#!/usr/bin/env python3
"""CLI: compile a rule pack + overrides into signature-sets JSON."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from f5_waf_tools.rules import RulePack, apply_rule_overrides, merge_signature_sets  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", type=Path, required=True)
    parser.add_argument("--overrides", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--base-sets", type=Path, default=None)
    args = parser.parse_args()

    pack = RulePack.from_dict(json.loads(args.pack.read_text(encoding="utf-8")))
    overrides = json.loads(args.overrides.read_text(encoding="utf-8"))
    if not isinstance(overrides, list):
        print("overrides must be a JSON list", file=sys.stderr)
        return 1

    try:
        updated = apply_rule_overrides(pack, overrides)
    except KeyError as exc:
        print(f"INVALID override: {exc}", file=sys.stderr)
        return 1

    base_sets = []
    if args.base_sets and args.base_sets.exists():
        base_sets = json.loads(args.base_sets.read_text(encoding="utf-8"))

    compiled = {
        "pack": {"name": pack.name, "version": pack.version},
        "signature-sets": merge_signature_sets(base_sets, updated),
        "rules": [rule.to_dict() for rule in updated.rules],
    }
    args.output.write_text(json.dumps(compiled, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output} sets={len(compiled['signature-sets'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
