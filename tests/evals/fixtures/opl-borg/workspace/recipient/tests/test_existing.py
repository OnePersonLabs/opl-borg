import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ExistingPublicCommands(unittest.TestCase):
    def call(self, command, rows, *args):
        result = subprocess.run(
            [sys.executable, str(ROOT / "manage.py"), command, *args],
            input=json.dumps(rows), text=True, capture_output=True, check=True,
        )
        return json.loads(result.stdout)

    def test_ingest_preserves_saved_units(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "state.json"
            state.write_text(json.dumps({"events": [{"event_id": "old", "sku": "bolt", "units": 4}]}))
            result = self.call("ingest", [{"event_id": "new", "sku": "nut", "units": 3}], "--state", str(state))
            self.assertEqual(result, {"accepted": 1, "total_units": 7})
            self.assertEqual(len(json.loads(state.read_text())["events"]), 2)

    def test_report_keeps_public_shape(self):
        self.assertEqual(self.call("report", [{"sku": "bolt", "units": 2}]),
                         {"totals": [{"sku": "bolt", "units": 2}], "skipped": 0})


if __name__ == "__main__":
    unittest.main()
