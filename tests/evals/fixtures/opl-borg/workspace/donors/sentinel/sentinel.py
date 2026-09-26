"""Synthetic Sentinel donor; CC0-1.0."""

import json
import sys

seen = set()


def accept(rows):
    accepted = []
    for row in rows:
        receipt = row["receipt"].strip()
        item = row["item"].strip().casefold()
        amount = row["amount"]
        if not receipt or not item or type(amount) is not int or amount <= 0:
            raise ValueError("invalid receipt")
        if receipt not in seen:
            seen.add(receipt)
            accepted.append({"receipt": receipt, "item": item, "amount": amount})
    return accepted


if __name__ == "__main__":
    print(json.dumps(accept(json.load(sys.stdin))))
