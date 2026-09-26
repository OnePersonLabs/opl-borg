import json
from pathlib import Path


def ingest(events, state_path):
    path = Path(state_path)
    state = json.loads(path.read_text()) if path.exists() else {"events": []}
    state["events"].extend(events)
    path.write_text(json.dumps(state))
    return {"accepted": len(events), "total_units": sum(event["units"] for event in state["events"])}
