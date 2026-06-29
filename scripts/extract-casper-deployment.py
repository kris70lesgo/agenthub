#!/usr/bin/env python3
"""Extract AgentHub Casper deployment values from casper-client JSON/text.

The Casper CLI output shape differs a little between client/network versions.
This helper intentionally walks arbitrary JSON and also falls back to regex
matching so deployment scripts can keep a stable repository interface.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


HASH_PATTERNS = {
    "transaction_hashes": re.compile(
        r"\b(?:transaction[_ -]?hash|deploy[_ -]?hash)?\s*[:=]?\s*([0-9a-fA-F]{64})\b"
    ),
    "contract_hashes": re.compile(r"\bcontract-[0-9a-fA-F]{64}\b"),
    "contract_package_hashes": re.compile(
        r"\b(?:contract-package|package)-[0-9a-fA-F]{64}\b"
    ),
    "entity_hashes": re.compile(r"\bentity-contract-[0-9a-fA-F]{64}\b"),
}


def read_text(path: Path | None) -> str:
    if path is None or str(path) == "-":
        return sys.stdin.read()
    return path.read_text(encoding="utf-8")


def try_parse_json(text: str) -> Any | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def walk_json(value: Any) -> list[Any]:
    values: list[Any] = []
    if isinstance(value, dict):
        for nested in value.values():
            values.extend(walk_json(nested))
    elif isinstance(value, list):
        for nested in value:
            values.extend(walk_json(nested))
    else:
        values.append(value)
    return values


def unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for item in items:
        normalized = item.strip().strip('"').strip("'")
        if normalized and normalized not in seen:
            seen.add(normalized)
            output.append(normalized)
    return output


def extract_hashes(text: str) -> dict[str, list[str]]:
    blob_parts = [text]
    parsed = try_parse_json(text)
    if parsed is not None:
        blob_parts.extend(str(item) for item in walk_json(parsed))

    blob = "\n".join(blob_parts)
    return {
        name: unique(pattern.findall(blob))
        for name, pattern in HASH_PATTERNS.items()
    }


def find_named_key(text: str, key_name: str) -> str | None:
    parsed = try_parse_json(text)
    if parsed is None:
        return None

    def visit(value: Any) -> str | None:
        if isinstance(value, dict):
            name = value.get("name")
            key = value.get("key")
            if name == key_name and isinstance(key, str):
                return key
            for nested in value.values():
                found = visit(nested)
                if found:
                    return found
        elif isinstance(value, list):
            for nested in value:
                found = visit(nested)
                if found:
                    return found
        return None

    return visit(parsed)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", nargs="?", type=Path)
    parser.add_argument("--named-key")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--field")
    args = parser.parse_args()

    text = read_text(args.input)
    hashes = extract_hashes(text)
    named_key_value = find_named_key(text, args.named_key) if args.named_key else None

    result: dict[str, Any] = {
        **hashes,
        "named_key": named_key_value,
        "primary_hash": (
            (hashes["contract_hashes"] or hashes["entity_hashes"] or hashes["contract_package_hashes"] or [None])[0]
        ),
    }

    if args.field:
        value = result.get(args.field)
        if isinstance(value, list):
            print(value[0] if value else "")
        elif value is not None:
            print(value)
        return 0

    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(result["primary_hash"] or "")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
