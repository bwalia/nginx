#!/usr/bin/env python3
"""CLI: validate an App Protect policy JSON file."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from f5_waf_tools.policy import PolicyValidationError, load_policy  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("policy_path", type=Path)
    args = parser.parse_args()
    try:
        doc = load_policy(args.policy_path)
    except (OSError, PolicyValidationError, ValueError) as exc:
        print(f"INVALID: {exc}", file=sys.stderr)
        return 1
    print(
        f"OK name={doc.name} mode={doc.enforcement_mode} "
        f"sets={len(doc.signature_sets)} bot={doc.bot_defense_enabled}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
