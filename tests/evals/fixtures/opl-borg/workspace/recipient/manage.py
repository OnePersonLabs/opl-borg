import argparse
import json
import sys

from analytics.service import report
from inventory.service import ingest


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("ingest").add_argument("--state", required=True)
    commands.add_parser("report")
    args = parser.parse_args()
    rows = json.load(sys.stdin)
    if not isinstance(rows, list):
        raise ValueError("input must be a JSON array")
    result = ingest(rows, args.state) if args.command == "ingest" else report(rows)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
