#!/usr/bin/env python3
"""Update AgentHub Casper contract hash variables in local env files."""

from __future__ import annotations

import argparse
from pathlib import Path


VARIABLES = (
    "AGENT_REGISTRY_CONTRACT_HASH",
    "NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_HASH",
)


def upsert_env(path: Path, values: dict[str, str]) -> None:
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    updated: set[str] = set()
    next_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            next_lines.append(line)
            continue
        key = line.split("=", 1)[0]
        if key in values:
            next_lines.append(f"{key}={values[key]}")
            updated.add(key)
        else:
            next_lines.append(line)

    for key, value in values.items():
        if key not in updated:
            next_lines.append(f"{key}={value}")

    path.write_text("\n".join(next_lines).rstrip() + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hash", required=True)
    parser.add_argument("--files", nargs="+", default=[".env", ".env.local"])
    args = parser.parse_args()

    values = {variable: args.hash for variable in VARIABLES}
    for file_name in args.files:
        upsert_env(Path(file_name), values)
        print(f"updated {file_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
