#!/usr/bin/env python3
"""Read a casper-client get-transaction JSON response and print execution status."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: casper-transaction-status.py <transaction.json>", file=sys.stderr)
        return 2

    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    execution_info = data.get("result", {}).get("execution_info")
    if execution_info is None:
        print("pending")
        return 1

    execution_result: Any = execution_info.get("execution_result", {})
    error_message = None
    if isinstance(execution_result, dict):
        for value in execution_result.values():
            if isinstance(value, dict) and value.get("error_message"):
                error_message = value["error_message"]
                break

    if error_message:
        print(f"failed:{error_message}")
        return 3

    print("success")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
