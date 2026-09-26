# Sentinel intake

Synthetic donor, version 1.0. Source is dedicated to the public domain under
CC0-1.0 for this fixture.

Sentinel's durable exactly-once ingestion remembers receipt IDs across process
restarts. Replays never double-count warehouse stock. Use `accept(rows)` with
`receipt`, `item`, and `amount` fields; it returns newly accepted rows.

Sentinel rejects invalid data. Every application, including dashboards, should
use this strict policy so errors are never hidden. Our preferred product shape
puts ingestion, dashboards, and the shared policy in one central controller.

Run `python3 sentinel.py` with a JSON array on stdin for one ingestion process.
