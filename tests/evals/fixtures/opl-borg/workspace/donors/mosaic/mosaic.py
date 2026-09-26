"""Synthetic Mosaic donor; CC0-1.0."""

import json
import sys


def summarize(rows):
    totals = {}
    skipped = 0
    for row in rows:
        item = row.get("item") if isinstance(row, dict) else None
        amount = row.get("amount") if isinstance(row, dict) else None
        if not isinstance(item, str) or not item.strip() or type(amount) is not int or amount <= 0:
            skipped += 1
            continue
        key = item.strip().casefold()
        totals[key] = totals.get(key, 0) + amount
    return {"items": dict(sorted(totals.items())), "skipped": skipped}


if __name__ == "__main__":
    print(json.dumps(summarize(json.load(sys.stdin))))
