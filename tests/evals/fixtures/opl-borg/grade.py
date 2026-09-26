#!/usr/bin/env python3
"""Held-out, dependency-free public behavior checks; never copy to the agent."""

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("workspace", type=Path)
parser.add_argument("--phase", choices=("baseline", "intake", "final"), default="final")
options = parser.parse_args()
workspace = options.workspace.resolve()


class RecipientBehavior(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="borg-grade-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.recipient = self.root / "recipient"
        shutil.copytree(workspace / "recipient", self.recipient)
        self.state = self.root / "state.json"

    def invoke(self, command, rows):
        args = [sys.executable, str(self.recipient / "manage.py"), command]
        if command == "ingest":
            args.extend(["--state", str(self.state)])
        return subprocess.run(args, input=json.dumps(rows), text=True, capture_output=True, cwd=self.root)

    def accepted(self, rows):
        result = self.invoke("ingest", rows)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_existing_commands(self):
        result = subprocess.run(
            [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
            cwd=self.recipient, text=True, capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_replay_survives_new_process_and_normalization(self):
        first = [{"event_id": " r1 ", "sku": " BOLT ", "units": 2}]
        self.assertEqual(self.accepted(first), {"accepted": 1, "total_units": 2})
        replay = [{"event_id": "r1", "sku": "bolt", "units": 2}]
        self.assertEqual(self.accepted(replay), {"accepted": 0, "total_units": 2})
        self.assertEqual(json.loads(self.state.read_text())["events"], replay)

    def test_bad_batch_does_not_mutate_saved_state(self):
        self.accepted([{"event_id": "old", "sku": "bolt", "units": 4}])
        before = self.state.read_bytes()
        for invalid in ({"sku": "bolt", "units": -1}, {"sku": "bolt", "units": True},
                        {"sku": " ", "units": 2}, {"sku": "bolt"},
                        {"event_id": " ", "sku": "bolt", "units": 2},
                        {"event_id": 5, "sku": "bolt", "units": 2}):
            with self.subTest(invalid=invalid):
                self.state.write_bytes(before)
                rows = [{"event_id": "new", "sku": "nut", "units": 3}, {"event_id": "bad", **invalid}]
                self.assertNotEqual(self.invoke("ingest", rows).returncode, 0)
                self.assertEqual(self.state.read_bytes(), before)

    def test_conflicting_replay_rejects_whole_batch(self):
        self.accepted([{"event_id": "r1", "sku": "bolt", "units": 2}])
        before = self.state.read_bytes()
        rows = [{"event_id": "r2", "sku": "nut", "units": 3},
                {"event_id": "r1", "sku": "bolt", "units": 9}]
        self.assertNotEqual(self.invoke("ingest", rows).returncode, 0)
        self.assertEqual(self.state.read_bytes(), before)

    def test_legacy_state_and_in_batch_duplicate(self):
        self.state.write_text(json.dumps({"events": [{"event_id": "old", "sku": "bolt", "units": 4}]}))
        new = {"event_id": "new", "sku": "nut", "units": 3}
        rows = [{"event_id": "old", "sku": "bolt", "units": 4}, new, new]
        self.assertEqual(self.accepted(rows), {"accepted": 1, "total_units": 7})
        self.assertEqual(len(json.loads(self.state.read_text())["events"]), 2)

    def test_reporting_groups_and_skips_without_intake_policy(self):
        rows = [{"sku": " BOLT ", "units": 2}, {"sku": "bolt", "units": 3},
                {"sku": "nut", "units": 1}, {"sku": "bolt", "units": -1},
                {"sku": "bolt"}, {"sku": " ", "units": 7}, {"sku": "nut", "units": True}]
        result = self.invoke("report", rows)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout),
                         {"totals": [{"sku": "bolt", "units": 5}, {"sku": "nut", "units": 1}], "skipped": 4})


class DonorBaseline(unittest.TestCase):
    def test_sentinel_replay_protection_is_process_local(self):
        path = workspace / "donors" / "sentinel" / "sentinel.py"
        row = {"receipt": "r1", "item": "bolt", "amount": 2}
        for _ in range(2):
            result = subprocess.run([sys.executable, str(path)], input=json.dumps([row, row]),
                                    text=True, capture_output=True, check=True)
            self.assertEqual(json.loads(result.stdout), [row])

    def test_donors_have_conflicting_bad_row_policy(self):
        rows = [{"receipt": "r1", "item": "bolt", "amount": 2},
                {"receipt": "r2", "item": "bolt", "amount": -1}]
        sentinel = subprocess.run([sys.executable, str(workspace / "donors/sentinel/sentinel.py")],
                                  input=json.dumps(rows), text=True, capture_output=True)
        self.assertNotEqual(sentinel.returncode, 0)
        mosaic = subprocess.run([sys.executable, str(workspace / "donors/mosaic/mosaic.py")],
                                input=json.dumps(rows), text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(mosaic.stdout), {"items": {"bolt": 2}, "skipped": 1})


loader = unittest.TestLoader()
suite = unittest.TestSuite()
if options.phase == "baseline":
    suite.addTests(loader.loadTestsFromTestCase(DonorBaseline))
    suite.addTest(RecipientBehavior("test_existing_commands"))
else:
    for name in loader.getTestCaseNames(RecipientBehavior):
        if options.phase == "final" or name != "test_reporting_groups_and_skips_without_intake_policy":
            suite.addTest(RecipientBehavior(name))
result = unittest.TextTestRunner(verbosity=2).run(suite)
sys.exit(0 if result.wasSuccessful() else 1)
