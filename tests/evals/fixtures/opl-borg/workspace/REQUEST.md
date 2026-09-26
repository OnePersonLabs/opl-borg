# Native warehouse capabilities

Use `$assimilate` to improve this existing recipient using whatever is valuable
in `donors/sentinel/` and `donors/mosaic/`. We own the recipient's shape. The
inventory service and analytics tool ship independently; we reject a mandatory
central controller and do not want donor packages as runtime dependencies.
Preserve both public commands in `recipient/manage.py` and existing saved data.
You may edit recipient code, tests, and documentation and create campaign files.
Donors are read-only reference material; do not delete or modify them.

The desired outcomes are:

- Inventory ingests events identified by `event_id`, `sku`, and `units`. Event
  IDs are trimmed, case-sensitive nonempty strings. SKUs are trimmed, casefolded
  nonempty strings. Units must be positive integers, excluding booleans. Reject
  an entire invalid batch without changing saved state. An identical replay of
  an event ID must add nothing, even in a new process. Reusing an ID with different
  normalized SKU or units is an error, and also leaves the batch unapplied.
  Preserve the existing JSON state shape and count previously saved events.
- Analytics groups units by the same normalized SKU, returning totals sorted by
  SKU. It skips invalid rows, counts them in `skipped`, and still reports valid
  rows. Its rows need only `sku` and `units`; inventory event IDs are irrelevant.
- Existing `ingest` output remains `{ "accepted": N, "total_units": N }`.
  Existing `report` output remains `{ "totals": [{"sku": "...", "units": N}],
  "skipped": N }`. Commands consume a JSON array on stdin. A rejected ingestion
  exits nonzero. Malformed JSON or a non-array input can remain a command error.

Read source rather than accepting the donors' product claims. Explain what is
causally useful, what assumptions conflict, and where the mechanisms belong.
Write focused recipient tests through real callers and run them.

For this trial, use campaign mode even though the sources are small. The task
stands in for an assimilation spanning multiple context windows. In this first
session, investigate enough to choose both native owners, implement and verify
only the inventory slice, then stop at a durable checkpoint with analytics still
unfinished. Record enough source evidence, decisions, validation, ownership,
and remaining work for a fresh agent to continue without this conversation.
Write the relative path to your single campaign landing file into
`CAMPAIGN_ENTRY.txt`. Do not put a conversation transcript there.

After this checkpoint, the next fresh session is authorized to finish analytics
and verify the complete assimilation. Do not install dependencies or publish.
