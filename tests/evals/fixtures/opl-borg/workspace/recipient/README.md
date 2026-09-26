# Warehouse recipient

Python 3 standard library only. `inventory` owns saved intake state; `analytics`
is a separately deployed stateless reporting tool. `manage.py` is the existing
local caller for both services. Preserve its JSON interfaces.

Examples:

```bash
printf '%s\n' '[{"event_id":"r1","sku":"bolt","units":2}]' | python3 manage.py ingest --state /tmp/warehouse-example.json
printf '%s\n' '[{"sku":"bolt","units":2}]' | python3 manage.py report
python3 -m unittest discover -s tests -v
```

State is a JSON object with an `events` array; each event has `event_id`, `sku`,
and `units`. Existing state must remain readable. Current callers use a single
writer per state file, so concurrent ingestion is outside this task.
